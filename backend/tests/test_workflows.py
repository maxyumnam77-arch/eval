import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend import db, grading
from backend.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DATA_DIR", tmp_path)
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.sqlite3")
    monkeypatch.setattr(db, "UPLOAD_DIR", tmp_path / "uploads")
    with TestClient(app) as test_client:
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
