import io
import json
import os
import sqlite3
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, field_validator
from starlette.concurrency import run_in_threadpool

from . import auth, db, grading
from . import backups, exams


def now():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def new_id():
    return str(uuid.uuid4())


def clean_mark(value):
    number = round(float(value), 2)
    if not (0 < number <= 100):
        raise HTTPException(422, "Maximum marks must be greater than 0 and at most 100.")
    return number


class InputModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, allow_inf_nan=False)


class CriterionInput(InputModel):
    id: str | None = None
    title: str = Field(min_length=1)
    description: str = ""
    maxMark: float = Field(gt=0)


class QuestionInput(InputModel):
    code: str = Field(min_length=1)
    title: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    subject: str = "General"
    classGrade: str = ""
    maxMarks: float = Field(gt=0)
    referenceAnswer: str = Field(min_length=1)
    criteria: list[CriterionInput] = Field(min_length=1)
    rubricApproved: bool = False


class MCQInput(InputModel):
    code: str = Field(min_length=1)
    subject: str = "General"
    question: str = Field(min_length=1)
    options: list[dict]
    correctKey: str
    explanation: str = ""


class AttemptInput(InputModel):
    studentName: str = Field(min_length=1)
    studentId: str = Field(min_length=1)
    answers: dict[str, str]

    @field_validator("answers")
    @classmethod
    def valid_answers(cls, answers):
        if any(answer not in {"A", "B", "C", "D", ""} for answer in answers.values()):
            raise ValueError("MCQ answers must be A, B, C, D, or blank.")
        return answers


class TranscriptInput(BaseModel):
    text: str


class OverrideInput(InputModel):
    criterionId: str
    mark: float = Field(ge=0)
    note: str = Field(min_length=1)


class FeedbackInput(BaseModel):
    note: str


class TeacherLabelInput(InputModel):
    mark: float = Field(ge=0)


class AccountInput(BaseModel):
    username: str
    password: str
    displayName: str = ""


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.initialize()
    yield


app = FastAPI(title="Smart Exam Evaluation", version="1.0", lifespan=lifespan)
app.include_router(exams.router)
app.include_router(backups.router)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
                   allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Content-Type", "Authorization"])


@app.middleware("http")
async def access_control(request: Request, call_next):
    path = request.url.path
    if request.method == "OPTIONS" or not path.startswith("/api/") or path in {"/api/health", "/api/auth/login", "/api/auth/register"}:
        return await call_next(request)
    header = request.headers.get("Authorization", "")
    token = header[7:] if header.startswith("Bearer ") else ""
    user = auth.user_for_token(token)
    if not user:
        return JSONResponse({"detail": "Sign in to continue."}, status_code=401)
    request.state.user = user
    request.state.token = token
    if user["role"] == "admin":
        return await call_next(request)
    if path.startswith("/api/student/") or path.startswith("/api/auth/"):
        return await call_next(request)
    if request.method == "GET" and path.startswith("/api/submissions/") and "/pages/" in path:
        sid = path.split("/")[3]
        with db.connection() as conn:
            owner = conn.execute("SELECT owner_user_id FROM submissions WHERE id=?", (sid,)).fetchone()
        if owner and owner["owner_user_id"] == user["id"]:
            return await call_next(request)
        return JSONResponse({"detail": "Page not found."}, status_code=404)
    return JSONResponse({"detail": "Admin access required."}, status_code=403)


@app.post("/api/auth/register", status_code=201)
def register(payload: AccountInput):
    try:
        auth.create_user(payload.username, payload.displayName, payload.password)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(409, "Student ID is already registered.") from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return auth.login(payload.username, payload.password)


@app.post("/api/auth/login")
def login(payload: AccountInput):
    session = auth.login(payload.username, payload.password)
    if not session:
        raise HTTPException(401, "Incorrect ID or password.")
    return session


@app.get("/api/auth/me")
def current_user(request: Request):
    return request.state.user


@app.post("/api/auth/logout")
def logout(request: Request):
    auth.logout(request.state.token)
    return {"signedOut": True}


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
    if any(c.maxMark != round(c.maxMark, 2) for c in payload.criteria) or payload.maxMarks != maximum:
        raise HTTPException(422, "Use at most two decimal places for marks.")
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


