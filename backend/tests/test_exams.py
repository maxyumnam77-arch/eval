import importlib.util
import io
import json
import sqlite3

from PIL import Image

from backend import auth, db, grading
from backend.tests.test_workflows import client, create_question, question_payload


def create_mcq(client, code="M1"):
    payload = {"code": code, "subject": "Networking", "question": "Which function?", "correctKey": "B",
               "options": [{"key": "A", "text": "First"}, {"key": "B", "text": "Second"}], "explanation": "Teacher key"}
    response = client.post("/api/mcqs", json=payload)
    assert response.status_code == 201, response.text
    return response.json(), payload


def create_exam(client, question, mcq=None, published=True):
    payload = {"title": "Networking exam", "description": "Answer every question.", "published": published,
               "items": [{"kind": "descriptive", "questionId": question["id"]}]}
    if mcq:
        payload["items"].append({"kind": "mcq", "questionId": mcq["id"]})
    response = client.post("/api/exams", json=payload)
    assert response.status_code == 201, response.text
    return response.json(), payload


def sign_in_student(client, username="exam-student"):
    student = client.post("/api/auth/register", json={"username": username, "displayName": "Sam",
                          "password": "student-password"}).json()
    client.headers.update({"Authorization": f"Bearer {student['token']}"})
    return student


def sign_in_admin(client):
    token = auth.login("instructor", "test-password")["token"]
    client.headers.update({"Authorization": f"Bearer {token}"})


def mock_one_mark(monkeypatch):
    monkeypatch.setattr(grading, "_chat", lambda *_a, **_kw: json.dumps({
        "criteria": [{"id": "c1", "mark": 1, "evidence": "Framing", "reason": "Correct"}], "feedback": "One point."}))


def test_publish_validation_and_admin_only_management(client):
    question = create_question(client, approved=False)
    exam, payload = create_exam(client, question, published=False)
    assert client.get("/api/student/exams").json() == []
    assert client.put(f"/api/exams/{exam['id']}", json={**payload, "published": True}).status_code == 409
    for items in [[], payload["items"] * 2, [{"kind": "mcq", "questionId": "missing"}]]:
        assert client.post("/api/exams", json={**payload, "items": items}).status_code == 422
    assert client.post("/api/exams", json={**payload, "title": "  "}).status_code == 422
    sign_in_student(client)
    for method, path in [("GET", "/api/exams"), ("POST", "/api/exams"), ("GET", "/api/exam-attempts")]:
        assert client.request(method, path, json=payload if method == "POST" else None).status_code == 403
    assert client.post(f"/api/student/exams/{exam['id']}/attempts").status_code == 404


