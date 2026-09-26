from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import Like, Blog, Comment
from ..crud import create_like
from ..schemas import LikePost, BlogStatus
from ..dependencies import get_db                                   




router = APIRouter(prefix="/like", tags=["likes"])




@router.post("/blog/{blog_id}", status_code=status.HTTP_201_CREATED)
async def create_like_on_blog(
    blog_id: int, like: LikePost, 
    db: AsyncSession = Depends(get_db)
):
    post = await db.execute(
        select(Blog).where(Blog.id == blog_id, Blog.status==BlogStatus.PUBLISHED)
    )
    result = post.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                             detail="Blog not found")
    new_like = create_like(db, like, blog_id=blog_id)
    return new_like


@router.post("/comment/{comment_id}", status_code=status.HTTP_201_CREATED)
async def create_like_on_comment(
    comment_id: int, 
    like: LikePost, 
    db: AsyncSession = Depends(get_db)
):
    comment = await db.execute(select(Comment).where(Comment.id == comment_id))
    result = comment.scalar_one_or_none()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    new_like = create_like(db, like, comment_id=comment_id)
    return new_like


@router.delete("/delete/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_like(id: int, db: AsyncSession = Depends(get_db)):
    like = await db.execute(select(Like).where(Like.id == id))
    result = like.scalar_one_or_none()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Like not found"
        )
    db.delete(like)
    db.commit()
    return {"message": "Like removed successfully"}