@app.get("/api/student/questions")
def student_questions():
    with db.connection() as conn:
        rows = conn.execute("SELECT id, code, title, prompt, subject, max_marks FROM questions WHERE rubric_approved=1 ORDER BY created_at DESC")
        return [{"id": row["id"], "code": row["code"], "title": row["title"],
                 "prompt": row["prompt"], "subject": row["subject"], "maxMarks": row["max_marks"]}
                for row in rows]


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
        if exams.question_in_exams(conn, "descriptive", qid):
            raise HTTPException(409, "This question belongs to an exam set. Keep it for exam records.")
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
    return {"gradeId": row["id"], "modelName": row["model_name"], "questionVersion": row["question_version"],
            "rubricSnapshot": json.loads(row["rubric_snapshot"]), "answerSnapshot": row["answer_snapshot"],
            "criteriaScores": effective, "modelScores": scores, "reviewFlags": json.loads(row["review_flags"]),
            "modelTotal": row["model_total"], "evaluatedTotalScore": round(sum(s["mark"] for s in effective), 2),
            "teacherOverrides": overrides, "teacherFeedback": row["teacher_feedback"], "gradedAt": row["graded_at"]}


def submission_question(conn, row):
    if row["exam_attempt_id"]:
        attempt = conn.execute("SELECT snapshot FROM exam_attempts WHERE id=?", (row["exam_attempt_id"],)).fetchone()
        return exams.descriptive_question(json.loads(attempt["snapshot"]), row["question_id"])
    return question_out(conn, conn.execute("SELECT * FROM questions WHERE id=?", (row["question_id"],)).fetchone())


def submission_out(conn, row):
    grade = conn.execute("SELECT * FROM grades WHERE submission_id=? ORDER BY graded_at DESC, rowid DESC LIMIT 1", (row["id"],)).fetchone()
    pages = conn.execute("SELECT position, file_name FROM submission_pages WHERE submission_id=? ORDER BY position", (row["id"],)).fetchall()
    result = {"id": row["id"], "questionId": row["question_id"], "studentName": row["student_name"],
              "studentId": row["student_id"], "fileName": row["file_name"], "submittedAt": row["submitted_at"],
              "ocrOriginal": row["ocr_original"], "ocrTranscript": row["ocr_transcript"], "ocrEngine": row["ocr_engine"],
              "ocrError": row["ocr_error"], "status": row["status"],
              "examAttemptId": row["exam_attempt_id"],
              "pages": [{"position": p["position"], "fileName": p["file_name"],
                         "url": f"/api/submissions/{row['id']}/pages/{p['position']}"} for p in pages]}
    if grade and row["status"] == "graded":
        result.update(grade_out(grade))
    elif row["exam_attempt_id"]:
        result["rubricSnapshot"] = submission_question(conn, row)
    label = conn.execute("SELECT mark FROM teacher_labels WHERE submission_id=?", (row["id"],)).fetchone()
    result["teacherLabel"] = label["mark"] if label else None
    return result


@app.get("/api/submissions")
def list_submissions():
    with db.connection() as conn:
        return [submission_out(conn, row) for row in conn.execute("SELECT * FROM submissions ORDER BY submitted_at DESC, rowid DESC")]


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
                result = await run_in_threadpool(fast_ocr if ocr_mode == "fast" else grading.transcribe, image)
                transcript.append(result)
            except grading.ModelUnavailable as exc:
                errors.append(f"{filename}: {exc}")
    original = "\n\n".join(t for t in transcript if t)
    reviewed = answer_text.strip() or original
    with db.connection() as conn:
        conn.execute("""INSERT INTO submissions (id, question_id, student_name, student_id, file_name,
            submitted_at, ocr_original, ocr_transcript, ocr_engine, ocr_error, status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""", (
            sid, question_id, student_name.strip(), student_id.strip(),
            ", ".join(name for name, _ in images), timestamp, original, reviewed,
            ocr_mode if images else "typed", "; ".join(errors), "pending"))
        for position, (filename, _) in enumerate(images):
            conn.execute("INSERT INTO submission_pages VALUES (?,?,?,?,?)", (new_id(), sid, position, filename, f"{sid}/{position}.png"))
        return submission_out(conn, conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone())