def test_combined_exam_uses_frozen_questions_and_hides_keys(client, monkeypatch):
    question = create_question(client)
    mcq, mcq_payload = create_mcq(client)
    exam, payload = create_exam(client, question, mcq)
    student = sign_in_student(client)
    public = client.get("/api/student/exams").json()[0]
    assert not any(field in json.dumps(public) for field in ["referenceAnswer", "correctKey", "criteria", "explanation"])
    started = client.post(f"/api/student/exams/{exam['id']}/attempts").json()
    aid = started["id"]
    assert started["score"] is None and started["maxMarks"] == 6 and started["completedQuestions"] == 0
    assert "correctKey" not in json.dumps(started)

    sign_in_admin(client)
    revised = question_payload(approved=False)
    revised.update({"title": "New question title", "referenceAnswer": "New reference", "maxMarks": 10})
    for criterion in revised["criteria"]:
        criterion["maxMark"] = 2
    assert client.put(f"/api/questions/{question['id']}", json=revised).status_code == 200
    assert client.put(f"/api/mcqs/{mcq['id']}", json={**mcq_payload, "correctKey": "A"}).status_code == 200
    assert client.put(f"/api/exams/{exam['id']}", json={**payload, "title": "New exam title", "published": False}).json()["version"] == 2
    client.headers.update({"Authorization": f"Bearer {student['token']}"})
    assert client.get("/api/student/questions").json() == []
    seen = []
    def grade(_system, user, **_kwargs):
        seen.append(json.loads(user))
        return json.dumps({"criteria": [{"id": "c1", "mark": 1, "evidence": "Framing"}]})
    monkeypatch.setattr(grading, "_chat", grade)
    answer = client.post("/api/student/answers", data={"question_id": question["id"], "exam_attempt_id": aid,
                         "answer_text": "Framing."})
    assert answer.status_code == 201, answer.text
    assert answer.json()["score"] == 1 and answer.json()["maxMarks"] == 5
    assert answer.json()["questionTitle"] == "Five functions"
    assert "referenceAnswer" not in answer.text
    assert seen[0]["referenceAnswer"] == question["referenceAnswer"]
    partial = client.get(f"/api/student/exam-attempts/{aid}").json()
    assert partial["score"] is None and partial["earnedMarks"] == 1 and partial["completedQuestions"] == 1
    scored = client.post(f"/api/student/exam-attempts/{aid}/mcqs", json={"answers": {mcq["id"]: "B"}}).json()
    assert scored["status"] == "completed" and scored["score"] == 2 and scored["maxMarks"] == 6
    assert scored["title"] == "Networking exam" and scored["version"] == 1
    assert scored["items"][1]["correctKey"] == "B"
    assert client.post(f"/api/student/exam-attempts/{aid}/mcqs", json={"answers": {}}).status_code == 409


def test_exam_ownership_question_membership_and_filtered_history(client, monkeypatch):
    question = create_question(client)
    other_payload = {**question_payload(), "code": "Q2", "criteria": [{**c, "id": "other-" + c["id"]} for c in question_payload()["criteria"]]}
    other = client.post("/api/questions", json=other_payload).json()
    mcq, _ = create_mcq(client)
    exam, _ = create_exam(client, question, mcq)
    first = sign_in_student(client)
    aid = client.post(f"/api/student/exams/{exam['id']}/attempts").json()["id"]
    assert client.post("/api/student/answers", data={"question_id": other["id"], "exam_attempt_id": aid, "answer_text": "Framing."}).status_code == 422
    assert client.post(f"/api/student/exam-attempts/{aid}/mcqs", json={"answers": {"outside": "A"}}).status_code == 422
    assert client.post(f"/api/student/exam-attempts/{aid}/mcqs", json={"answers": {mcq["id"]: "C"}}).status_code == 422
    mock_one_mark(monkeypatch)
    saved = client.post("/api/student/answers", data={"question_id": question["id"], "exam_attempt_id": aid, "answer_text": "Framing."}).json()
    client.post("/api/student/answers", data={"question_id": question["id"], "answer_text": "Framing."})
    assert [r["id"] for r in client.get(f"/api/student/answers?exam_attempt_id={aid}").json()] == [saved["id"]]
    sign_in_student(client, "another-student")
    assert client.get("/api/student/exam-attempts").json() == []
    assert client.get(f"/api/student/exam-attempts/{aid}").status_code == 404
    assert client.get(f"/api/student/answers?exam_attempt_id={aid}").status_code == 404
    assert client.post("/api/student/answers", data={"question_id": question["id"], "exam_attempt_id": aid, "answer_text": "Framing."}).status_code == 404
    assert client.post(f"/api/student/exam-attempts/{aid}/mcqs", json={"answers": {}}).status_code == 404
    summary = client.get("/api/student/performance").json()
    assert summary["gradedAnswers"] == 0 and summary["subjects"] == []
    assert first["user"]["id"] != client.get("/api/auth/me").json()["id"]


