from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from typing import List, Optional, Annotated
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, update, func
from ..schemas import Settings, BlogCreate, BlogPost, BlogUpdate, UserReadBlog, BlogInfoSchema, PaginatedBlogsResponse, BlogResponse
from ..enums import BlogStatus
from ..crud import create_a_blog
from ..crud import get_comments_by_blog, build_comment_tree
from ..models import Like
from ..dependencies import get_db
from ..models import Blog, Author
from .security.author_authentication import get_current_active_author
from .security.admin_authentication import get_current_active_admin
from .security.admin_authentication import oauth2_scheme
import jwt
from jwt.exceptions import InvalidTokenError
from ..crud import get_admin_by_name, get_author_by_name

ALGORITHM = "HS256"



settings = Settings()  



router = APIRouter(prefix="/blog", tags=["blogs"])



@router.post("/create", response_model=BlogPost)
async def create_blog(blog: BlogCreate,
                      current_author: Author = Depends(get_current_active_author),
                      db: Session = Depends(get_db)):
    new_blog = create_a_blog(db, blog, current_author.id)
    return new_blog


@router.put("/{blog_id}/publish", status_code=status.HTTP_202_ACCEPTED)
async def publish_blog(blog_id: int,
                      current_admin = Depends(get_current_active_admin),
                      db: Session = Depends(get_db)):
    blog = db.execute(select(Blog).where(Blog.id == blog_id)).scalars().first()
    if not blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found"
            )
    
    blog.status = BlogStatus.PUBLISHED
    db.commit()
    db.refresh(blog)
    return blog
    

@router.get("/", response_model=PaginatedBlogsResponse)
async def get_blogs(
    db: Session = Depends(get_db),
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = settings.posts_per_page,
    search: Optional[str] = ""
):
    count_result = db.execute(
        select(func.count()).select_from(Blog).where(
            Blog.title.contains(search),
            Blog.status == BlogStatus.PUBLISHED
        )
    )
    total = count_result.scalar() or 0

    result = db.execute(
        select(Blog)
        .options(selectinload(Blog.author))
        .where(
            Blog.title.contains(search),
            Blog.status == BlogStatus.PUBLISHED
        )
        .order_by(Blog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    blogs = result.scalars().all()

    blog_entries = []
    for blog in blogs:
        likes_count = db.execute(select(func.count()).select_from(Like).where(Like.blog_id == blog.id)).scalar() or 0
        blog_entries.append(
            UserReadBlog.model_validate({
                'id': blog.id,
                'title': blog.title,
                'content': blog.content,
                'author': blog.author,
                'likes_count': likes_count,
            })
        )

    has_more = skip + len(blogs) < total

    return PaginatedBlogsResponse(
        blogs=blog_entries,
        total=total,
        skip=skip,
        limit=limit,
        has_more=has_more,
    )


@router.get("/author/details")
async def read_author_blogs_details(current_author: Author = Depends(get_current_active_author), db: Session = Depends(get_db)):
    blogs = db.execute(select(Blog).where(Blog.author_id == current_author.id)).scalars().all()
    result = []
    for b in blogs:
        likes_count = db.execute(select(func.count()).select_from(Like).where(Like.blog_id == b.id)).scalar() or 0
        comments = get_comments_by_blog(db, b.id)
        comments_tree = build_comment_tree(comments)
        result.append({
            'id': b.id,
            'title': b.title,
            'content': b.content,
            'status': str(b.status),
            'likes_count': likes_count,
            'comments': comments_tree,
        })
    return result


async def get_current_admin_or_author(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role")
        if not username or not role:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    if role == 'admin':
        admin = get_admin_by_name(db, username=username)
        if not admin:
            raise credentials_exception
        return {"role": "admin", "user": admin}
    elif role == 'author':
        author = get_author_by_name(db, username=username)
        if not author:
            raise credentials_exception
        return {"role": "author", "user": author}
    else:
        raise credentials_exception


@router.get("/pending", response_model=List[UserReadBlog])
async def load_pending_blogs(current = Depends(get_current_admin_or_author), db: Session = Depends(get_db)):
    if current.get("role") == "admin":
        return db.query(Blog).filter(Blog.status == BlogStatus.PENDING).all()
    else:
        author = current.get("user")
        return db.query(Blog).filter(Blog.status == BlogStatus.PENDING, Blog.author_id == author.id).all()


@router.get("/{id}", response_model=BlogInfoSchema)
async def read_blog(id: int, db: Session = Depends(get_db)):
    post = db.execute(select(Blog).filter(Blog.status==BlogStatus.PUBLISHED).where(Blog.id==id)).scalars().first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Blog not found")
    return post


@router.put("/update/{id}", response_model=BlogCreate)
async def update_blog(blog: BlogUpdate, id: int, db: Session = Depends(get_db)):
    post_in_db = db.execute(select(Blog).where(Blog.id == id)).scalars().first()
    if not post_in_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
        detail="Blog does not exist"
        )
    update_data = blog.model_dump(exclude_unset=True)
    if not update_data: 
        pass
    else:
        stmt = update(Blog).where(Blog.id == id).values(update_data)
        db.execute(stmt)
        db.commit()
    updated_post = db.execute(select(Blog).where(Blog.id == id)).scalars().first()
    return updated_post


@router.delete("/delete/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog_post(id: int,
                           current = Depends(get_current_admin_or_author),
                           db: Session = Depends(get_db)):
    blog_post = db.execute(select(Blog).where(Blog.id == id)).scalars().first()
    if not blog_post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Blog not found")

    role = current.get("role")
    user = current.get("user")

    if role == "admin":
        db.delete(blog_post)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    if role == "author":
        if getattr(blog_post, 'author_id', None) == getattr(user, 'id', None):
            db.delete(blog_post)
            db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Not authorized to delete this blog")

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                        detail="Not authorized to delete this blog")