def student_response(submission, message=None):
    with db.connection() as conn:
        row = conn.execute("SELECT * FROM questions WHERE id=?", (submission["questionId"],)).fetchone()
        question = question_out(conn, row)
        if submission.get("examAttemptId"):
            attempt = conn.execute("SELECT snapshot FROM exam_attempts WHERE id=?", (submission["examAttemptId"],)).fetchone()
            question = exams.descriptive_question(json.loads(attempt["snapshot"]), submission["questionId"])
    snapshot = submission.get("rubricSnapshot") or question
    result = {"id": submission["id"], "studentName": submission["studentName"],
              "questionId": submission["questionId"], "questionTitle": snapshot["title"],
              "maxMarks": snapshot["maxMarks"], "submittedAt": submission["submittedAt"],
              "transcript": submission["ocrTranscript"], "ocrError": submission["ocrError"],
              "status": submission["status"], "pages": submission["pages"]}
    result["examAttemptId"] = submission.get("examAttemptId")
    if message:
        result["message"] = message
    if submission["status"] == "graded":
        result.update({"score": submission["evaluatedTotalScore"],
                       "feedback": submission["teacherFeedback"], "reviewFlags": submission["reviewFlags"],
                       "criteria": [{"title": criterion["title"], "maxMark": criterion["maxMark"],
                                     "mark": next((score["mark"] for score in submission["criteriaScores"]
                                                   if score["criterionId"] == criterion["id"]), 0),
                                     "evidence": next((score["evidence"] for score in submission["criteriaScores"]
                                                       if score["criterionId"] == criterion["id"]), "")}
                                    for criterion in snapshot["criteria"]]})
    return result


def assert_student_owns(sid, user):
    with db.connection() as conn:
        row = conn.execute("SELECT * FROM submissions WHERE id=? AND owner_user_id=?", (sid, user["id"])).fetchone()
        if not row:
            raise HTTPException(404, "Submission not found.")
        return submission_out(conn, row)


@app.get("/api/student/answers")
def student_history(request: Request, exam_attempt_id: str | None = None):
    with db.connection() as conn:
        if exam_attempt_id:
            exams.owned_attempt(conn, exam_attempt_id, request.state.user)
        rows = conn.execute("""SELECT * FROM submissions WHERE owner_user_id=?
            AND (? IS NULL OR exam_attempt_id=?) ORDER BY submitted_at DESC, rowid DESC""",
                            (request.state.user["id"], exam_attempt_id, exam_attempt_id)).fetchall()
        return [student_response(submission_out(conn, row)) for row in rows]


@app.post("/api/student/answers/draft", status_code=201)
async def student_answer_draft(request: Request, question_id: str = Form(...),
                               ocr_mode: str = Form("accurate"), files: list[UploadFile] | None = File(None),
                               exam_attempt_id: str | None = Form(None)):
    exam_attempt_id = exam_attempt_id or None
    with db.connection() as conn:
        exams.check_answer_context(conn, exam_attempt_id, question_id, request.state.user)
    if not files:
        raise HTTPException(422, "Upload at least one answer image.")
    user = request.state.user
    submission = await add_submission(question_id, user["displayName"], user["username"], "", ocr_mode, files)
    with db.connection() as conn:
        conn.execute("UPDATE submissions SET owner_user_id=?, exam_attempt_id=? WHERE id=?",
                     (user["id"], exam_attempt_id, submission["id"]))
    submission["examAttemptId"] = exam_attempt_id
    return student_response(submission, "Review the extracted text, then confirm to grade.")


@app.post("/api/student/answers/{sid}/grade")
def grade_student_draft(sid: str, payload: TranscriptInput, request: Request):
    submission = assert_student_owns(sid, request.state.user)
    if submission["status"] == "graded":
        raise HTTPException(409, "This answer has already been graded. Submit a new attempt to try again.")
    if not payload.text.strip():
        raise HTTPException(422, "Enter the answer text before grading.")
    update_transcript(sid, payload)
    try:
        return student_response(grade_submission(sid))
    except HTTPException as exc:
        if exc.status_code not in (422, 503):
            raise
        return student_response(assert_student_owns(sid, request.state.user), str(exc.detail))


