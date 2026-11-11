"""Baseline schema (tables that existed before the first migration)

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-11-10 00:00:00

Why this exists: the earlier migrations only ADD columns, because the tables
were originally created with Base.metadata.create_all(). On an empty database
(a new PostgreSQL, a fresh container) there was nothing to alter, so
`alembic upgrade head` failed. This revision creates those tables in the state
they had BEFORE the three column migrations:

  - users, admin_user, authors have no image_file yet (added by 832dcf83c05b / 03aae6664dde)
  - users, admin_user have no created_at yet (added by 703a4d68faba)

Existing databases already stamped at 703a4d68faba are not affected.
If your existing database has a version table at all, do not run this on it.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _now():
    return sa.text("CURRENT_TIMESTAMP")


def upgrade() -> None:
    op.create_table(
        "admin_user",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), nullable=True),
        sa.Column("disabled", sa.Boolean(), nullable=True),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "authors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now(), nullable=False),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admin_user.id"), nullable=True),
        sa.Column("disabled", sa.Boolean(), nullable=True),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("disabled", sa.Boolean(), nullable=True),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "blogs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now(), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("authors.id"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "PUBLISHED", name="blog_status"),
            nullable=False,
        ),
    )
    op.create_table(
        "user_reads_blog",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("blog_id", sa.Integer(), sa.ForeignKey("blogs.id"), primary_key=True),
    )
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("blog_id", sa.Integer(), sa.ForeignKey("blogs.id"), nullable=False),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("comments.id"), nullable=True),
    )
    op.create_table(
        "likes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("comment_id", sa.Integer(), sa.ForeignKey("comments.id"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("blog_id", sa.Integer(), sa.ForeignKey("blogs.id"), nullable=True),
    )
    for table, owner_col, owner_table in (
        ("admin_password_reset_tokens", "admin_id", "admin_user"),
        ("author_password_reset_tokens", "author_id", "authors"),
        ("user_password_reset_tokens", "user_id", "users"),
    ):
        op.create_table(
            table,
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("token_hash", sa.String(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now(), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(owner_col, sa.Integer(), sa.ForeignKey(f"{owner_table}.id"), nullable=False),
            sa.UniqueConstraint("token_hash"),
        )


def downgrade() -> None:
    for table in (
        "user_password_reset_tokens",
        "author_password_reset_tokens",
        "admin_password_reset_tokens",
        "likes",
        "comments",
        "user_reads_blog",
        "blogs",
        "users",
        "authors",
        "admin_user",
    ):
        op.drop_table(table)
    sa.Enum(name="blog_status").drop(op.get_bind(), checkfirst=True)
