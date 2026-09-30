import io
import json
import os
import sqlite3
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field

from . import db, grading


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_id():
    return str(uuid.uuid4())


def clean_mark(value):
    number = round(float(value), 2)
    if not (0 < number <= 100):
        raise HTTPException(422, "Maximum marks must be greater than 0 and at most 100.")
    return number


class CriterionInput(BaseModel):
    id: str | None = None
    title: str = Field(min_length=1)
    description: str = ""
    maxMark: float = Field(gt=0)


class QuestionInput(BaseModel):
    code: str = Field(min_length=1)
    title: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    subject: str = "General"
    classGrade: str = ""
    maxMarks: float = Field(gt=0)
    referenceAnswer: str = Field(min_length=1)
    criteria: list[CriterionInput] = Field(min_length=1)
    rubricApproved: bool = False


class MCQInput(BaseModel):
    code: str = Field(min_length=1)
    subject: str = "General"
    question: str = Field(min_length=1)
    options: list[dict]
    correctKey: str
    explanation: str = ""


class AttemptInput(BaseModel):
    studentName: str = Field(min_length=1)
    studentId: str = Field(min_length=1)
    answers: dict[str, str]


class TranscriptInput(BaseModel):
    text: str


class OverrideInput(BaseModel):
    criterionId: str
    mark: float = Field(ge=0)
    note: str = Field(min_length=1)


class FeedbackInput(BaseModel):
    note: str


class TeacherLabelInput(BaseModel):
    mark: float = Field(ge=0)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.initialize()
    yield


app = FastAPI(title="Smart Exam Evaluation", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
                   allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Content-Type"])


def question_out(conn, row):
    criteria = conn.execute("SELECT * FROM rubric_criteria WHERE question_id=? ORDER BY position", (row["id"],)).fetchall()
    return {"id": row["id"], "code": row["code"], "title": row["title"], "prompt": row["prompt"],
            "maxMarks": row["max_marks"], "subject": row["subject"], "classGrade": row["class_grade"],
            "referenceAnswer": row["reference_answer"], "rubricApproved": bool(row["rubric_approved"]),
            "rubricVersion": row["rubric_version"], "approvedAt": row["approved_at"],
            "criteria": [{"id": c["id"], "title": c["title"], "description": c["description"],
                          "maxMark": c["max_mark"]} for c in criteria]}


def validate_question(payload):
    maximum = clean_mark(payload.maxMarks)
    if abs(sum(c.maxMark for c in payload.criteria) - maximum) > 0.005:
        raise HTTPException(422, "Rubric criterion marks must add up exactly to the maximum marks.")
    if len({c.id for c in payload.criteria if c.id}) != len([c for c in payload.criteria if c.id]):
        raise HTTPException(422, "Rubric criterion IDs must be unique.")
    if payload.rubricApproved and any(not c.description.strip() or "Edit this draft" in c.description for c in payload.criteria):
        raise HTTPException(422, "Approve only specific rubric criteria with descriptions.")
    return maximum


def save_criteria(conn, question_id, criteria):
    conn.execute("DELETE FROM rubric_criteria WHERE question_id=?", (question_id,))
    for position, criterion in enumerate(criteria):
        conn.execute("INSERT INTO rubric_criteria VALUES (?,?,?,?,?,?)", (
            criterion.id or new_id(), question_id, position, criterion.title.strip(),
            criterion.description.strip(), round(criterion.maxMark, 2)))


@app.get("/api/health")
def health():
    return {"database": "ready", "grader": grading.model_status(), "ocrFast": bool(os.getenv("PADDLE_OCR_URL"))}


@app.get("/api/questions")
def list_questions():
    with db.connection() as conn:
        return [question_out(conn, row) for row in conn.execute("SELECT * FROM questions ORDER BY created_at DESC")]


@app.post("/api/questions", status_code=201)
def add_question(payload: QuestionInput):
    maximum = validate_question(payload)
    qid, timestamp = new_id(), now()
    try:
        with db.connection() as conn:
            conn.execute("INSERT INTO questions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                qid, payload.code.strip(), payload.title.strip(), payload.prompt.strip(), maximum,
                payload.subject.strip(), payload.classGrade.strip(), payload.referenceAnswer.strip(),
                int(payload.rubricApproved), 1, timestamp if payload.rubricApproved else None, timestamp, timestamp))
            save_criteria(conn, qid, payload.criteria)
            return question_out(conn, conn.execute("SELECT * FROM questions WHERE id=?", (qid,)).fetchone())
    except sqlite3.IntegrityError as exc:
        raise HTTPException(409, "Question code or rubric criterion ID already exists.") from exc


