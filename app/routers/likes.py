from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Blog, Comment
from ..crud import toggle_like
from ..schemas import BlogStatus
from ..dependencies import get_db
from .security.user_authentication import get_current_active_user                                   




router = APIRouter(prefix="/like", tags=["likes"])




@router.post("/blog/{blog_id}", status_code=status.HTTP_201_CREATED)
async def like_post(
    blog_id: int,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Blog).where(Blog.id == blog_id, Blog.status==BlogStatus.PUBLISHED)
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found"
        )

    return await toggle_like(
        db=db,
        user_id=current_user.id,
        blog_id=blog_id
    )


@router.post("/comment/{comment_id}", status_code=status.HTTP_201_CREATED)
async def like_comment(
    comment_id: int, 
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    return await toggle_like(
        db=db,
        user_id=current_user.id,
        comment_id=comment_id
    )