from sqlalchemy import select, func, delete as sql_delete, update as sql_update
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from .models import (
    AdminUser, UserModel, Author, Blog, Comment, Like, UserReadsBlogs,
    AdminPasswordResetToken, AuthorPasswordResetToken, UserPasswordResetToken,
)
from .schemas import (
     AdminUserCreate, 
     UserCreate, 
     BlogCreate, 
     AuthorCreate, 
     CommentCreate
)



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
    user_db = UserModel(
        username=user.username,
        email=user.email,
        hashed_password=user.password
    )
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


async def create_comment(
        db: AsyncSession, 
        blog_id: int, 
        user_id: int,
        comment: CommentCreate
):
    parent_id = getattr(comment, 'parent_id', None)
    if parent_id is not None:
        parent = await db.get(Comment, parent_id)
        if parent is None or parent.blog_id != blog_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent comment not found on this blog",
            )

    new_comment = Comment(
        blog_id=blog_id,
        user_id=user_id,
        content=comment.content,
        parent_id=parent_id,
    )

    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    return new_comment

async def get_comments_by_blog(db: AsyncSession, blog_id: int):
    comments = await db.execute(select(Comment).where(Comment.blog_id == blog_id).order_by(Comment.created_at))
    return comments.scalars().all()

async def get_comment_counts(db: AsyncSession, blog_ids: list[int]) -> dict[int, int]:
    if not blog_ids:
        return {}

    result = await db.execute(
        select(Comment.blog_id, func.count(Comment.id))
        .where(Comment.blog_id.in_(blog_ids))
        .group_by(Comment.blog_id)
    )
    return dict(result.all())


def build_comment_tree(comments: list[Comment]):
    nodes: dict[int, dict] = {}
    roots: list[dict] = []

    for comment in comments:
        nodes[comment.id] = {
            'id': comment.id,
            'parent_id': comment.parent_id,
            'blog_id': comment.blog_id,
            'user_id': comment.user_id,
            'content': comment.content,
            'created_at': comment.created_at.isoformat() if hasattr(comment.created_at, 'isoformat') else comment.created_at,
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
        db: AsyncSession, 
        user_id: int, 
        blog_id: int | None = None, 
        comment_id: int | None = None
):
    like_on = Like(
        user_id=user_id,
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
        result = await db.execute(
            select(Like).where(Like.user_id == user_id, Like.blog_id == blog_id)
        )
        
    elif comment_id is not None:
        result = await db.execute(select(Like).where(Like.user_id == user_id, Like.comment_id == comment_id))
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Must specify blog_id or comment_id"
        )

    existing_like = result.scalars().first()

    if existing_like:
        await db.delete(existing_like)
        await db.commit()

        if blog_id is not None:
            count_query = select(func.count()).select_from(Like).where(
                Like.blog_id == blog_id
            )
        else:
            count_query = select(func.count()).select_from(Like).where(
                Like.comment_id == comment_id
            )

        count_result = await db.execute(count_query)
        likes_count = count_result.scalar_one()

        return {
            "is_liked": False,
            "like_id": None,
            "likes_count": likes_count,
        }

    new_like = Like(
        user_id=user_id,
        blog_id=blog_id,
        comment_id=comment_id,
    )

    db.add(new_like)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        result = await db.execute(
            select(Like).where(
                Like.user_id == user_id,
                Like.blog_id == blog_id,
                Like.comment_id == comment_id,
            )
        )
        new_like = result.scalars().first()
    else:
        await db.refresh(new_like)

    if blog_id is not None:
        count_query = select(func.count()).select_from(Like).where(
            Like.blog_id == blog_id
        )
    else:
        count_query = select(func.count()).select_from(Like).where(
            Like.comment_id == comment_id
        )

    count_result = await db.execute(count_query)
    likes_count = count_result.scalar_one()

    return {
        "is_liked": True,
        "like_id": new_like.id,
        "likes_count": likes_count,
    }


async def _comment_subtree_ids(db: AsyncSession, root_ids: list[int]) -> list[int]:
    seen = set(root_ids)
    frontier = list(root_ids)
    while frontier:
        rows = (await db.execute(
            select(Comment.id).where(Comment.parent_id.in_(frontier))
        )).scalars().all()
        frontier = [r for r in rows if r not in seen]
        seen.update(frontier)
    return list(seen)


async def _delete_comments_by_ids(db: AsyncSession, ids: list[int]) -> None:
    if not ids:
        return
    await db.execute(sql_delete(Like).where(Like.comment_id.in_(ids)))
    await db.execute(sql_delete(Comment).where(Comment.id.in_(ids)))


async def delete_comment_cascade(db: AsyncSession, comment_id: int) -> None:
    ids = await _comment_subtree_ids(db, [comment_id])
    await _delete_comments_by_ids(db, ids)


async def delete_blog_cascade(db: AsyncSession, blog_id: int) -> None:
    comment_ids = (await db.execute(
        select(Comment.id).where(Comment.blog_id == blog_id)
    )).scalars().all()
    await _delete_comments_by_ids(db, list(comment_ids))
    await db.execute(sql_delete(Like).where(Like.blog_id == blog_id))
    await db.execute(sql_delete(UserReadsBlogs).where(UserReadsBlogs.blog_id == blog_id))
    await db.execute(sql_delete(Blog).where(Blog.id == blog_id))


async def delete_user_cascade(db: AsyncSession, user_id: int) -> None:
    own = (await db.execute(
        select(Comment.id).where(Comment.user_id == user_id)
    )).scalars().all()
    ids = await _comment_subtree_ids(db, list(own))
    await _delete_comments_by_ids(db, ids)
    await db.execute(sql_delete(Like).where(Like.user_id == user_id))
    await db.execute(sql_delete(UserReadsBlogs).where(UserReadsBlogs.user_id == user_id))
    await db.execute(sql_delete(UserPasswordResetToken).where(UserPasswordResetToken.user_id == user_id))
    await db.execute(sql_delete(UserModel).where(UserModel.id == user_id))


async def delete_author_row(db: AsyncSession, author_id: int) -> None:
    await db.execute(sql_delete(AuthorPasswordResetToken).where(AuthorPasswordResetToken.author_id == author_id))
    await db.execute(sql_delete(Author).where(Author.id == author_id))


async def delete_admin_row(db: AsyncSession, admin_id: int) -> None:
    await db.execute(sql_update(Author).where(Author.admin_id == admin_id).values(admin_id=None))
    await db.execute(sql_delete(AdminPasswordResetToken).where(AdminPasswordResetToken.admin_id == admin_id))
    await db.execute(sql_delete(AdminUser).where(AdminUser.id == admin_id))
