"""Exam snapshots and summaries derived from saved, account-owned results."""
import json
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from . import db

router = APIRouter(prefix="/api")


def timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


class ExamItemInput(BaseModel):
    kind: Literal["descriptive", "mcq"]
    questionId: str


class ExamInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=2000)
    published: bool = False
    items: list[ExamItemInput] = Field(min_length=1, max_length=30)


class ExamChoicesInput(BaseModel):
    answers: dict[str, str]


def public_question(kind, question):
    fields = ["id", "code", "subject"]
    fields += ["title", "prompt", "maxMarks"] if kind == "descriptive" else ["question", "options", "mark"]
    return {field: question[field] for field in fields}


def exam_out(row, private=False):
    items = json.loads(row["items"])
    return {"id": row["id"], "title": row["title"], "description": row["description"],
            "published": bool(row["published"]), "version": row["version"],
            "maxMarks": round(sum(item["question"].get("maxMarks", 1) for item in items), 2),
            "items": items if private else [{"kind": item["kind"], "question": public_question(item["kind"], item["question"])} for item in items]}


def build_items(conn, payload):
    from .main import question_out, mcq_out
    if len({(item.kind, item.questionId) for item in payload.items}) != len(payload.items):
        raise HTTPException(422, "Each question can appear once in an exam set.")
    items = []
    for item in payload.items:
        table = "questions" if item.kind == "descriptive" else "mcqs"
        row = conn.execute(f"SELECT * FROM {table} WHERE id=?", (item.questionId,)).fetchone()
        if not row:
            raise HTTPException(422, "An exam question no longer exists.")
        question = question_out(conn, row) if item.kind == "descriptive" else mcq_out(row)
        if payload.published and item.kind == "descriptive" and not question["rubricApproved"]:
            raise HTTPException(409, "Approve every descriptive rubric before publishing this exam.")
        items.append({"kind": item.kind, "question": question})
    return items


@router.get("/exams")
def admin_exams():
    with db.connection() as conn:
        return [exam_out(row, private=True) for row in conn.execute("SELECT * FROM exams ORDER BY rowid DESC")]


@router.post("/exams", status_code=201)
def create_exam(payload: ExamInput):
    with db.connection() as conn:
        items = build_items(conn, payload)
        eid, now = str(uuid4()), timestamp()
        conn.execute("INSERT INTO exams VALUES (?,?,?,?,?,?,?,?)", (eid, payload.title, payload.description,
                     int(payload.published), 1, json.dumps(items), now, now))
        return exam_out(conn.execute("SELECT * FROM exams WHERE id=?", (eid,)).fetchone(), private=True)


@router.put("/exams/{eid}")
def update_exam(eid: str, payload: ExamInput):
    with db.connection() as conn:
        if not conn.execute("SELECT 1 FROM exams WHERE id=?", (eid,)).fetchone():
            raise HTTPException(404, "Exam not found.")
        items = build_items(conn, payload)
        conn.execute("UPDATE exams SET title=?, description=?, published=?, version=version+1, items=?, updated_at=? WHERE id=?",
                     (payload.title, payload.description, int(payload.published), json.dumps(items), timestamp(), eid))
        return exam_out(conn.execute("SELECT * FROM exams WHERE id=?", (eid,)).fetchone(), private=True)


@router.delete("/exams/{eid}")
def delete_exam(eid: str):
    with db.connection() as conn:
        if conn.execute("SELECT 1 FROM exam_attempts WHERE exam_id=?", (eid,)).fetchone():
            raise HTTPException(409, "This exam has attempts. Unpublish it to preserve the results.")
        if not conn.execute("DELETE FROM exams WHERE id=?", (eid,)).rowcount:
            raise HTTPException(404, "Exam not found.")
    return {"deleted": True}


@router.get("/student/exams")
def available_exams():
    with db.connection() as conn:
        return [exam_out(row) for row in conn.execute("SELECT * FROM exams WHERE published=1 ORDER BY rowid DESC")]


def owned_attempt(conn, aid, user):
    row = conn.execute("SELECT * FROM exam_attempts WHERE id=? AND owner_user_id=?", (aid, user["id"])).fetchone()
    if not row:
        raise HTTPException(404, "Exam attempt not found.")
    return row


def descriptive_question(snapshot, qid):
    item = next((item for item in snapshot["items"] if item["kind"] == "descriptive" and item["question"]["id"] == qid), None)
    if not item:
        raise HTTPException(422, "This question is not part of the exam attempt.")
    return item["question"]


