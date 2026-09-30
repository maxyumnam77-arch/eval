import io
import json

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend import auth, db, grading
from backend.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DATA_DIR", tmp_path)
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.sqlite3")
    monkeypatch.setattr(db, "UPLOAD_DIR", tmp_path / "uploads")
    with TestClient(app) as test_client:
        auth.create_user("instructor", "Instructor", "test-password", role="admin")
        test_client.headers.update({"Authorization": f"Bearer {auth.login('instructor', 'test-password')['token']}"})
        yield test_client


def question_payload(approved=True):
    return {"code": "Q1", "title": "Five functions", "prompt": "Name five functions.",
            "subject": "Networking", "classGrade": "Year 2", "maxMarks": 5,
            "referenceAnswer": "Framing, addressing, error detection, flow control, media access.",
            "rubricApproved": approved,
            "criteria": [{"id": f"c{i}", "title": name, "description": name, "maxMark": 1}
                         for i, name in enumerate(["Framing", "Addressing", "Errors", "Flow", "Access"], 1)]}


def create_question(client, approved=True):
    response = client.post("/api/questions", json=question_payload(approved))
    assert response.status_code == 201, response.text
    return response.json()


def test_weighted_marks_and_approval(client):
    invalid = question_payload()
    invalid["maxMarks"] = 4
    assert client.post("/api/questions", json=invalid).status_code == 422
    question = create_question(client, approved=False)
    answer = "Framing, addressing, error detection, flow control, media access."
    response = client.post("/api/submissions", data={"question_id": question["id"], "student_name": "Sam",
                                                       "student_id": "S1", "answer_text": answer})
    sid = response.json()["id"]
    assert client.post(f"/api/submissions/{sid}/grade").status_code == 409
    payload = question_payload(approved=True)
    assert client.put(f"/api/questions/{question['id']}", json=payload).json()["rubricVersion"] == 2


def test_full_credit_is_five_of_five_with_real_evidence(client, monkeypatch):
    question = create_question(client)
    answer = "Framing, addressing, error detection, flow control, media access."
    submission = client.post("/api/submissions", data={"question_id": question["id"], "student_name": "Sam",
                                                      "student_id": "S1", "answer_text": answer}).json()
    parts = ["Framing", "addressing", "error detection", "flow control", "media access"]
    monkeypatch.setattr(grading, "_chat", lambda *_args, **_kwargs: __import__("json").dumps({
        "criteria": [{"id": f"c{i}", "mark": 1, "evidence": text, "reason": "Correct"}
                     for i, text in enumerate(parts, 1)], "feedback": "All five covered."}))
    result = client.post(f"/api/submissions/{submission['id']}/grade")
    assert result.status_code == 200, result.text
    assert result.json()["evaluatedTotalScore"] == 5
    assert result.json()["reviewFlags"] == []
    assert client.get("/api/submissions").json()[0]["evaluatedTotalScore"] == 5
    override = client.put(f"/api/submissions/{submission['id']}/override", json={
        "criterionId": "c5", "mark": 0.5, "note": "Teacher adjustment"})
    assert override.json()["evaluatedTotalScore"] == 4.5
    assert override.json()["modelTotal"] == 5


def test_student_submits_and_gets_automatic_grade(client, monkeypatch):
    draft = create_question(client, approved=False)
    assert client.get("/api/student/questions").json() == []
    assert client.post("/api/student/answers", data={"question_id": draft["id"], "student_name": "Sam",
        "student_id": "S1", "answer_text": "Framing."}).status_code == 409
    approved = question_payload(approved=True)
    assert client.put(f"/api/questions/{draft['id']}", json=approved).status_code == 200
    public = client.get("/api/student/questions").json()
    assert len(public) == 1 and "referenceAnswer" not in public[0]
    monkeypatch.setattr(grading, "_chat", lambda *_args, **_kwargs: __import__("json").dumps({
        "criteria": [{"id": "c1", "mark": 1, "evidence": "Framing", "reason": "Correct"}],
        "feedback": "One function given."}))
    response = client.post("/api/student/answers", data={"question_id": draft["id"],
        "student_name": "Sam", "student_id": "S1", "answer_text": "Framing."})
    assert response.status_code == 201, response.text
    result = response.json()
    assert result["status"] == "graded" and result["score"] == 1
    assert result["maxMarks"] == 5 and result["criteria"][0]["evidence"] == "Framing"
    assert "referenceAnswer" not in result


def test_hallucinated_evidence_cannot_earn_mark():
    scores, flags = grading.validate_grade({"criteria": [
        {"id": "c1", "mark": 1, "evidence": "invented phrase", "reason": "Claim"}]},
        [{"id": "c1", "title": "Framing", "maxMark": 1}], "The answer mentions framing.")
    assert scores[0]["mark"] == 0
    assert flags


