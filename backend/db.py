import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DATA_DIR = Path(os.getenv("EVAL_DATA_DIR", Path(__file__).resolve().parent.parent / "data")).resolve()
DB_PATH = DATA_DIR / "evaluation.sqlite3"
UPLOAD_DIR = DATA_DIR / "uploads"


def initialize():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with connection() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
                prompt TEXT NOT NULL, max_marks REAL NOT NULL CHECK(max_marks > 0),
                subject TEXT NOT NULL, class_grade TEXT NOT NULL,
                reference_answer TEXT NOT NULL, rubric_approved INTEGER NOT NULL DEFAULT 0,
                rubric_version INTEGER NOT NULL DEFAULT 1, approved_at TEXT,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS rubric_criteria (
                id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                position INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
                max_mark REAL NOT NULL CHECK(max_mark > 0)
            );
            CREATE TABLE IF NOT EXISTS submissions (
                id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES questions(id),
                student_name TEXT NOT NULL, student_id TEXT NOT NULL, file_name TEXT NOT NULL DEFAULT '',
                submitted_at TEXT NOT NULL, ocr_original TEXT NOT NULL DEFAULT '',
                ocr_transcript TEXT NOT NULL DEFAULT '', ocr_engine TEXT NOT NULL DEFAULT '',
                ocr_error TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending'
            );
            CREATE TABLE IF NOT EXISTS submission_pages (
                id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
                position INTEGER NOT NULL, file_name TEXT NOT NULL, stored_name TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS grades (
                id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id),
                question_version INTEGER NOT NULL, rubric_snapshot TEXT NOT NULL,
                answer_snapshot TEXT NOT NULL, model_name TEXT NOT NULL,
                criteria_scores TEXT NOT NULL, review_flags TEXT NOT NULL,
                model_total REAL NOT NULL, overrides TEXT NOT NULL DEFAULT '{}',
                teacher_feedback TEXT NOT NULL DEFAULT '', graded_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS mcqs (
                id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, subject TEXT NOT NULL,
                question TEXT NOT NULL, options TEXT NOT NULL, correct_key TEXT NOT NULL,
                explanation TEXT NOT NULL DEFAULT '', mark REAL NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS mcq_attempts (
                id TEXT PRIMARY KEY, student_name TEXT NOT NULL, student_id TEXT NOT NULL,
                answers TEXT NOT NULL, results TEXT NOT NULL, score REAL NOT NULL,
                max_marks REAL NOT NULL, submitted_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS teacher_labels (
                submission_id TEXT PRIMARY KEY REFERENCES submissions(id), mark REAL NOT NULL,
                recorded_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','admin')),
                password_hash TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
        """)
        # Existing local databases receive owner columns without changing historical records.
        for table in ("submissions", "mcq_attempts"):
            if "owner_user_id" not in {row["name"] for row in db.execute(f"PRAGMA table_info({table})")}:
                db.execute(f"ALTER TABLE {table} ADD COLUMN owner_user_id TEXT")


@contextmanager
def connection():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
