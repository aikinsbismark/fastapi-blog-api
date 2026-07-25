from sqlalchemy import select, func
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from .models import AdminUser, UserModel, Author, Blog, Comment, Like
from .schemas import AdminUserCreate, UserCreate, BlogCreate, AuthorCreate, CommentCreate, LikePost



def create_admin(db: Session, admin: AdminUserCreate):
    admin_db = AdminUser(username=admin.username,
                         email_address=admin.email_address,
                         hashed_password=admin.password)
    db.add(admin_db)
    db.commit()
    db.refresh(admin_db)
    return admin_db

def get_admin_by_name(db: Session, username: str):
    return db.execute(select(AdminUser).where(AdminUser.username == username)).scalar_one_or_none()


def create_user(db: Session, user: UserCreate):
    user_db = UserModel(username=user.username, hashed_password=user.password)
    db.add(user_db)
    db.commit()
    db.refresh(user_db)
    return user_db

def get_user_by_username(db: Session, username: str):
    return db.execute(select(UserModel).where(UserModel.username == username)).scalar_one_or_none()


def create_author(db: Session, author: AuthorCreate):
    author_db = Author(username=author.username, 
                        email_address=author.email_address,
                        hashed_password=author.password)
    db.add(author_db)
    db.commit()
    db.refresh(author_db)
    return author_db

def get_author_by_name(db: Session, username: str):
    return db.execute(select(Author).where(Author.username == username)).scalar_one_or_none()


def create_a_blog(db: Session, blog: BlogCreate, author_id: int):
    new_post = Blog(title=blog.title,
                     content=blog.content,
                     author_id=author_id,
                     status=blog.status) 
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post


def is_admin(db: Session, admin: AdminUser):
    verify_user = db.execute(select(AdminUser).where(AdminUser.id == admin.id)).scalar_one_or_none()
    if not verify_user:
        raise HTTPException (status_code=status.HTTP_403_FORBIDDEN,
                             detail="Not authorized to perform requested action")
    return verify_user


def create_comment(db: Session, blog_id: int, comment: CommentCreate):
    new_comment = Comment(
        blog_id=blog_id,
        user_id=comment.user_id,
        content=comment.content,
        parent_id=getattr(comment, 'parent_id', None),
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

def get_comments_by_blog(db: Session, blog_id: int):
    return db.execute(select(Comment).where(Comment.blog_id == blog_id).order_by(Comment.created_at)).scalars().all()


def build_comment_tree(comments: list[Comment]):
    nodes: dict[int, dict] = {}
    roots: list[dict] = []

    for c in comments:
        nodes[c.id] = {
            'id': c.id,
            'parent_id': c.parent_id,
            'blog_id': c.blog_id,
            'user_id': c.user_id,
            'content': c.content,
            'created_at': c.created_at.isoformat() if hasattr(c.created_at, 'isoformat') else c.created_at,
            'children': []
        }

    for node in nodes.values():
        parent_id = node['parent_id']
        if parent_id and parent_id in nodes:
            nodes[parent_id]['children'].append(node)
        else:
            roots.append(node)

    return roots


def create_like(db: Session, like: LikePost, blog_id: int | None = None, comment_id: int | None = None):
    like_on = Like(user_id=like.user_id,
                   blog_id=blog_id,
                   comment_id=comment_id)
    db.add(like_on)
    db.commit()
    db.refresh(like_on)
    return like_on


def toggle_like(db: Session, user_id: int, blog_id: int | None = None, comment_id: int | None = None):
    if blog_id is not None:
        existing = db.execute(select(Like).where(Like.user_id == user_id, Like.blog_id == blog_id)).scalar_one_or_none()
    elif comment_id is not None:
        existing = db.execute(select(Like).where(Like.user_id == user_id, Like.comment_id == comment_id)).scalar_one_or_none()
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must specify blog_id or comment_id")

    if existing:
        db.delete(existing)
        db.commit()
        likes_count = 0
        if blog_id is not None:
            likes_count = db.execute(select(func.count()).select_from(Like).where(Like.blog_id == blog_id)).scalar_one()
        elif comment_id is not None:
            likes_count = db.execute(select(func.count()).select_from(Like).where(Like.comment_id == comment_id)).scalar_one()

        return {
            'is_liked': False,
            'like_id': None,
            'likes_count': int(likes_count),
        }

    new_like = Like(user_id=user_id, blog_id=blog_id, comment_id=comment_id)
    db.add(new_like)
    db.commit()
    db.refresh(new_like)

    likes_count = 0
    if blog_id is not None:
        likes_count = db.execute(select(func.count()).select_from(Like).where(Like.blog_id == blog_id)).scalar_one()
    elif comment_id is not None:
        likes_count = db.execute(select(func.count()).select_from(Like).where(Like.comment_id == comment_id)).scalar_one()

    return {
        'is_liked': True,
        'like_id': new_like.id,
        'likes_count': int(likes_count),
    }