def test_image_upload_and_transcript_review(client):
    question = create_question(client)
    image = Image.new("RGB", (40, 40), "white")
    data = io.BytesIO()
    image.save(data, "PNG")
    created = client.post("/api/submissions", data={"question_id": question["id"], "student_name": "Sam",
                                                     "student_id": "S2", "ocr_mode": "manual"},
                          files=[("files", ("page.png", data.getvalue(), "image/png"))])
    assert created.status_code == 201, created.text
    sid = created.json()["id"]
    assert created.json()["pages"][0]["position"] == 0
    assert client.get(f"/api/submissions/{sid}/pages/0").status_code == 200
    assert client.post(f"/api/submissions/{sid}/grade").status_code == 422
    edited = client.put(f"/api/submissions/{sid}/transcript", json={"text": "Framing."})
    assert edited.json()["ocrTranscript"] == "Framing."


def test_mcq_exact_match_and_wrong_blank(client):
    for code, key in [("M1", "B"), ("M2", "A"), ("M3", "C")]:
        assert client.post("/api/mcqs", json={"code": code, "question": code, "subject": "General",
                "correctKey": key, "options": [{"key": "A", "text": "A"}, {"key": "B", "text": "B"},
                                               {"key": "C", "text": "C"}]}).status_code == 201
    ids = [q["id"] for q in client.get("/api/mcqs").json()]
    result = client.post("/api/mcq-attempts", json={"studentName": "Sam", "studentId": "S3",
        "answers": {ids[0]: "B", ids[1]: "B", ids[2]: ""}})
    assert result.status_code == 201
    assert [r["awarded"] for r in result.json()["results"]] == [1, 0, 0]
    assert result.json()["score"] == 1


def test_model_failure_does_not_save_a_grade(client, monkeypatch):
    question = create_question(client)
    sub = client.post("/api/submissions", data={"question_id": question["id"], "student_name": "Sam",
                                                "student_id": "S4", "answer_text": "Framing."}).json()
    def unavailable(*_args, **_kwargs):
        raise grading.ModelUnavailable("Local model is offline")
    monkeypatch.setattr(grading, "_chat", unavailable)
    response = client.post(f"/api/submissions/{sub['id']}/grade")
    assert response.status_code == 503
    assert client.get("/api/submissions").json()[0]["status"] == "pending"


def test_teacher_label_and_rubric_history(client, monkeypatch):
    question = create_question(client)
    sub = client.post("/api/submissions", data={"question_id": question["id"], "student_name": "Sam",
                                                "student_id": "S5", "answer_text": "Framing."}).json()
    assert client.put(f"/api/submissions/{sub['id']}/teacher-label", json={"mark": 3}).status_code == 200
    monkeypatch.setattr(grading, "_chat", lambda *_args, **_kwargs: __import__("json").dumps({
        "criteria": [{"id": "c1", "mark": 1, "evidence": "Framing", "reason": "Correct"}]}))
    scored = client.post(f"/api/submissions/{sub['id']}/grade").json()
    assert scored["evaluatedTotalScore"] == 1
    assert scored["reviewFlags"]
    assert client.get("/api/evaluation").json()["mae"] == 2
    revised = question_payload()
    revised["title"] = "Updated title"
    revised["rubricApproved"] = False
    assert client.put(f"/api/questions/{question['id']}", json=revised).status_code == 200
    saved = client.get("/api/submissions").json()[0]
    assert saved["rubricSnapshot"]["title"] == "Five functions"
    assert saved["questionVersion"] == 1