def test_exam_ocr_retry_and_latest_submission_count(client, monkeypatch):
    question = create_question(client)
    exam, _ = create_exam(client, question)
    sign_in_student(client)
    aid = client.post(f"/api/student/exams/{exam['id']}/attempts").json()["id"]
    image = io.BytesIO()
    Image.new("RGB", (40, 40), "white").save(image, "PNG")
    monkeypatch.setattr(grading, "transcribe", lambda _image: "Fram1ng.")
    draft = client.post("/api/student/answers/draft", data={"question_id": question["id"], "exam_attempt_id": aid},
                        files=[("files", ("page.png", image.getvalue(), "image/png"))]).json()
    assert draft["examAttemptId"] == aid and draft["transcript"] == "Fram1ng."
    def offline(*_args, **_kwargs):
        raise grading.ModelUnavailable("Local model is offline")
    monkeypatch.setattr(grading, "_chat", offline)
    pending = client.post(f"/api/student/answers/{draft['id']}/grade", json={"text": "Framing."}).json()
    assert pending["status"] == "pending"
    assert client.get(f"/api/student/exam-attempts/{aid}").json()["score"] is None
    mock_one_mark(monkeypatch)
    assert client.post(f"/api/student/answers/{draft['id']}/grade", json={"text": "Framing."}).json()["score"] == 1
    assert client.get(f"/api/student/exam-attempts/{aid}").json()["score"] == 1
    monkeypatch.setattr(grading, "_chat", offline)
    newer = client.post("/api/student/answers", data={"question_id": question["id"], "exam_attempt_id": aid, "answer_text": "Framing."}).json()
    attempt = client.get(f"/api/student/exam-attempts/{aid}").json()
    assert attempt["score"] is None and attempt["items"][0]["submissionId"] == newer["id"]
    mock_one_mark(monkeypatch)
    client.post(f"/api/student/answers/{newer['id']}/grade", json={"text": "Framing."})
    assert client.get(f"/api/student/exam-attempts/{aid}").json()["score"] == 1


def test_pending_exam_label_and_delete_guards_use_snapshot(client, monkeypatch):
    question = create_question(client)
    mcq, _ = create_mcq(client)
    exam, payload = create_exam(client, question, mcq)
    student = sign_in_student(client)
    aid = client.post(f"/api/student/exams/{exam['id']}/attempts").json()["id"]
    sign_in_admin(client)
    assert client.put(f"/api/exams/{exam['id']}", json={**payload, "items": [payload["items"][1]]}).status_code == 200
    assert client.delete(f"/api/questions/{question['id']}").status_code == 409
    assert client.delete(f"/api/mcqs/{mcq['id']}").status_code == 409
    assert client.delete(f"/api/exams/{exam['id']}").status_code == 409
    def offline(*_args, **_kwargs):
        raise grading.ModelUnavailable("Local model is offline")
    monkeypatch.setattr(grading, "_chat", offline)
    client.headers.update({"Authorization": f"Bearer {student['token']}"})
    response = client.post("/api/student/answers", data={"question_id": question["id"], "exam_attempt_id": aid, "answer_text": "Framing."})
    assert response.status_code == 201, response.text
    saved = response.json()
    sign_in_admin(client)
    smaller = question_payload(approved=False)
    smaller["maxMarks"] = 1
    smaller["referenceAnswer"] = "Changed reference"
    for criterion in smaller["criteria"]:
        criterion["maxMark"] = 0.2
    client.put(f"/api/questions/{question['id']}", json=smaller)
    assert client.get("/api/submissions").json()[0]["rubricSnapshot"]["maxMarks"] == 5
    assert client.put(f"/api/submissions/{saved['id']}/teacher-label", json={"mark": 5}).status_code == 200
    assert client.put(f"/api/submissions/{saved['id']}/teacher-label", json={"mark": 6}).status_code == 422
    # Optional research dependencies are not required by the app's normal test suite.
    if importlib.util.find_spec("sklearn"):
        from backend.train_baseline import load_labelled_answers
        labelled = load_labelled_answers()
        assert labelled[0]["max_marks"] == 5 and labelled[0]["reference_answer"] == question["referenceAnswer"]
    mock_one_mark(monkeypatch)
    assert client.post(f"/api/submissions/{saved['id']}/grade").status_code == 200


