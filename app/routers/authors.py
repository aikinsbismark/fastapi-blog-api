from datetime import timedelta, datetime, UTC
from fastapi import (
    APIRouter, 
    Depends, 
    HTTPException, 
    status,
    BackgroundTasks
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy import delete as sql_delete
from fastapi.security import OAuth2PasswordRequestForm
from ..schemas import (
    AuthorBase, 
    AuthorCreate, 
    Token,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from ..models import Author, AuthorPasswordResetToken
from ..crud import create_author, get_author_by_name
from ..dependencies import get_db
from .security.author_authentication import (
    create_access_token, 
    authenticate_author, 
    get_password_hash, 
    generate_reset_token,
    hash_reset_token,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from .security.author_authentication import get_current_active_author
from ..email_utils import send_password_reset_email
from ..config import settings



router = APIRouter(prefix="/author", tags=["authors"])



@router.post("/signup", response_model=AuthorBase)
async def register_author(author: AuthorCreate, db: AsyncSession = Depends(get_db)):
    existing_user = await get_author_by_name(db, author.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    result = await db.execute(
    select(Author).where(Author.email == author.email)
    )
    existing_email = result.scalar_one_or_none()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    hashed_password = get_password_hash(author.password)
    author.password = hashed_password
    author_create = await create_author(db, author)
    return author_create


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    author = await authenticate_author(db, form_data.username, form_data.password)
    if not author:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or Password",
            headers={"WWW-Authenticate": "Bearer"}
            )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": author.username, "role": "author"}, expires_delta=access_token_expires
        )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    request_data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Author).where(Author.email == request_data.email))
    user = result.scalar_one_or_none()

    if user:
        await db.execute(
            sql_delete(AuthorPasswordResetToken).where(
                AuthorPasswordResetToken.author_id == user.id,
            ),
        )

        token = generate_reset_token()
        token_hash = hash_reset_token(token)
        expires_at = datetime.now(UTC) + timedelta(
            minutes=settings.reset_token_expire_minutes,
        )

        reset_token = AuthorPasswordResetToken(
            author_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(reset_token)
        await db.commit()

        background_tasks.add_task(
            send_password_reset_email,
            to_email=user.email,
            username=user.username,
            token=token,
        )

        return {
            "message": "If an account exists with this email, you will receive password reset instructions.",
        }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    request_data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    token_hash = hash_reset_token(request_data.token)

    result = await db.execute(
        select(AuthorPasswordResetToken).where(
            AuthorPasswordResetToken.token_hash == token_hash
        )
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    if reset_token.expires_at < datetime.now(UTC).replace(tzinfo=None):
        await db.delete(reset_token)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    result = await db.execute(
        select(Author).where(Author.id == reset_token.author_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    user.hashed_password = get_password_hash(request_data.new_password)

    await db.execute(
        sql_delete(AuthorPasswordResetToken).where(
            AuthorPasswordResetToken.author_id == user.id
        )
    )
    await db.commit()
    return {
        "message": "Password reset successfully. You can now log in with your new password."
    }


@router.patch("/me/password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user = Depends(get_current_active_author),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    current_user.hashed_password = get_password_hash(password_data.new_password)

    await db.execute(
        sql_delete(AuthorPasswordResetToken).where(
            AuthorPasswordResetToken.author_id == current_user.id
        )
    )
    await db.commit()
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=AuthorBase)
async def read_current_author(current_author: AuthorBase = Depends(get_current_active_author)):
    return current_author