def test_student_access_ocr_review_history_and_mcq_scan(client, monkeypatch):
    question = create_question(client)
    mcq = client.post("/api/mcqs", json={"code": "M1", "question": "Which?", "subject": "General",
        "correctKey": "B", "options": [{"key": "A", "text": "A"}, {"key": "B", "text": "B"}]}).json()
    student = client.post("/api/auth/register", json={"username": "student01", "displayName": "Sam",
        "password": "student-pass-1"}).json()
    client.headers.update({"Authorization": f"Bearer {student['token']}"})
    assert client.get("/api/questions").status_code == 403
    assert client.get("/api/submissions").status_code == 403
    assert "referenceAnswer" not in client.get("/api/student/questions").json()[0]
    assert "correctKey" not in client.get("/api/student/mcqs").json()[0]
    monkeypatch.setattr(grading, "transcribe", lambda _image: "Fram1ng.")
    image = io.BytesIO()
    Image.new("RGB", (40, 40), "white").save(image, "PNG")
    draft = client.post("/api/student/answers/draft", data={"question_id": question["id"]},
        files=[("files", ("page.png", image.getvalue(), "image/png"))])
    assert draft.status_code == 201 and draft.json()["status"] == "pending"
    assert draft.json()["transcript"] == "Fram1ng."
    sid = draft.json()["id"]
    assert client.get(f"/api/submissions/{sid}/pages/0").status_code == 200
    monkeypatch.setattr(grading, "_chat", lambda *_args, **_kwargs: __import__("json").dumps({
        "criteria": [{"id": "c1", "mark": 1, "evidence": "Framing", "reason": "Correct"}]}))
    result = client.post(f"/api/student/answers/{sid}/grade", json={"text": "Framing."})
    assert result.status_code == 200 and result.json()["score"] == 1
    assert client.get("/api/student/answers").json()[0]["transcript"] == "Framing."
    assert client.get("/api/student/answers").json()[0]["id"] == sid
    assert client.post(f"/api/student/answers/{sid}/grade", json={"text": "Different."}).status_code == 409
    monkeypatch.setattr(grading, "detect_mcq_choices", lambda _image, _codes: ({"M1": "B"}, []))
    scan = client.post("/api/student/mcqs/scan", files={"file": ("sheet.png", image.getvalue(), "image/png")})
    assert scan.json()["answers"] == {mcq["id"]: "B"}
    attempt = client.post("/api/student/mcq-attempts", json={"studentName": "Other", "studentId": "Other",
        "answers": {mcq["id"]: scan.json()["answers"][mcq["id"]]}})
    assert attempt.json()["score"] == 1 and attempt.json()["studentId"] == "student01"
    assert len(client.get("/api/student/mcq-attempts").json()) == 1
    second = client.post("/api/auth/register", json={"username": "student02", "displayName": "Lee",
        "password": "student-pass-2"}).json()
    client.headers.update({"Authorization": f"Bearer {second['token']}"})
    assert client.get("/api/student/answers").json() == []
    assert client.get(f"/api/submissions/{sid}/pages/0").status_code == 404


@pytest.mark.parametrize("change", [
    {"title": "   "}, {"referenceAnswer": "\n "}, {"maxMarks": 5.001},
    {"criteria": [{"title": "Point", "description": "Point", "maxMark": 5.004}]},
])
def test_question_rejects_blank_fields_and_rounding_loss(client, change):
    assert client.post("/api/questions", json={**question_payload(), **change}).status_code == 422
    assert client.get("/api/questions").json() == []


def test_mcq_rejects_invalid_options_and_stale_attempts(client):
    payload = {"code": "M1", "question": "Which?", "correctKey": "A",
               "options": [{"key": "A", "text": "First"}, {"key": "B", "text": "Second"}]}
    for invalid in [[{"key": {}, "text": "Wrong"}],
                    [{"key": "A", "text": "First"}, {"key": "E", "text": "Wrong"}],
                    [{"key": "A", "text": None}, {"key": "B", "text": "Second"}]]:
        assert client.post("/api/mcqs", json={**payload, "options": invalid}).status_code == 422
    question = client.post("/api/mcqs", json=payload).json()
    attempt = {"studentName": "Sam", "studentId": "S1", "answers": {question["id"]: "C"}}
    assert client.post("/api/mcq-attempts", json=attempt).status_code == 422
    attempt["answers"] = {"deleted-question": "A"}
    assert client.post("/api/mcq-attempts", json=attempt).status_code == 409
    attempt["answers"] = {question["id"]: "E"}
    assert client.post("/api/mcq-attempts", json=attempt).status_code == 422
    assert client.get("/api/mcq-attempts").json() == []


def test_uncertain_scan_and_duplicate_criteria_cannot_earn_credit(monkeypatch):
    monkeypatch.setattr(grading, "_chat", lambda *_a, **_kw: json.dumps({
        "answers": {"M1": "B"}, "uncertain": ["M1"]}))
    answers, uncertain = grading.detect_mcq_choices(b"image", ["M1", "M2"])
    assert answers == {"M1": "", "M2": ""} and uncertain == ["M1", "M2"]
    score = {"id": "c1", "mark": 1, "evidence": "Framing"}
    scores, flags = grading.validate_grade({"criteria": [score, score]},
        [{"id": "c1", "title": "Framing", "maxMark": 1}], "Framing.")
    assert scores[0]["mark"] == 0 and flags


def test_typed_failure_can_retry_same_saved_attempt(client, monkeypatch):
    question = create_question(client)
    student = client.post("/api/auth/register", json={"username": "retry-student", "displayName": "Sam",
        "password": "student-password"}).json()
    client.headers.update({"Authorization": f"Bearer {student['token']}"})
    def offline(*_args, **_kwargs):
        raise grading.ModelUnavailable("Local model is offline")
    monkeypatch.setattr(grading, "_chat", offline)
    pending = client.post("/api/student/answers", data={"question_id": question["id"], "answer_text": "Framing."}).json()
    assert pending["status"] == "pending" and "offline" in pending["message"]
    monkeypatch.setattr(grading, "_chat", lambda *_a, **_kw: json.dumps({
        "criteria": [{"id": "c1", "mark": 1, "evidence": "Framing"}]}))
    retried = client.post(f"/api/student/answers/{pending['id']}/grade", json={"text": "Framing."})
    assert retried.json()["status"] == "graded" and retried.json()["id"] == pending["id"]
    assert len(client.get("/api/student/answers").json()) == 1