@app.put("/api/questions/{qid}")
def update_question(qid: str, payload: QuestionInput):
    maximum = validate_question(payload)
    with db.connection() as conn:
        old = conn.execute("SELECT * FROM questions WHERE id=?", (qid,)).fetchone()
        if not old:
            raise HTTPException(404, "Question not found.")
        version = old["rubric_version"] + 1
        try:
            conn.execute("""UPDATE questions SET code=?, title=?, prompt=?, max_marks=?, subject=?,
                class_grade=?, reference_answer=?, rubric_approved=?, rubric_version=?, approved_at=?, updated_at=? WHERE id=?""", (
                payload.code.strip(), payload.title.strip(), payload.prompt.strip(), maximum,
                payload.subject.strip(), payload.classGrade.strip(), payload.referenceAnswer.strip(),
                int(payload.rubricApproved), version, now() if payload.rubricApproved else None, now(), qid))
            save_criteria(conn, qid, payload.criteria)
        except sqlite3.IntegrityError as exc:
            raise HTTPException(409, "Question code or rubric criterion ID already exists.") from exc
        return question_out(conn, conn.execute("SELECT * FROM questions WHERE id=?", (qid,)).fetchone())


@app.delete("/api/questions/{qid}")
def delete_question(qid: str):
    with db.connection() as conn:
        if conn.execute("SELECT 1 FROM submissions WHERE question_id=?", (qid,)).fetchone():
            raise HTTPException(409, "This question has submissions. Keep it for the grade audit.")
        deleted = conn.execute("DELETE FROM questions WHERE id=?", (qid,)).rowcount
        if not deleted:
            raise HTTPException(404, "Question not found.")
    return {"deleted": True}


def grade_out(row):
    overrides = json.loads(row["overrides"])
    scores = json.loads(row["criteria_scores"])
    effective = [{**s, "mark": overrides.get(s["criterionId"], {}).get("mark", s["mark"])} for s in scores]
    return {"id": row["id"], "modelName": row["model_name"], "questionVersion": row["question_version"],
            "rubricSnapshot": json.loads(row["rubric_snapshot"]), "answerSnapshot": row["answer_snapshot"],
            "criteriaScores": effective, "modelScores": scores, "reviewFlags": json.loads(row["review_flags"]),
            "modelTotal": row["model_total"], "evaluatedTotalScore": round(sum(s["mark"] for s in effective), 2),
            "teacherOverrides": overrides, "teacherFeedback": row["teacher_feedback"], "gradedAt": row["graded_at"]}


def submission_out(conn, row):
    grade = conn.execute("SELECT * FROM grades WHERE submission_id=? ORDER BY graded_at DESC, rowid DESC LIMIT 1", (row["id"],)).fetchone()
    pages = conn.execute("SELECT position, file_name FROM submission_pages WHERE submission_id=? ORDER BY position", (row["id"],)).fetchall()
    result = {"id": row["id"], "questionId": row["question_id"], "studentName": row["student_name"],
              "studentId": row["student_id"], "fileName": row["file_name"], "submittedAt": row["submitted_at"],
              "ocrOriginal": row["ocr_original"], "ocrTranscript": row["ocr_transcript"], "ocrEngine": row["ocr_engine"],
              "ocrError": row["ocr_error"], "status": row["status"],
              "pages": [{"position": p["position"], "fileName": p["file_name"],
                         "url": f"/api/submissions/{row['id']}/pages/{p['position']}"} for p in pages]}
    if grade and row["status"] == "graded":
        result.update(grade_out(grade))
    return result


@app.get("/api/submissions")
def list_submissions():
    with db.connection() as conn:
        return [submission_out(conn, row) for row in conn.execute("SELECT * FROM submissions ORDER BY submitted_at DESC")]


def check_image(contents):
    if len(contents) > 12 * 1024 * 1024:
        raise HTTPException(413, "Each image must be smaller than 12 MB.")
    try:
        with Image.open(io.BytesIO(contents)) as image:
            if image.width * image.height > 20_000_000:
                raise HTTPException(413, "Image is too large (20 megapixel limit).")
            normalized = ImageOps.exif_transpose(image).convert("RGB")
            output = io.BytesIO()
            normalized.save(output, format="PNG")
            return output.getvalue()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(422, "Only valid image files are accepted.") from exc