@app.post("/api/student/answers", status_code=201)
async def submit_student_answer(request: Request, question_id: str = Form(...), answer_text: str = Form(""),
                                ocr_mode: str = Form("accurate"), files: list[UploadFile] | None = File(None),
                                exam_attempt_id: str | None = Form(None)):
    """Accept a student answer and grade it immediately against an approved rubric."""
    exam_attempt_id = exam_attempt_id or None
    with db.connection() as conn:
        exams.check_answer_context(conn, exam_attempt_id, question_id, request.state.user)
    user = request.state.user
    # A typed correction takes precedence over OCR, while images remain saved as source pages.
    submission = await add_submission(question_id, user["displayName"], user["username"], answer_text,
                                      "manual" if answer_text.strip() else ocr_mode, files)
    with db.connection() as conn:
        conn.execute("UPDATE submissions SET owner_user_id=?, exam_attempt_id=? WHERE id=?",
                     (user["id"], exam_attempt_id, submission["id"]))
    submission["examAttemptId"] = exam_attempt_id
    if not submission["ocrTranscript"].strip():
        return student_response(submission, "OCR could not read the answer. Type the answer below and confirm to grade this saved attempt.")
    try:
        graded = await run_in_threadpool(grade_submission, submission["id"])
    except HTTPException as exc:
        if exc.status_code not in (422, 503):
            raise
        return student_response(submission, str(exc.detail))
    return student_response(graded)


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
        previous = conn.execute("SELECT ocr_transcript FROM submissions WHERE id=?", (sid,)).fetchone()
        if not previous:
            raise HTTPException(404, "Submission not found.")
        if previous["ocr_transcript"] != payload.text.strip():
            conn.execute("DELETE FROM teacher_labels WHERE submission_id=?", (sid,))
        conn.execute("UPDATE submissions SET ocr_transcript=?, status='pending' WHERE id=?", (payload.text.strip(), sid))
        return submission_out(conn, conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone())


@app.post("/api/submissions/{sid}/grade")
def grade_submission(sid: str):
    with db.connection() as conn:
        submission = conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone()
        if not submission:
            raise HTTPException(404, "Submission not found.")
        question = submission_question(conn, submission)
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
        conn.execute("BEGIN IMMEDIATE")
        current = conn.execute("SELECT ocr_transcript, status FROM submissions WHERE id=?", (sid,)).fetchone()
        current_question = conn.execute("SELECT rubric_version FROM questions WHERE id=?", (question["id"],)).fetchone()
        if (current["ocr_transcript"].strip() != answer or current["status"] != submission["status"]
                or (not submission["exam_attempt_id"] and current_question["rubric_version"] != question["rubricVersion"])):
            raise HTTPException(409, "The answer or rubric changed during grading. Refresh and try again.")
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
            "options": json.loads(row["options"]), "explanation": row["explanation"] if include_key else "", "mark": row["mark"]}
    if include_key:
        item["correctKey"] = row["correct_key"]
    return item


def validate_mcq(payload):
    keys = [option.get("key") for option in payload.options]
    if (not 2 <= len(keys) <= 4 or any(not isinstance(key, str) or key not in {"A", "B", "C", "D"} for key in keys)
            or len(keys) != len(set(keys)) or payload.correctKey not in keys
            or any(not isinstance(option.get("text"), str) or not option["text"].strip() for option in payload.options)):
        raise HTTPException(422, "Provide two to four distinct A/B/C/D options with text and a valid correct key.")


@app.get("/api/mcqs")
def list_mcqs():
    with db.connection() as conn:
        return [mcq_out(row) for row in conn.execute("SELECT * FROM mcqs ORDER BY rowid")]


@app.get("/api/student/mcqs")
def student_mcqs():
    with db.connection() as conn:
        return [mcq_out(row, include_key=False) for row in conn.execute("SELECT * FROM mcqs ORDER BY rowid")]


@app.post("/api/student/mcqs/scan")
async def scan_mcq_sheet(file: UploadFile = File(...)):
    image = check_image(await file.read())
    with db.connection() as conn:
        rows = conn.execute("SELECT id, code FROM mcqs ORDER BY rowid").fetchall()
        if not rows:
            raise HTTPException(409, "No MCQ questions are available.")
    try:
        by_code, uncertain = await run_in_threadpool(grading.detect_mcq_choices, image, [row["code"] for row in rows])
    except grading.ModelUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    return {"answers": {row["id"]: by_code[row["code"]] for row in rows},
            "uncertainCodes": uncertain,
            "message": "Review the detected choices before scoring. Blank or unclear marks earn no credit."}


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
        if exams.question_in_exams(conn, "mcq", mid):
            raise HTTPException(409, "This MCQ belongs to an exam set. Keep it for exam records.")
        if not conn.execute("DELETE FROM mcqs WHERE id=?", (mid,)).rowcount:
            raise HTTPException(404, "MCQ not found.")
    return {"deleted": True}


