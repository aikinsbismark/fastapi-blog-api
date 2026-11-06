import asyncio
from getpass import getpass

from sqlalchemy import or_, select

from app.core import SessionLocal
from app.models import AdminUser
from app.routers.security.admin_authentication import get_password_hash


async def create_admin(username: str, email: str, password: str) -> AdminUser:
    async with SessionLocal() as db:
        existing = await db.execute(
            select(AdminUser).where(
                or_(
                    AdminUser.username == username,
                    AdminUser.email == email,
                )
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Admin with that username or email already exists.")

        admin = AdminUser(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            is_superuser=True,
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        return admin


async def main() -> None:
    username = input("Admin username: ").strip()
    email = input("Admin email: ").strip().lower()

    password = getpass("Admin password: ")
    confirm = getpass("Confirm password: ")

    if not username:
        raise SystemExit("Username is required.")
    if not email:
        raise SystemExit("Email is required.")
    if len(password) < 8:
        raise SystemExit("Password must be at least 8 characters.")
    if password != confirm:
        raise SystemExit("Passwords do not match.")

    try:
        admin = await create_admin(username, email, password)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    print(f"Admin created: {admin.username} ({admin.email})")


if __name__ == "__main__":
    asyncio.run(main())