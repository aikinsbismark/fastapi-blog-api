from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Blog
from ..schemas import CommentCreate, CommentRead, BlogStatus
from ..crud import create_comment, get_comments_by_blog, build_comment_tree
from ..dependencies import get_db



router = APIRouter(prefix="/comment", tags=["comments"])



@router.post("/{blog_id}", status_code=status.HTTP_201_CREATED)
async def create_comment_for_blog(blog_id: int,
                                  comment: CommentCreate,
                                  db: Session = Depends(get_db)
):
    post = db.execute(select(Blog).where(Blog.id == blog_id, Blog.status==BlogStatus.PUBLISHED)).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                             detail="Blog not found")
    new_comment = create_comment(db, blog_id, comment)
    return new_comment


@router.get("/{blog_id}", response_model=list[CommentRead])
async def read_comments_on_blog(blog_id: int, db: Session = Depends(get_db)):
    post = db.execute(select(Blog).where(Blog.id == blog_id, Blog.status==BlogStatus.PUBLISHED)).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                             detail="Blog not found")
    comments = get_comments_by_blog(db, blog_id)
    tree = build_comment_tree(comments)
    return tree


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    # For now, reject all comment deletion requests with 403
    # Future: implement proper owner/admin authorization check
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Deleting comments via API is restricted to admins")