def test_changed_answer_during_model_call_does_not_save_stale_grade(client, monkeypatch):
    question = create_question(client)
    submission = client.post("/api/submissions", data={"question_id": question["id"],
        "student_name": "Sam", "student_id": "S1", "answer_text": "Framing."}).json()
    def changed(*_args, **_kwargs):
        with db.connection() as conn:
            conn.execute("UPDATE submissions SET ocr_transcript='New answer' WHERE id=?", (submission["id"],))
        return json.dumps({"criteria": [{"id": "c1", "mark": 1, "evidence": "Framing"}]})
    monkeypatch.setattr(grading, "_chat", changed)
    assert client.post(f"/api/submissions/{submission['id']}/grade").status_code == 409
    with db.connection() as conn:
        assert conn.execute("SELECT COUNT(*) FROM grades").fetchone()[0] == 0


def test_teacher_label_uses_saved_rubric_maximum(client, monkeypatch):
    question = create_question(client)
    submission = client.post("/api/submissions", data={"question_id": question["id"],
        "student_name": "Sam", "student_id": "S1", "answer_text": "Framing."}).json()
    monkeypatch.setattr(grading, "_chat", lambda *_a, **_kw: json.dumps({
        "criteria": [{"id": "c1", "mark": 1, "evidence": "Framing"}]}))
    assert client.post(f"/api/submissions/{submission['id']}/grade").status_code == 200
    revised = question_payload()
    revised["maxMarks"] = 10
    for criterion in revised["criteria"]:
        criterion["maxMark"] = 2
    assert client.put(f"/api/questions/{question['id']}", json=revised).status_code == 200
    assert client.put(f"/api/submissions/{submission['id']}/teacher-label", json={"mark": 6}).status_code == 422
    assert client.put(f"/api/submissions/{submission['id']}/teacher-label", json={"mark": 5}).status_code == 200


def test_logout_revokes_session_and_cors_preflight_works(client):
    preflight = client.options("/api/questions", headers={"Origin": "http://127.0.0.1:3000",
        "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization"})
    assert preflight.status_code == 200
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/student/answers").status_code == 401


def test_changed_transcript_invalidates_teacher_label(client, monkeypatch):
    question = create_question(client)
    submission = client.post("/api/submissions", data={"question_id": question["id"],
        "student_name": "Sam", "student_id": "S1", "answer_text": "Framing."}).json()
    monkeypatch.setattr(grading, "_chat", lambda *_a, **_kw: json.dumps({
        "criteria": [{"id": "c1", "mark": 1, "evidence": "Framing"}]}))
    assert client.post(f"/api/submissions/{submission['id']}/grade").status_code == 200
    assert client.put(f"/api/submissions/{submission['id']}/teacher-label", json={"mark": 1}).status_code == 200
    assert client.get("/api/submissions").json()[0]["teacherLabel"] == 1
    changed = client.put(f"/api/submissions/{submission['id']}/transcript", json={"text": "Addressing."}).json()
    assert changed["teacherLabel"] is None and changed["status"] == "pending"
    assert client.get("/api/evaluation").json()["samples"] == 0


def test_dotenv_config_is_loaded_before_model_and_database(tmp_path):
    import os
    import shutil
    import subprocess
    import sys
    from pathlib import Path
    source = Path(__file__).parents[1]
    package = tmp_path / "backend"
    package.mkdir()
    for name in ["__init__.py", "db.py", "grading.py"]:
        shutil.copy(source / name, package / name)
    (tmp_path / ".env").write_text("EVAL_MODEL=local-test-model\nEVAL_PROVIDER=mlx\nEVAL_DATA_DIR=./records\n")
    env = {key: value for key, value in os.environ.items() if not key.startswith("EVAL_")}
    result = subprocess.run([sys.executable, "-c", "from backend import db, grading; print(grading.MODEL, grading.PROVIDER, db.DATA_DIR.name)"],
                            cwd=tmp_path, env=env, text=True, capture_output=True, check=True)
    assert result.stdout.strip() == "local-test-model mlx records"
    env["EVAL_MODEL"] = "exported-model"
    result = subprocess.run([sys.executable, "-c", "from backend import grading; print(grading.MODEL)"],
                            cwd=tmp_path, env=env, text=True, capture_output=True, check=True)
    assert result.stdout.strip() == "exported-model"