def question_in_exams(conn, kind, qid):
    groups = [json.loads(row["items"]) for row in conn.execute("SELECT items FROM exams")]
    groups += [json.loads(row["snapshot"])["items"] for row in conn.execute("SELECT snapshot FROM exam_attempts")]
    return any(any(item["kind"] == kind and item["question"]["id"] == qid for item in items) for items in groups)


def check_answer_context(conn, aid, qid, user):
    if aid:
        return descriptive_question(json.loads(owned_attempt(conn, aid, user)["snapshot"]), qid)
    row = conn.execute("SELECT rubric_approved FROM questions WHERE id=?", (qid,)).fetchone()
    if not row or not row["rubric_approved"]:
        raise HTTPException(409, "This question is not available for automatic grading.")


def attempt_out(conn, row):
    from .main import submission_out
    snapshot = json.loads(row["snapshot"])
    mcq = json.loads(row["mcq_result"]) if row["mcq_result"] else None
    user = conn.execute("SELECT display_name, username FROM users WHERE id=?", (row["owner_user_id"],)).fetchone()
    items, earned, maximum, completed = [], 0.0, 0.0, 0
    for item in snapshot["items"]:
        kind, q = item["kind"], item["question"]
        mark = q.get("maxMarks", 1)
        maximum += mark
        result = {"kind": kind, "question": public_question(kind, q), "maxMarks": mark, "status": "missing", "score": None}
        if kind == "descriptive":
            submission = conn.execute("SELECT * FROM submissions WHERE exam_attempt_id=? AND question_id=? ORDER BY rowid DESC LIMIT 1", (row["id"], q["id"])).fetchone()
            if submission:
                saved = submission_out(conn, submission)
                result.update({"submissionId": saved["id"], "status": saved["status"]})
                if saved["status"] == "graded":
                    result["score"] = saved["evaluatedTotalScore"]
        elif mcq:
            saved = next(r for r in mcq["results"] if r["questionId"] == q["id"])
            result.update({"status": "graded", "score": saved["awarded"], "studentAnswer": saved["studentAnswer"], "correctKey": saved["correctKey"]})
        if result["status"] == "graded":
            completed += 1
            earned += result["score"]
        items.append(result)
    done = completed == len(items)
    return {"id": row["id"], "examId": row["exam_id"], "title": snapshot["title"], "description": snapshot["description"],
            "version": snapshot["version"], "studentName": user["display_name"], "studentId": user["username"],
            "startedAt": row["started_at"], "status": "completed" if done else "in_progress", "completedQuestions": completed,
            "totalQuestions": len(items), "earnedMarks": round(earned, 2), "maxMarks": round(maximum, 2),
            "score": round(earned, 2) if done else None, "items": items}


@router.post("/student/exams/{eid}/attempts", status_code=201)
def start_exam(eid: str, request: Request):
    with db.connection() as conn:
        exam = conn.execute("SELECT * FROM exams WHERE id=? AND published=1", (eid,)).fetchone()
        if not exam:
            raise HTTPException(404, "Published exam not found.")
        aid = str(uuid4())
        conn.execute("INSERT INTO exam_attempts VALUES (?,?,?,?,?,?)", (aid, eid, request.state.user["id"], json.dumps(exam_out(exam, private=True)), None, timestamp()))
        return attempt_out(conn, conn.execute("SELECT * FROM exam_attempts WHERE id=?", (aid,)).fetchone())


@router.get("/student/exam-attempts")
def my_exams(request: Request):
    with db.connection() as conn:
        return [attempt_out(conn, row) for row in conn.execute("SELECT * FROM exam_attempts WHERE owner_user_id=? ORDER BY rowid DESC", (request.state.user["id"],))]


@router.get("/student/exam-attempts/{aid}")
def my_exam(aid: str, request: Request):
    with db.connection() as conn:
        return attempt_out(conn, owned_attempt(conn, aid, request.state.user))


@router.get("/exam-attempts")
def all_exams():
    with db.connection() as conn:
        return [attempt_out(conn, row) for row in conn.execute("SELECT * FROM exam_attempts ORDER BY rowid DESC")]