def test_performance_uses_latest_results_overrides_and_exam_mcqs(client, monkeypatch):
    question = create_question(client)
    mcq, _ = create_mcq(client)
    exam, _ = create_exam(client, question, mcq)
    student = sign_in_student(client)
    mock_one_mark(monkeypatch)
    first = client.post("/api/student/answers", data={"question_id": question["id"], "answer_text": "Framing."}).json()
    newest = client.post("/api/student/answers", data={"question_id": question["id"], "answer_text": "Framing."}).json()
    client.post("/api/student/mcq-attempts", json={"studentName": "Ignored", "studentId": "Ignored", "answers": {mcq["id"]: "A"}})
    aid = client.post(f"/api/student/exams/{exam['id']}/attempts").json()["id"]
    client.post(f"/api/student/exam-attempts/{aid}/mcqs", json={"answers": {mcq["id"]: "B"}})
    sign_in_admin(client)
    client.put(f"/api/submissions/{newest['id']}/override", json={"criterionId": "c1", "mark": 0.5, "note": "Partial"})
    client.headers.update({"Authorization": f"Bearer {student['token']}"})
    summary = client.get("/api/student/performance").json()
    assert summary["gradedAnswers"] == 2 and summary["mcqAttempts"] == 2 and summary["completedExams"] == 0
    assert summary["subjects"] == [{"subject": "Networking", "score": 1.5, "maxMarks": 6, "questions": 2, "percent": 25}]
    assert summary["latestAveragePercent"] == 25
    assert summary["recentResults"][0]["id"] == newest["id"]
    assert summary["recentResults"][1]["id"] == first["id"]
    assert any(item["title"] == "Framing" and item["score"] == 0.5 for item in summary["practiceAreas"])
    # A later practice attempt replaces the exam MCQ in the latest-per-question summary.
    client.post("/api/student/mcq-attempts", json={"studentName": "Ignored", "studentId": "Ignored", "answers": {mcq["id"]: "A"}})
    assert client.get("/api/student/performance").json()["subjects"][0]["score"] == 0.5
    # Blank MCQs complete their question with zero rather than leaving the attempt pending.
    second_aid = client.post(f"/api/student/exams/{exam['id']}/attempts").json()["id"]
    blank = client.post(f"/api/student/exam-attempts/{second_aid}/mcqs", json={"answers": {}}).json()
    assert blank["items"][1]["status"] == "graded" and blank["items"][1]["score"] == 0


def test_existing_database_migration_preserves_records(tmp_path, monkeypatch):
    path = tmp_path / "legacy.sqlite3"
    with sqlite3.connect(path) as conn:
        conn.executescript("""
            CREATE TABLE submissions (id TEXT PRIMARY KEY, question_id TEXT, student_name TEXT, student_id TEXT,
                file_name TEXT, submitted_at TEXT, ocr_original TEXT, ocr_transcript TEXT, ocr_engine TEXT,
                ocr_error TEXT, status TEXT, owner_user_id TEXT);
            INSERT INTO submissions VALUES ('old','q','Sam','S1','','2026-01-01','','Framing.','typed','','pending','owner');
        """)
    monkeypatch.setattr(db, "DATA_DIR", tmp_path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "UPLOAD_DIR", tmp_path / "uploads")
    db.initialize()
    db.initialize()
    with db.connection() as conn:
        old = conn.execute("SELECT * FROM submissions WHERE id='old'").fetchone()
        assert old["ocr_transcript"] == "Framing." and old["owner_user_id"] == "owner" and old["exam_attempt_id"] is None
        assert conn.execute("SELECT COUNT(*) FROM exams").fetchone()[0] == 0
