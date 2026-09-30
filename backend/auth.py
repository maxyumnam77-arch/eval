"""Local role-based accounts and opaque bearer sessions."""

import hashlib
import hmac
import secrets
import sqlite3
import time
import uuid
from datetime import datetime, timezone

from . import db

SESSION_SECONDS = 7 * 24 * 60 * 60
PBKDF2_ROUNDS = 400_000


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${PBKDF2_ROUNDS}${salt.hex()}${digest.hex()}"


def verify_password(password, stored):
    try:
        algorithm, rounds, salt, expected = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds))
        return hmac.compare_digest(digest, bytes.fromhex(expected))
    except (ValueError, TypeError):
        return False


def create_user(username, display_name, password, role="student"):
    username = username.strip().lower()
    display_name = display_name.strip()
    if not 3 <= len(username) <= 50 or not all(c.isalnum() or c in "._-" for c in username):
        raise ValueError("ID must be 3–50 letters, numbers, dots, dashes, or underscores.")
    if not display_name or len(display_name) > 100 or len(password) < 8:
        raise ValueError("Provide a name and a password of at least 8 characters.")
    if role not in {"student", "admin"}:
        raise ValueError("Unknown role.")
    if role == "student" and username == "admin":
        raise ValueError("This ID is reserved for an administrator.")
    uid = str(uuid.uuid4())
    with db.connection() as conn:
        conn.execute("INSERT INTO users VALUES (?,?,?,?,?,?)", (
            uid, username, display_name, role, hash_password(password),
            datetime.now(timezone.utc).isoformat(timespec="seconds")))
    return {"id": uid, "username": username, "displayName": display_name, "role": role}


def login(username, password):
    with db.connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE username=?", (username.strip().lower(),)).fetchone()
        if not row or not verify_password(password, row["password_hash"]):
            return None
        token = secrets.token_urlsafe(32)
        conn.execute("INSERT INTO sessions VALUES (?,?,?)", (
            hashlib.sha256(token.encode()).hexdigest(), row["id"], int(time.time()) + SESSION_SECONDS))
        return {"token": token, "user": {"id": row["id"], "username": row["username"],
                                         "displayName": row["display_name"], "role": row["role"]}}


def user_for_token(token):
    if not token:
        return None
    with db.connection() as conn:
        row = conn.execute("""SELECT u.id, u.username, u.display_name, u.role FROM sessions s
            JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?""",
            (hashlib.sha256(token.encode()).hexdigest(), int(time.time()))).fetchone()
        return {"id": row["id"], "username": row["username"], "displayName": row["display_name"],
                "role": row["role"]} if row else None


def logout(token):
    with db.connection() as conn:
        conn.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(token.encode()).hexdigest(),))
