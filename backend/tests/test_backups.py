import io
import json
import sqlite3
from pathlib import Path
from zipfile import ZipFile

import pytest
from PIL import Image

from backend import backups, db, grading
from backend.tests.test_workflows import client, create_question
from backend.tests.test_exams import create_exam, create_mcq, mock_one_mark, sign_in_admin, sign_in_student


def track_work_folders(monkeypatch, tmp_path):
    original = backups.tempfile.mkdtemp
    folders = []
    def create(*args, **kwargs):
        folder = Path(original(*args, **{**kwargs, "dir": tmp_path}))
        folders.append(folder)
        return str(folder)
    monkeypatch.setattr(backups.tempfile, "mkdtemp", create)
    return folders


def test_backup_preserves_records_images_and_accounts_and_can_be_restored(client, monkeypatch, tmp_path):
    question = create_question(client)
    mcq, _ = create_mcq(client)
    exam, _ = create_exam(client, question, mcq)
    student = sign_in_student(client)
    aid = client.post(f"/api/student/exams/{exam['id']}/attempts").json()["id"]
    image = io.BytesIO()
    Image.new("RGB", (40, 40), "white").save(image, "PNG")
    monkeypatch.setattr(grading, "transcribe", lambda _image: "Framing.")
    draft = client.post("/api/student/answers/draft", data={"question_id": question["id"], "exam_attempt_id": aid},
                        files=[("files", ("page.png", image.getvalue(), "image/png"))]).json()
    mock_one_mark(monkeypatch)
    assert client.post(f"/api/student/answers/{draft['id']}/grade", json={"text": "Framing."}).json()["score"] == 1
    assert client.post(f"/api/student/exam-attempts/{aid}/mcqs", json={"answers": {mcq['id']: 'B'}}).json()["score"] == 2
    sign_in_admin(client)
    assert client.put(f"/api/submissions/{draft['id']}/teacher-label", json={"mark": 1}).status_code == 200
    assert client.put(f"/api/submissions/{draft['id']}/override", json={"criterionId": "c1", "mark": 0.5, "note": "Teacher partial credit"}).status_code == 200
    (db.DATA_DIR / ".env").write_text("PRIVATE_TEST_SETTING=not-for-export")
    (db.UPLOAD_DIR / "unreferenced.txt").write_text("not-an-answer-page")
    (db.DATA_DIR / "research_metrics.json").write_text('{"heldOutRows": 0}')
    folders = track_work_folders(monkeypatch, tmp_path)
    original_image = backups.image_path
    def concurrent_edit(name):
        with db.connection() as conn:
            conn.execute("UPDATE questions SET title='Changed during backup' WHERE id=?", (question["id"],))
        return original_image(name)
    monkeypatch.setattr(backups, "image_path", concurrent_edit)
    response = client.get("/api/backup")
    assert response.status_code == 200, response.text[:100]
    assert response.headers["content-type"] == "application/zip" and response.headers["cache-control"] == "no-store"
    assert response.headers["content-disposition"].startswith("attachment;")
    assert folders and not any(folder.exists() for folder in folders)
    assert client.get("/api/auth/me").status_code == 200
    destination = tmp_path / "restored"
    with ZipFile(io.BytesIO(response.content)) as archive:
        names = set(archive.namelist())
        assert names == {"data/evaluation.sqlite3", f"data/uploads/{draft['id']}/0.png", "data/research_metrics.json", "manifest.json", "RESTORE.txt"}
        manifest = json.loads(archive.read("manifest.json"))
        assert manifest["recordCounts"]["users"] == 2 and manifest["recordCounts"]["grades"] == 1
        assert manifest["recordCounts"]["exam_attempts"] == 1 and manifest["imageFiles"] == 1
        assert manifest["activeSessionsIncluded"] is False
        assert archive.read(f"data/uploads/{draft['id']}/0.png").startswith(b"\x89PNG")
        assert "Stop the backend" in archive.read("RESTORE.txt").decode()
        archive.extractall(destination)
    with sqlite3.connect(destination / "data/evaluation.sqlite3") as restored:
        assert restored.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert restored.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0
        assert restored.execute("SELECT title FROM questions").fetchone()[0] == question["title"]
        assert restored.execute("SELECT owner_user_id FROM submissions").fetchone()[0] == student["user"]["id"]
        assert restored.execute("SELECT mark FROM teacher_labels").fetchone()[0] == 1
    monkeypatch.setattr(db, "DATA_DIR", destination / "data")
    monkeypatch.setattr(db, "DB_PATH", destination / "data/evaluation.sqlite3")
    monkeypatch.setattr(db, "UPLOAD_DIR", destination / "data/uploads")
    db.initialize()
    assert client.get("/api/auth/me").status_code == 401
    sign_in_admin(client)
    assert client.get("/api/questions").json()[0]["title"] == question["title"]
    assert client.get("/api/submissions").json()[0]["evaluatedTotalScore"] == 0.5
    login = client.post("/api/auth/login", json={"username": "exam-student", "password": "student-password"}).json()
    client.headers.update({"Authorization": f"Bearer {login['token']}"})
    assert client.get(f"/api/student/exam-attempts/{aid}").json()["score"] == 1.5
    assert client.get(f"/api/submissions/{draft['id']}/pages/0").status_code == 200


def test_backup_is_admin_only(client):
    sign_in_student(client)
    assert client.get("/api/backup").status_code == 403
    client.headers.clear()
    assert client.get("/api/backup").status_code == 401


def test_backup_reports_unavailable_temporary_storage(client, monkeypatch):
    def unavailable(**_kwargs):
        raise OSError("No space left")
    monkeypatch.setattr(backups.tempfile, "mkdtemp", unavailable)
    response = client.get("/api/backup")
    assert response.status_code == 503 and "Backup could not be completed" in response.json()["detail"]


@pytest.mark.parametrize("stored_name", ["missing/0.png", "../outside.txt", "/tmp/outside.txt", "folder\\outside.txt"])
def test_incomplete_or_unsafe_backup_fails_without_leaving_private_temp_files(client, monkeypatch, tmp_path, stored_name):
    question = create_question(client)
    submission = client.post("/api/submissions", data={"question_id": question["id"], "student_name": "Sam",
                                                     "student_id": "S1", "answer_text": "Framing."}).json()
    with db.connection() as conn:
        conn.execute("INSERT INTO submission_pages VALUES (?,?,?,?,?)", ("page-1", submission["id"], 0, "page.png", stored_name))
    folders = track_work_folders(monkeypatch, tmp_path)
    response = client.get("/api/backup")
    assert response.status_code == 503 and "Backup could not be completed" in response.json()["detail"]
    assert folders and not any(folder.exists() for folder in folders)


def test_backup_refuses_an_image_symlink_outside_uploads(client, monkeypatch, tmp_path):
    question = create_question(client)
    submission = client.post("/api/submissions", data={"question_id": question["id"], "student_name": "Sam",
                                                     "student_id": "S1", "answer_text": "Framing."}).json()
    outside = tmp_path / "outside.txt"
    outside.write_text("not-an-upload")
    (db.UPLOAD_DIR / "linked.png").symlink_to(outside)
    with db.connection() as conn:
        conn.execute("INSERT INTO submission_pages VALUES (?,?,?,?,?)", ("page-1", submission["id"], 0, "page.png", "linked.png"))
    folders = track_work_folders(monkeypatch, tmp_path)
    assert client.get("/api/backup").status_code == 503
    assert not any(folder.exists() for folder in folders)
