from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi.security import OAuth2PasswordRequestForm
from ..schemas import AdminUserCreate, AdminUserRead, Token
from ..crud import create_admin, get_admin_by_name
from ..dependencies import get_db
from .security.admin_authentication import authenticate_admin, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from ..models import UserModel
from .security.admin_authentication import get_current_active_admin




admin_router = APIRouter(prefix="/admin", tags=["admins"])



@admin_router.post("/", response_model=AdminUserRead)
async def register_admin(admin: AdminUserCreate, db: Session = Depends(get_db)):
    existing_user = get_admin_by_name(db, admin.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered")
    hashed_password = get_password_hash(admin.password)
    admin.password = hashed_password
    admin_create = create_admin(db, admin)
    return admin_create


@admin_router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin_user = authenticate_admin(db, form_data.username, form_data.password)
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


@admin_router.get("/users", dependencies=[Depends(get_current_active_admin)])
async def list_users(db: Session = Depends(get_db)):
    users = db.execute(select(UserModel)).scalars().all()
    return users


@admin_router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_admin = Depends(get_current_active_admin), db: Session = Depends(get_db)):
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