def fast_ocr(contents):
    url = os.getenv("PADDLE_OCR_URL", "http://127.0.0.1:8001/ocr")
    try:
        with httpx.Client(trust_env=False, timeout=120) as client:
            response = client.post(url, files={"file": ("page.png", contents, "image/png")},
                                   data={"mode": "fast"})
        response.raise_for_status()
        return str(response.json().get("extracted_text", "")).strip()
    except (httpx.HTTPError, ValueError) as exc:
        raise grading.ModelUnavailable(f"Fast OCR service unavailable: {exc}") from exc


@app.post("/api/submissions", status_code=201)
async def add_submission(question_id: str = Form(...), student_name: str = Form(...),
                         student_id: str = Form(...), answer_text: str = Form(""),
                         ocr_mode: str = Form("fast"), files: list[UploadFile] | None = File(None)):
    if not student_name.strip() or not student_id.strip():
        raise HTTPException(422, "Student name and ID are required.")
    if ocr_mode not in {"fast", "accurate", "manual"}:
        raise HTTPException(422, "OCR mode must be fast, accurate, or manual.")
    with db.connection() as conn:
        if not conn.execute("SELECT 1 FROM questions WHERE id=?", (question_id,)).fetchone():
            raise HTTPException(404, "Question not found.")
    files = files or []
    if not files and not answer_text.strip():
        raise HTTPException(422, "Type an answer or upload at least one image.")
    if len(files) > 12:
        raise HTTPException(413, "At most 12 pages per submission.")
    images = [(item.filename or f"page-{i+1}.png", check_image(await item.read())) for i, item in enumerate(files)]
    sid, timestamp = new_id(), now()
    page_dir = db.UPLOAD_DIR / sid
    page_dir.mkdir(parents=True, exist_ok=True)
    for position, (_, image) in enumerate(images):
        (page_dir / f"{position}.png").write_bytes(image)
    transcript, errors = [], []
    if ocr_mode != "manual":
        for filename, image in images:
            try:
                result = fast_ocr(image) if ocr_mode == "fast" else grading.transcribe(image)
                transcript.append(result)
            except grading.ModelUnavailable as exc:
                errors.append(f"{filename}: {exc}")
    original = "\n\n".join(t for t in transcript if t)
    reviewed = answer_text.strip() or original
    with db.connection() as conn:
        conn.execute("INSERT INTO submissions VALUES (?,?,?,?,?,?,?,?,?,?,?)", (
            sid, question_id, student_name.strip(), student_id.strip(),
            ", ".join(name for name, _ in images), timestamp, original, reviewed,
            ocr_mode if images else "typed", "; ".join(errors), "pending"))
        for position, (filename, _) in enumerate(images):
            conn.execute("INSERT INTO submission_pages VALUES (?,?,?,?,?)", (new_id(), sid, position, filename, f"{sid}/{position}.png"))
        return submission_out(conn, conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone())


@app.get("/api/submissions/{sid}/pages/{position}")
def get_page(sid: str, position: int):
    with db.connection() as conn:
        row = conn.execute("SELECT stored_name FROM submission_pages WHERE submission_id=? AND position=?", (sid, position)).fetchone()
        if not row:
            raise HTTPException(404, "Page not found.")
        path = (db.UPLOAD_DIR / row["stored_name"]).resolve()
        if not path.is_relative_to(db.UPLOAD_DIR) or not path.is_file():
            raise HTTPException(404, "Page not found.")
        return FileResponse(path, media_type="image/png")


@app.put("/api/submissions/{sid}/transcript")
def update_transcript(sid: str, payload: TranscriptInput):
    with db.connection() as conn:
        if not conn.execute("SELECT 1 FROM submissions WHERE id=?", (sid,)).fetchone():
            raise HTTPException(404, "Submission not found.")
        conn.execute("UPDATE submissions SET ocr_transcript=?, status='pending' WHERE id=?", (payload.text.strip(), sid))
        return submission_out(conn, conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone())