@app.post("/api/mcq-attempts", status_code=201)
def grade_mcq_attempt(payload: AttemptInput):
    with db.connection() as conn:
        questions = conn.execute("SELECT * FROM mcqs ORDER BY rowid").fetchall()
        if not questions:
            raise HTTPException(409, "Add MCQ questions before grading an attempt.")
        if set(payload.answers) - {q["id"] for q in questions}:
            raise HTTPException(409, "The MCQ question list changed. Refresh before submitting again.")
        for q in questions:
            answer = payload.answers.get(q["id"], "")
            if answer and answer not in {option["key"] for option in json.loads(q["options"])}:
                raise HTTPException(422, "Select one of the available options for each MCQ.")
        results = []
        for q in questions:
            answer = payload.answers.get(q["id"], "")
            results.append({"questionId": q["id"], "studentAnswer": answer,
                            "code": q["code"], "subject": q["subject"], "question": q["question"],
                            "correctKey": q["correct_key"], "awarded": 1 if answer == q["correct_key"] else 0})
        aid, score, timestamp = new_id(), sum(item["awarded"] for item in results), now()
        conn.execute("""INSERT INTO mcq_attempts (id, student_name, student_id, answers, results,
            score, max_marks, submitted_at) VALUES (?,?,?,?,?,?,?,?)""", (
            aid, payload.studentName.strip(), payload.studentId.strip(), json.dumps(payload.answers),
            json.dumps(results), score, len(questions), timestamp))
        return {"id": aid, "studentName": payload.studentName, "studentId": payload.studentId,
                "answers": payload.answers, "results": results, "score": score, "maxMarks": len(questions), "submittedAt": timestamp}


@app.post("/api/student/mcq-attempts", status_code=201)
def student_mcq_attempt(payload: AttemptInput, request: Request):
    user = request.state.user
    result = grade_mcq_attempt(AttemptInput(studentName=user["displayName"], studentId=user["username"],
                                            answers=payload.answers))
    with db.connection() as conn:
        conn.execute("UPDATE mcq_attempts SET owner_user_id=? WHERE id=?", (user["id"], result["id"]))
    return result


@app.get("/api/student/mcq-attempts")
def student_mcq_history(request: Request):
    with db.connection() as conn:
        return [{"id": row["id"], "studentName": row["student_name"], "studentId": row["student_id"],
                 "answers": json.loads(row["answers"]), "results": json.loads(row["results"]),
                 "score": row["score"], "maxMarks": row["max_marks"], "submittedAt": row["submitted_at"]}
                for row in conn.execute("SELECT * FROM mcq_attempts WHERE owner_user_id=? ORDER BY submitted_at DESC, rowid DESC",
                                        (request.state.user["id"],))]


@app.get("/api/mcq-attempts")
def list_mcq_attempts():
    with db.connection() as conn:
        return [{"id": r["id"], "studentName": r["student_name"], "studentId": r["student_id"],
                 "answers": json.loads(r["answers"]), "results": json.loads(r["results"]),
                 "score": r["score"], "maxMarks": r["max_marks"], "submittedAt": r["submitted_at"]}
                for r in conn.execute("SELECT * FROM mcq_attempts ORDER BY submitted_at DESC, rowid DESC")]


@app.put("/api/submissions/{sid}/teacher-label")
def record_teacher_label(sid: str, payload: TeacherLabelInput):
    with db.connection() as conn:
        row = conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone()
        if not row:
            raise HTTPException(404, "Submission not found.")
        saved_grade = conn.execute("SELECT rubric_snapshot FROM grades WHERE submission_id=? ORDER BY graded_at DESC, rowid DESC LIMIT 1", (sid,)).fetchone()
        maximum = json.loads(saved_grade["rubric_snapshot"])["maxMarks"] if saved_grade and row["status"] == "graded" else submission_question(conn, row)["maxMarks"]
        if payload.mark > maximum:
            raise HTTPException(422, "Teacher mark exceeds the question maximum.")
        conn.execute("INSERT INTO teacher_labels VALUES (?,?,?) ON CONFLICT(submission_id) DO UPDATE SET mark=excluded.mark, recorded_at=excluded.recorded_at",
                     (sid, round(payload.mark, 2), now()))
        return {"submissionId": sid, "teacherMark": round(payload.mark, 2)}


@app.get("/api/evaluation")
def evaluation():
    with db.connection() as conn:
        labels = conn.execute("""SELECT l.mark, g.model_total FROM teacher_labels l
            JOIN submissions s ON s.id=l.submission_id
            JOIN grades g ON g.id=(SELECT id FROM grades WHERE submission_id=l.submission_id ORDER BY graded_at DESC, rowid DESC LIMIT 1)
            WHERE s.status='graded' AND g.answer_snapshot=s.ocr_transcript""").fetchall()
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
