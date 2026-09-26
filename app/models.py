from __future__ import annotations

from typing import List

from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .enums import BlogStatus
from .core import Base



class AdminUser(Base):
    __tablename__ = "admin_user"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=True)
    disabled: Mapped[bool | None] = mapped_column(default=False, nullable=True)
    author: Mapped[List["Author"]] = relationship(back_populates="admin_user")
    reset_token: Mapped[list["AdminPasswordResetToken"]] = relationship(
        back_populates="admin_user",
        cascade="all, delete-orphan", 
    )


class Author(Base):
    __tablename__ = "authors"     

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String, nullable=False)  
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)   
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)   
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    admin_id: Mapped[int | None] = mapped_column(ForeignKey("admin_user.id"), nullable=True)
    admin_user: Mapped["AdminUser"] = relationship(back_populates="author")
    blog: Mapped[List["Blog"]] = relationship(back_populates="author")
    disabled: Mapped[bool | None] = mapped_column(default=False, nullable=True)
    reset_token: Mapped[list["AuthorPasswordResetToken"]] = relationship(
        back_populates="author",
        cascade="all, delete-orphan",
    )


class UserModel(Base):
    __tablename__ = "users"    

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    disabled: Mapped[bool | None] = mapped_column(default=False, nullable=True)
    like: Mapped[List["Like"]] = relationship(back_populates="user")
    comment: Mapped[List["Comment"]] = relationship(back_populates="user")
    reads: Mapped[List["UserReadsBlogs"]] = relationship(
        back_populates="user"
    )
    reset_token: Mapped[list["UserPasswordResetToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Blog(Base):
    __tablename__ = "blogs"    

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(String, nullable=False) 
    title: Mapped[str] = mapped_column(String, nullable=False) 
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"))
    author: Mapped["Author"] = relationship(back_populates="blog")
    like: Mapped[List["Like"]] = relationship(back_populates="blog")
    comment: Mapped[List["Comment"]] = relationship(back_populates="blog")
    readers: Mapped[List["UserReadsBlogs"]] = relationship(
        back_populates="blog"
    )
    status: Mapped[BlogStatus] = mapped_column(Enum(BlogStatus, name="blog_status"), default=BlogStatus.PENDING)


class UserReadsBlogs(Base):
    __tablename__ = "user_reads_blog"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), primary_key=True
    )
    blog_id: Mapped[int] = mapped_column(
        ForeignKey("blogs.id"), primary_key=True
    )
    user: Mapped["UserModel"] = relationship(back_populates="reads")
    blog: Mapped["Blog"] = relationship(back_populates="readers")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    like: Mapped[List["Like"]] = relationship(back_populates="comment")
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user: Mapped["UserModel"] = relationship(back_populates="comment")
    blog_id: Mapped[int] = mapped_column(ForeignKey("blogs.id"))
    blog: Mapped["Blog"] = relationship(back_populates="comment")
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("comments.id"), nullable=True)
    parent: Mapped["Comment | None"] = relationship(
        "Comment",
        remote_side=[id],
        back_populates="children",
    )
    children: Mapped[List["Comment"]] = relationship(back_populates="parent", cascade="all, delete")


class Like(Base):
    __tablename__ = "likes"

    id: Mapped[int] = mapped_column(primary_key=True)
    comment_id: Mapped[int | None] = mapped_column(ForeignKey("comments.id"))
    comment: Mapped["Comment"] = relationship(back_populates="like")
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user: Mapped["UserModel"] = relationship(back_populates="like")
    blog_id: Mapped[int | None] = mapped_column(ForeignKey("blogs.id"))
    blog: Mapped["Blog"] = relationship(back_populates="like")


class AdminPasswordResetToken(Base):
    __tablename__ = "admin_password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    admin_id: Mapped[int] = mapped_column(ForeignKey("admin_user.id"), nullable=False)
    admin_user: Mapped["AdminUser"] = relationship(back_populates="reset_token")


class AuthorPasswordResetToken(Base):
    __tablename__ = "author_password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"), nullable=False)
    author: Mapped["Author"] = relationship(back_populates="reset_token")


class UserPasswordResetToken(Base):
    __tablename__ = "user_password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    user: Mapped["UserModel"] = relationship(back_populates="reset_token")