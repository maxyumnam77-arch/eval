"""Create a local admin account: python -m backend.create_admin"""

from getpass import getpass
from sqlite3 import IntegrityError

from . import auth, db


def main():
    db.initialize()
    username = input("Admin ID [admin]: ").strip() or "admin"
    display_name = input("Display name [Instructor]: ").strip() or "Instructor"
    password = getpass("Password (8+ characters): ")
    confirm = getpass("Confirm password: ")
    if password != confirm:
        raise SystemExit("Passwords do not match.")
    try:
        account = auth.create_user(username, display_name, password, role="admin")
    except (ValueError, IntegrityError) as exc:
        raise SystemExit(f"Could not create admin: {exc}") from exc
    print(f"Created admin account: {account['username']}")


if __name__ == "__main__":
    main()
