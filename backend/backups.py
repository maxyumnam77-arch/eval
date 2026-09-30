"""Consistent, local database backups with the uploaded pages they reference."""
import json
import shutil
import sqlite3
import tempfile
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from . import db

router = APIRouter(prefix="/api")
TABLES = ("questions", "rubric_criteria", "submissions", "submission_pages", "grades", "mcqs", "mcq_attempts", "teacher_labels", "users", "exams", "exam_attempts")
RESTORE = """Smart Exam Evaluation backup

This archive contains saved records, accounts, and uploaded answer images.
Browser-only answer drafts, local model weights, and .env settings are separate.
Active sign-in sessions are excluded. Keep this archive private.

To restore on your Mac:
1. Stop the backend and UI. Make a separate copy of your current data folder.
2. Extract this archive into a temporary folder.
3. Replace the project's data folder with the extracted data folder. If you use
   EVAL_DATA_DIR, replace that configured folder instead. Do not merge old images.
4. Keep your existing .env settings and local model installation.
5. Restart the backend and UI normally, then sign in again using the saved accounts.
6. Check questions, exam attempts, scores, and uploaded pages before removing the
   separate copy you made in step 1. manifest.json lists the backed-up record counts.
"""


def image_path(stored_name):
    relative = PurePosixPath(stored_name)
    if relative.is_absolute() or not relative.parts or ".." in relative.parts or "\\" in stored_name:
        raise ValueError("Invalid saved image path")
    path = (db.UPLOAD_DIR / Path(*relative.parts)).resolve()
    path.relative_to(db.UPLOAD_DIR.resolve())
    if not path.is_file():
        raise ValueError("Missing saved image")
    return path, "data/uploads/" + relative.as_posix()


@router.get("/backup")
def download_backup():
    folder = None
    try:
        folder = Path(tempfile.mkdtemp(prefix="smart-exam-backup-"))
        snapshot = folder / "evaluation.sqlite3"
        with db.connection() as source:
            with closing(sqlite3.connect(snapshot)) as target:
                source.backup(target)
        with closing(sqlite3.connect(snapshot)) as frozen:
            frozen.execute("DELETE FROM sessions")
            frozen.commit()
            if frozen.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise ValueError("Invalid database snapshot")
            counts = {table: frozen.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in TABLES}
            pages = [row[0] for row in frozen.execute("SELECT stored_name FROM submission_pages ORDER BY submission_id, position")]
        created = datetime.now(timezone.utc)
        archive = folder / "backup.zip"
        with ZipFile(archive, "w", ZIP_DEFLATED, compresslevel=6) as output:
            output.write(snapshot, "data/evaluation.sqlite3")
            for name in dict.fromkeys(pages):
                path, destination = image_path(name)
                output.write(path, destination)
            for name in ("research_baseline.joblib", "research_metrics.json"):
                path = db.DATA_DIR / name
                if path.is_file():
                    if path.resolve().parent != db.DATA_DIR.resolve():
                        raise ValueError("Invalid research file path")
                    output.write(path, "data/" + name)
            output.writestr("manifest.json", json.dumps({"format": "smart-exam-evaluation-backup", "version": 1,
                "createdAt": created.isoformat(), "database": "data/evaluation.sqlite3", "recordCounts": counts,
                "imageFiles": len(set(pages)), "activeSessionsIncluded": False}, indent=2))
            output.writestr("RESTORE.txt", RESTORE)
        return FileResponse(archive, media_type="application/zip", filename=f"smart-exam-backup-{created:%Y%m%dT%H%M%SZ}.zip",
                            headers={"Cache-Control": "no-store"}, background=BackgroundTask(shutil.rmtree, folder, ignore_errors=True))
    except (OSError, ValueError, TypeError, RuntimeError, sqlite3.Error) as exc:
        if folder:
            shutil.rmtree(folder, ignore_errors=True)
        raise HTTPException(503, "Backup could not be completed. Check that the saved database and every uploaded image are available, then retry.") from exc