@router.post("/student/exam-attempts/{aid}/mcqs")
def score_exam_mcqs(aid: str, payload: ExamChoicesInput, request: Request):
    with db.connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        row = owned_attempt(conn, aid, request.state.user)
        if row["mcq_result"]:
            raise HTTPException(409, "These MCQs are already graded. Start a new exam attempt to try again.")
        questions = [item["question"] for item in json.loads(row["snapshot"])["items"] if item["kind"] == "mcq"]
        if not questions or set(payload.answers) - {q["id"] for q in questions}:
            raise HTTPException(422, "Choose answers only for this exam's MCQs.")
        results = []
        for q in questions:
            choice = payload.answers.get(q["id"], "")
            if choice and choice not in {option["key"] for option in q["options"]}:
                raise HTTPException(422, "Select an available option or leave the answer blank.")
            results.append({"questionId": q["id"], "code": q["code"], "subject": q["subject"], "question": q["question"],
                            "studentAnswer": choice, "correctKey": q["correctKey"], "awarded": int(choice == q["correctKey"])})
        conn.execute("UPDATE exam_attempts SET mcq_result=? WHERE id=?", (json.dumps({"answers": payload.answers, "results": results, "gradedAt": timestamp()}), aid))
        return attempt_out(conn, conn.execute("SELECT * FROM exam_attempts WHERE id=?", (aid,)).fetchone())


@router.get("/student/performance")
def performance(request: Request):
    from .main import submission_out
    with db.connection() as conn:
        rows = conn.execute("SELECT * FROM submissions WHERE owner_user_id=? ORDER BY rowid DESC", (request.state.user["id"],)).fetchall()
        submissions = [submission_out(conn, row) for row in rows]
        mcqs = conn.execute("SELECT * FROM mcq_attempts WHERE owner_user_id=? ORDER BY rowid DESC", (request.state.user["id"],)).fetchall()
        exam_rows = conn.execute("SELECT * FROM exam_attempts WHERE owner_user_id=? ORDER BY rowid DESC", (request.state.user["id"],)).fetchall()
        exams = [attempt_out(conn, row) for row in exam_rows]
    graded = [s for s in submissions if s["status"] == "graded"]
    latest, events = {}, []
    for s in graded:
        q = s["rubricSnapshot"]
        latest.setdefault(("descriptive", s["questionId"]), {"subject": q["subject"], "score": s["evaluatedTotalScore"], "max": q["maxMarks"], "submission": s})
        events.append({"id": s["id"], "label": q["title"], "at": s["gradedAt"], "score": s["evaluatedTotalScore"], "maxMarks": q["maxMarks"]})
    groups = [(r["submitted_at"], json.loads(r["results"])) for r in mcqs]
    for row in exam_rows:
        if row["mcq_result"]:
            saved = json.loads(row["mcq_result"])
            groups.append((saved.get("gradedAt", row["started_at"]), saved["results"]))
    for at, results in sorted(groups, key=lambda value: value[0], reverse=True):
        for result in results:
            latest.setdefault(("mcq", result["questionId"]), {"subject": result.get("subject", "MCQ"), "score": result["awarded"], "max": 1})
    subjects, criteria = {}, []
    for item in latest.values():
        group = subjects.setdefault(item["subject"] or "General", {"score": 0.0, "maxMarks": 0.0, "questions": 0})
        group["score"] += item["score"]; group["maxMarks"] += item["max"]; group["questions"] += 1
        if item.get("submission"):
            submission = item["submission"]
            for criterion in submission["rubricSnapshot"]["criteria"]:
                score = next((s["mark"] for s in submission["criteriaScores"] if s["criterionId"] == criterion["id"]), 0)
                if score < criterion["maxMark"]:
                    criteria.append({"title": criterion["title"], "question": submission["rubricSnapshot"]["title"], "score": score, "maxMarks": criterion["maxMark"]})
    score, maximum = sum(item["score"] for item in latest.values()), sum(item["max"] for item in latest.values())
    return {"gradedAnswers": len(graded), "pendingAnswers": len(submissions) - len(graded), "mcqAttempts": len(groups),
            "completedExams": sum(exam["status"] == "completed" for exam in exams),
            "latestAveragePercent": round(100 * score / maximum, 1) if maximum else None,
            "subjects": [{"subject": subject, **values, "score": round(values["score"], 2), "maxMarks": round(values["maxMarks"], 2),
                          "percent": round(100 * values["score"] / values["maxMarks"], 1)} for subject, values in sorted(subjects.items())],
            "practiceAreas": sorted(criteria, key=lambda item: item["score"] / item["maxMarks"])[:5],
            "recentResults": sorted(events, key=lambda item: item["at"], reverse=True)[:10]}