@app.post("/api/submissions/{sid}/grade")
def grade_submission(sid: str):
    with db.connection() as conn:
        submission = conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone()
        if not submission:
            raise HTTPException(404, "Submission not found.")
        row = conn.execute("SELECT * FROM questions WHERE id=?", (submission["question_id"],)).fetchone()
        question = question_out(conn, row)
        if not question["rubricApproved"]:
            raise HTTPException(409, "Teacher must approve the rubric before grading.")
        answer = submission["ocr_transcript"].strip()
        if not answer:
            raise HTTPException(422, "Review and save the OCR text before grading.")
    try:
        result = grading.grade(question, answer)
    except grading.ModelUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    with db.connection() as conn:
        gid, timestamp = new_id(), now()
        conn.execute("INSERT INTO grades VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", (
            gid, sid, question["rubricVersion"], json.dumps(question), answer, result["modelName"],
            json.dumps(result["criteriaScores"]), json.dumps(result["reviewFlags"]), result["total"],
            "{}", result["feedback"], timestamp))
        conn.execute("UPDATE submissions SET status='graded' WHERE id=?", (sid,))
        return submission_out(conn, conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone())


@app.put("/api/submissions/{sid}/override")
def override_mark(sid: str, payload: OverrideInput):
    with db.connection() as conn:
        row = conn.execute("SELECT * FROM grades WHERE submission_id=? ORDER BY graded_at DESC, rowid DESC LIMIT 1", (sid,)).fetchone()
        if not row:
            raise HTTPException(404, "Grade not found.")
        criterion = next((c for c in json.loads(row["rubric_snapshot"])["criteria"] if c["id"] == payload.criterionId), None)
        if not criterion or payload.mark > criterion["maxMark"]:
            raise HTTPException(422, "Override must be within this criterion's mark limit.")
        overrides = json.loads(row["overrides"])
        overrides[payload.criterionId] = {"mark": round(payload.mark, 2), "note": payload.note.strip(), "at": now()}
        conn.execute("UPDATE grades SET overrides=? WHERE id=?", (json.dumps(overrides), row["id"]))
        return submission_out(conn, conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone())


@app.put("/api/submissions/{sid}/feedback")
def save_feedback(sid: str, payload: FeedbackInput):
    with db.connection() as conn:
        grade_row = conn.execute("SELECT id FROM grades WHERE submission_id=? ORDER BY graded_at DESC, rowid DESC LIMIT 1", (sid,)).fetchone()
        if not grade_row:
            raise HTTPException(404, "Grade not found.")
        conn.execute("UPDATE grades SET teacher_feedback=? WHERE id=?", (payload.note.strip(), grade_row["id"]))
        return submission_out(conn, conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone())


def mcq_out(row, include_key=True):
    item = {"id": row["id"], "code": row["code"], "subject": row["subject"], "question": row["question"],
            "options": json.loads(row["options"]), "explanation": row["explanation"], "mark": row["mark"]}
    if include_key:
        item["correctKey"] = row["correct_key"]
    return item


def validate_mcq(payload):
    keys = [option.get("key") for option in payload.options]
    if len(keys) < 2 or len(keys) != len(set(keys)) or payload.correctKey not in keys or any(not str(option.get("text", "")).strip() for option in payload.options):
        raise HTTPException(422, "Provide at least two distinct, nonempty options and a valid correct key.")


@app.get("/api/mcqs")
def list_mcqs():
    with db.connection() as conn:
        return [mcq_out(row) for row in conn.execute("SELECT * FROM mcqs ORDER BY rowid")]


@app.post("/api/mcqs", status_code=201)
def add_mcq(payload: MCQInput):
    validate_mcq(payload)
    mid = new_id()
    try:
        with db.connection() as conn:
            conn.execute("INSERT INTO mcqs VALUES (?,?,?,?,?,?,?,?)", (
                mid, payload.code.strip(), payload.subject.strip(), payload.question.strip(),
                json.dumps(payload.options), payload.correctKey, payload.explanation.strip(), 1.0))
            return mcq_out(conn.execute("SELECT * FROM mcqs WHERE id=?", (mid,)).fetchone())
    except sqlite3.IntegrityError as exc:
        raise HTTPException(409, "MCQ code already exists.") from exc


@app.put("/api/mcqs/{mid}")
def update_mcq(mid: str, payload: MCQInput):
    validate_mcq(payload)
    with db.connection() as conn:
        try:
            count = conn.execute("UPDATE mcqs SET code=?, subject=?, question=?, options=?, correct_key=?, explanation=? WHERE id=?", (
                payload.code.strip(), payload.subject.strip(), payload.question.strip(), json.dumps(payload.options),
                payload.correctKey, payload.explanation.strip(), mid)).rowcount
        except sqlite3.IntegrityError as exc:
            raise HTTPException(409, "MCQ code already exists.") from exc
        if not count:
            raise HTTPException(404, "MCQ not found.")
        return mcq_out(conn.execute("SELECT * FROM mcqs WHERE id=?", (mid,)).fetchone())


