from sqlalchemy import select, func
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from .models import AdminUser, UserModel, Author, Blog, Comment, Like
from .schemas import AdminUserCreate, UserCreate, BlogCreate, AuthorCreate, CommentCreate, LikePost



async def create_admin(db: AsyncSession, admin: AdminUserCreate):
    admin_db = AdminUser(
        username=admin.username,
        email=admin.email,
        hashed_password=admin.password
)
    db.add(admin_db)
    await db.commit()
    await db.refresh(admin_db)
    return admin_db

async def get_admin_by_name(db: AsyncSession, username: str):
    user =  await db.execute(select(AdminUser).where(AdminUser.username == username))
    return user.scalar_one_or_none()



async def create_user(db: AsyncSession, user: UserCreate):
    user_db = UserModel(username=user.username, hashed_password=user.password)
    db.add(user_db)
    await db.commit()
    await db.refresh(user_db)
    return user_db

async def get_user_by_username(db: AsyncSession, username: str):
    user = await db.execute(select(UserModel).where(UserModel.username == username))
    return user.scalar_one_or_none()


async def create_author(db: AsyncSession, author: AuthorCreate):
    author_db = Author(
        username=author.username, 
        email=author.email,
        hashed_password=author.password
)
    db.add(author_db)
    await db.commit()
    await db.refresh(author_db)
    return author_db

async def get_author_by_name(db: AsyncSession, username: str):
    user = await db.execute(select(Author).where(Author.username == username))
    return user.scalar_one_or_none()


async def create_a_blog(db: AsyncSession, blog: BlogCreate, author_id: int):
    new_post = Blog(title=blog.title,
                     content=blog.content,
                     author_id=author_id,
                     status=blog.status) 
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)
    return new_post


async def is_admin(db: AsyncSession, admin: AdminUser):
    verify_user = await db.execute(select(AdminUser).where(AdminUser.id == admin.id))
    result = verify_user.scalar_one_or_none()
    if not result:
        raise HTTPException (
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform requested action"
        )
    return result


async def create_comment(db: AsyncSession, blog_id: int, comment: CommentCreate):
    new_comment = Comment(
        blog_id=blog_id,
        user_id=comment.user_id,
        content=comment.content,
        parent_id=getattr(comment, 'parent_id', None),
    )
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    return new_comment

async def get_comments_by_blog(db: AsyncSession, blog_id: int):
    comment = await db.execute(select(Comment).where(Comment.blog_id == blog_id).order_by(Comment.created_at))
    return comment.scalar_one_or_none()


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


async def create_like(
        db: AsyncSession, like: LikePost, 
        blog_id: int | None = None, 
        comment_id: int | None = None
):
    like_on = Like(
        user_id=like.user_id,
        blog_id=blog_id,
        comment_id=comment_id
    )
    db.add(like_on)
    await db.commit()
    await db.refresh(like_on)
    return like_on


async def toggle_like(
        db: AsyncSession, 
        user_id: int, 
        blog_id: int | None = None, 
        comment_id: int | None = None
):
    if blog_id is not None:
        existing = await db.execute(
            select(Like).where(Like.user_id == user_id, Like.blog_id == blog_id)
        )
        result = existing.scalar_one_or_none()
        
    elif comment_id is not None:
        result = db.execute(select(Like).where(Like.user_id == user_id, Like.comment_id == comment_id)).scalar_one_or_none()
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must specify blog_id or comment_id")

    if result:
        db.delete(result)
        db.commit()
        likes_count = 0
        if blog_id is not None:
            likes_count = await db.execute(
                select(func.count()).select_from(Like).where(Like.blog_id == blog_id)
            )
            result = likes_count.scalar_one()
        elif comment_id is not None:
            likes_count = await db.execute(
                select(func.count()).select_from(Like).where(
                    Like.comment_id == comment_id)
            )
            result = likes_count.scalar_one()

        return {
            'is_liked': False,
            'like_id': None,
            'likes_count': int(likes_count),
        }

    new_like = Like(user_id=user_id, blog_id=blog_id, comment_id=comment_id)
    db.add(new_like)
    await db.commit()
    await db.refresh(new_like)

    likes_count = 0
    if blog_id is not None:
        likes_count = await db.execute(
            select(func.count()).select_from(Like).where(Like.blog_id == blog_id)
        )
        result = likes_count.scalar_one()
    elif comment_id is not None:
        likes_count = await db.execute(
            select(func.count()).select_from(Like).where(Like.comment_id == comment_id)
        )
        result = likes_count.scalar_one()

    return {
        'is_liked': True,
        'like_id': new_like.id,
        'likes_count': int(likes_count),
    }