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
    email_address: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=True)
    author: Mapped[List["Author"]] = relationship(back_populates="admin_user")


class Author(Base):
    __tablename__ = "authors"     

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String, nullable=False)  
    email_address: Mapped[str] = mapped_column(String, unique=True, nullable=False)   
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)   
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    admin_user_id: Mapped[int | None] = mapped_column(ForeignKey("admin_user.id"), nullable=True)
    admin_user: Mapped["AdminUser"] = relationship(back_populates="author")
    blog: Mapped[List["Blog"]] = relationship(back_populates="author")


class UserModel(Base):
    __tablename__ = "users"    

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    like: Mapped[List["Like"]] = relationship(back_populates="user")
    comment: Mapped[List["Comment"]] = relationship(back_populates="user")
    reads: Mapped[List["UserReadsBlogs"]] = relationship(
        back_populates="user"
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