@app.delete("/api/mcqs/{mid}")
def delete_mcq(mid: str):
    with db.connection() as conn:
        if not conn.execute("DELETE FROM mcqs WHERE id=?", (mid,)).rowcount:
            raise HTTPException(404, "MCQ not found.")
    return {"deleted": True}


@app.post("/api/mcq-attempts", status_code=201)
def grade_mcq_attempt(payload: AttemptInput):
    with db.connection() as conn:
        questions = conn.execute("SELECT * FROM mcqs ORDER BY rowid").fetchall()
        if not questions:
            raise HTTPException(409, "Add MCQ questions before grading an attempt.")
        results = []
        for q in questions:
            answer = payload.answers.get(q["id"], "")
            results.append({"questionId": q["id"], "studentAnswer": answer,
                            "correctKey": q["correct_key"], "awarded": 1 if answer == q["correct_key"] else 0})
        aid, score, timestamp = new_id(), sum(item["awarded"] for item in results), now()
        conn.execute("INSERT INTO mcq_attempts VALUES (?,?,?,?,?,?,?,?)", (
            aid, payload.studentName.strip(), payload.studentId.strip(), json.dumps(payload.answers),
            json.dumps(results), score, len(questions), timestamp))
        return {"id": aid, "studentName": payload.studentName, "studentId": payload.studentId,
                "answers": payload.answers, "results": results, "score": score, "maxMarks": len(questions), "submittedAt": timestamp}


@app.get("/api/mcq-attempts")
def list_mcq_attempts():
    with db.connection() as conn:
        return [{"id": r["id"], "studentName": r["student_name"], "studentId": r["student_id"],
                 "answers": json.loads(r["answers"]), "results": json.loads(r["results"]),
                 "score": r["score"], "maxMarks": r["max_marks"], "submittedAt": r["submitted_at"]}
                for r in conn.execute("SELECT * FROM mcq_attempts ORDER BY submitted_at DESC")]


@app.put("/api/submissions/{sid}/teacher-label")
def record_teacher_label(sid: str, payload: TeacherLabelInput):
    with db.connection() as conn:
        row = conn.execute("SELECT q.max_marks FROM submissions s JOIN questions q ON q.id=s.question_id WHERE s.id=?", (sid,)).fetchone()
        if not row:
            raise HTTPException(404, "Submission not found.")
        if payload.mark > row["max_marks"]:
            raise HTTPException(422, "Teacher mark exceeds the question maximum.")
        conn.execute("INSERT INTO teacher_labels VALUES (?,?,?) ON CONFLICT(submission_id) DO UPDATE SET mark=excluded.mark, recorded_at=excluded.recorded_at",
                     (sid, round(payload.mark, 2), now()))
        return {"submissionId": sid, "teacherMark": round(payload.mark, 2)}


@app.get("/api/evaluation")
def evaluation():
    with db.connection() as conn:
        labels = conn.execute("""SELECT l.mark, g.model_total FROM teacher_labels l
            JOIN grades g ON g.id=(SELECT id FROM grades WHERE submission_id=l.submission_id ORDER BY graded_at DESC, rowid DESC LIMIT 1)""").fetchall()
    errors = [abs(row["mark"] - row["model_total"]) for row in labels]
    correlation = None
    if len(labels) >= 2:
        actual = [row["mark"] for row in labels]
        predicted = [row["model_total"] for row in labels]
        mx, my = sum(actual) / len(actual), sum(predicted) / len(predicted)
        numerator = sum((x - mx) * (y - my) for x, y in zip(actual, predicted))
        denominator = (sum((x - mx) ** 2 for x in actual) * sum((y - my) ** 2 for y in predicted)) ** 0.5
        if denominator:
            correlation = round(numerator / denominator, 3)
    baseline_file = db.DATA_DIR / "research_metrics.json"
    comparison = json.loads(baseline_file.read_text()) if baseline_file.is_file() else None
    return {"samples": len(errors), "mae": round(sum(errors) / len(errors), 3) if errors else None,
            "withinOneMark": round(sum(e <= 1 for e in errors) / len(errors), 3) if errors else None,
            "pearsonCorrelation": correlation,
            "supervisedComparison": comparison,
            "note": "Teacher labels are user-entered. No independent test set or trained baseline is included."}
