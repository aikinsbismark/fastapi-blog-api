from datetime import timedelta, datetime, UTC
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete as sql_delete
from sqlalchemy import select
from fastapi.security import OAuth2PasswordRequestForm
from ..schemas import (
    AdminUserCreate, 
    AdminUserRead, 
    Token,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from ..email_utils import send_password_reset_email
from ..crud import create_admin, get_admin_by_name
from ..dependencies import get_db
from ..config import settings
from .security.admin_authentication import (
    authenticate_admin, 
    get_password_hash,
    generate_reset_token,
    hash_reset_token, 
    create_access_token,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from ..models import AdminUser, AdminPasswordResetToken, UserModel
from .security.admin_authentication import (
    get_current_active_admin,
    get_current_admin
) 




admin_router = APIRouter(prefix="/admin", tags=["admins"])



@admin_router.post("/", response_model=AdminUserRead)
async def register_user(admin: AdminUserCreate, db: AsyncSession = Depends(get_db)):
    existing_user = await get_admin_by_name(db, admin.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    result = await db.execute(
        select(AdminUser).where(AdminUser.email == admin.email)
    )
    existing_email = result.scalar_one_or_none()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(admin.password)
    admin.password = hashed_password
    admin_create = await create_admin(db, admin)
    return admin_create


@admin_router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    admin_user = await authenticate_admin(db, form_data.username, form_data.password)
    if not admin_user :
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or Password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin_user.username, "role": "admin"}, expires_delta=access_token_expires
        )
    return Token(access_token=access_token, token_type="bearer")


@admin_router.get("/me", response_model=AdminUserRead)
async def read_current_admin(current_admin: AdminUserRead = Depends(get_current_active_admin)):
    return current_admin


@admin_router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    request_data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == request_data.email))
    admin = result.scalar_one_or_none()

    if admin:
        await db.execute(
            sql_delete(AdminPasswordResetToken).where(
                AdminPasswordResetToken.admin_id == admin.id,
            ),
        )

        token = generate_reset_token()
        token_hash = hash_reset_token(token)
        expires_at = datetime.now(UTC) + timedelta(
            minutes=settings.reset_token_expire_minutes,
        )

        reset_token = AdminPasswordResetToken(
            admin_id=admin.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(reset_token)
        await db.commit()

        admin_email = admin.email
        admin_username = admin.username 
        
        background_tasks.add_task(
            send_password_reset_email,
            to_email=admin_email,
            username=admin_username,
            token=token,
        )

        return {
            "message": "If an account exists with this email, you will receive password reset instructions.",
        }


@admin_router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    request_data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    token_hash = hash_reset_token(request_data.token)

    result = await db.execute(
        select(AdminPasswordResetToken).where(
            AdminPasswordResetToken.token_hash == token_hash
        )
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    if reset_token.expires_at < datetime.now(UTC):
        await db.delete(reset_token)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    result = await db.execute(
        select(AdminUser).where(AdminUser.id == reset_token.admin_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    user.password_hash = get_password_hash(request_data.new_password)

    await db.execute(
        sql_delete(AdminPasswordResetToken).where(
            AdminPasswordResetToken.admin_user_id == user.id
        )
    )
    await db.commit()
    return {
        "message": "Password reset successfully. You can now log in with your new password."
    }


@admin_router.patch("/me/password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    current_user.password_hash = get_password_hash(password_data.new_password)

    await db.execute(
        select(AdminPasswordResetToken).where(
            AdminPasswordResetToken.admin_user_id == current_user.id
        )
    )
    await db.commit()
    return {"message": "Password changed successfully"}


@admin_router.get("/users", dependencies=[Depends(get_current_active_admin)])
async def list_users(db: AsyncSession = Depends(get_db)):
    users = db.execute(select(UserModel)).scalar_one_or_none()
    return users


@admin_router.delete("/users/{user_id}")
async def delete_user(
    user_id: int, 
    current_admin = Depends(get_current_active_admin), 
    db: AsyncSession = Depends(get_db)
):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    user = db.execute(select(UserModel).where(UserModel.id == user_id)).scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}