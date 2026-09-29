import jwt

from fastapi import APIRouter, Depends, HTTPException, status, Response
from jwt.exceptions import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Blog, UserModel, Comment
from ..schemas import CommentCreate, CommentRead, BlogStatus
from ..crud import (
    create_comment, 
    get_comments_by_blog, 
    get_admin_by_name, 
    get_user_by_username,
    build_comment_tree
)
from ..dependencies import get_db
from ..config import settings
from .security.user_authentication import get_current_active_user, oauth2_scheme



router = APIRouter(prefix="/comment", tags=["comments"])



@router.post("/{blog_id}", status_code=status.HTTP_201_CREATED)
async def create_comments(
    blog_id: int,
    comment: CommentCreate,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Blog).where(
        Blog.id == blog_id, Blog.status==BlogStatus.PUBLISHED)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found"
        )

    new_comment = await create_comment(
        db, 
        blog_id, 
        current_user.id,
        comment
    )
    return new_comment


@router.get("/{blog_id}", response_model=list[CommentRead])
async def read_comments_on_blog(blog_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Blog).where(Blog.id == blog_id, Blog.status==BlogStatus.PUBLISHED)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found"
        )
    comments = await get_comments_by_blog(db, blog_id)
    tree = build_comment_tree(comments)
    return tree


async def get_current_user_or_admin(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key.get_secret_value(), algorithms=[settings.ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role")
        if not username or not role:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    if role == "admin":
        admin = await get_admin_by_name(db, username=username)
        if not admin:
            raise credentials_exception
        return {"role": "admin", "user": admin}
    elif role == "user":
        user = await get_user_by_username(db, username=username)
        if not user:
            raise credentials_exception
        return {"role": "user", "user": user}
    else:
        raise credentials_exception


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int, 
    current = Depends(get_current_user_or_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    role = current.get("role")
    user = current.get("user")

    if role == "admin":
        await db.delete(comment)
        await db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    if role == "user":
        if comment.user_id == getattr(user, 'id', None):
            await db.delete(comment)
            await db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        else:
            raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorized to delete this comment"
            )