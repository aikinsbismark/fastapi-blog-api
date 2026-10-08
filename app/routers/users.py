from fastapi import (
    APIRouter, 
    Depends, 
    HTTPException, 
    status,
    BackgroundTasks,
    UploadFile
)
from botocore.exceptions import ClientError
from sqlalchemy import select, func
from sqlalchemy import delete as sql_delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime, UTC
from ..schemas import (
    UserCreate, 
    UserRead, 
    UserSchema, 
    Token,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserPrivate,
    UserUpdate
)
from ..image_utils import (
    delete_profile_image,
    process_profile_image,
    upload_profile_image
)
from PIL import UnidentifiedImageError
from starlette.concurrency import run_in_threadpool
from ..crud import create_user, get_user_by_username
from ..dependencies import get_db
from ..email_utils import send_password_reset_email
from .security.user_authentication import (
    create_access_token, 
    get_current_active_user, 
    get_password_hash, 
    authenticate_user,
    generate_reset_token,
    hash_reset_token,
    verify_password
)
from ..models import UserModel, UserPasswordResetToken
from ..config import settings




router = APIRouter(prefix="/user", tags=["users"])




@router.post("/create_account", response_model=UserRead)
async def signup(user: UserCreate, db: AsyncSession = Depends(get_db)):
    existing_user = await get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    result = await db.execute(
    select(UserModel).where(UserModel.email == user.email)
    )
    existing_email = result.scalar_one_or_none()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    hashed_password = get_password_hash(user.password)
    user.password = hashed_password
    user_create = await create_user(db, user)
    return user_create

    


@router.post("/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user :
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": "user"}, expires_delta=access_token_expires
        )
    return Token(access_token=access_token, token_type="bearer") 


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    request_data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserModel).where(UserModel.email == request_data.email))
    user = result.scalar_one_or_none()

    if user:
        await db.execute(
            sql_delete(UserPasswordResetToken).where(
                UserPasswordResetToken.user_id == user.id,
            ),
        )

        token = generate_reset_token()
        token_hash = hash_reset_token(token)
        expires_at = datetime.now(UTC) + timedelta(
            minutes=settings.reset_token_expire_minutes,
        )

        reset_token = UserPasswordResetToken(
            user_id=user.id,
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
        select(UserPasswordResetToken).where(
            UserPasswordResetToken.token_hash == token_hash
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
        select(UserModel).where(UserModel.id == reset_token.user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    print("Success: All checks passed. Updating password...")
    user.hashed_password = get_password_hash(request_data.new_password)

    await db.execute(
        sql_delete(UserPasswordResetToken).where(
            UserPasswordResetToken.user_id == user.id
        )
    )
    await db.commit()
    return {
        "message": "Password reset successfully. You can now log in with your new password."
    }


@router.patch("/me/password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    current_user.password_hash = get_password_hash(password_data.new_password)

    await db.execute(
        sql_delete(UserPasswordResetToken).where(
            UserPasswordResetToken.user_id == current_user.id
        )
    )
    await db.commit()
    return {"message": "Password changed successfully"}
   
   
@router.get("/me", response_model=UserSchema)
async def read_current_user(current_user: UserSchema = Depends(get_current_active_user)):
    return current_user


@router.get("/{user_id}", response_model=UserRead)
async def read_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.patch("/{user_id}", response_model=UserPrivate)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )

    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if (
        user_update.username is not None
        and user_update.username.lower() != user.username.lower()
    ):
        result = await db.execute(
            select(UserModel).where(
                func.lower(UserModel.username) == user_update.username.lower())
        )
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exist"
            )

    if (
            user_update.email is not None
            and user_update.email.lower() != user.email.lower()
        ):
            result = await db.execute(
                select(UserModel).where(
                    func.lower(UserModel.email) == user_update.email.lower())
            )
            existing_user = result.scalar_one_or_none()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

    if user_update.username is not None:
        user.username = user_update.username
    if user_update.email is not None:
        user.email = user_update.email.lower()

    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/picture", response_model=UserPrivate)
async def upload_profile_picture(
    user_id: int,
    file: UploadFile,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):

    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user's picture"
        )

    content = await file.read()

    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.max_upload_size_bytes // (1024 * 1024)}MB"
        )

    try:
        processed_bytes, new_filname = await run_in_threadpool(
            process_profile_image,
            content
        )
    except UnidentifiedImageError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file. Please upload a valid image (JPEG, PNG, GIF, WebP)."
        ) from err

    try:
        await upload_profile_image(processed_bytes, new_filname)
    except ClientError as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image. Please try again."
        ) from err

    old_filename = current_user.image_file

    current_user.image_file = new_filname
    await db.commit()
    await db.refresh(current_user)

    if old_filename:
        await delete_profile_image(old_filename)

    return current_user


@router.delete("/{user_id}/picture", response_model=UserPrivate)
async def delete_user_picture(
    user_id: int,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this user's picture",
        )

    old_filename = current_user.image_file

    if old_filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No profile picture to delete",
        )

    current_user.image_file = None
    await db.commit()
    await db.refresh(current_user)

    await delete_profile_image(old_filename)

    return current_user