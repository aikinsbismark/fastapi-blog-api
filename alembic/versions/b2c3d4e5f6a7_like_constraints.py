"""Add uniqueness and target checks to likes

Revision ID: b2c3d4e5f6a7
Revises: 703a4d68faba
Create Date: 2026-11-10 00:10:00

Before adding the constraints this removes rows that would violate them:
  - duplicate likes by the same user on the same blog or comment (keeps the oldest)
  - likes that point at neither a blog nor a comment, or at both
Back up your database first if it holds real data.
"""
from typing import Sequence, Union

from alembic import op


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "703a4d68faba"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DELETE FROM likes WHERE NOT ("
        "(blog_id IS NOT NULL AND comment_id IS NULL) "
        "OR (blog_id IS NULL AND comment_id IS NOT NULL))"
    )
    op.execute(
        "DELETE FROM likes WHERE id NOT IN ("
        "SELECT MIN(id) FROM likes GROUP BY user_id, blog_id, comment_id)"
    )
    with op.batch_alter_table("likes", schema=None) as batch_op:
        batch_op.create_unique_constraint("uq_likes_user_blog", ["user_id", "blog_id"])
        batch_op.create_unique_constraint("uq_likes_user_comment", ["user_id", "comment_id"])
        batch_op.create_check_constraint(
            "ck_likes_exactly_one_target",
            "(blog_id IS NOT NULL AND comment_id IS NULL) "
            "OR (blog_id IS NULL AND comment_id IS NOT NULL)",
        )


def downgrade() -> None:
    with op.batch_alter_table("likes", schema=None) as batch_op:
        batch_op.drop_constraint("ck_likes_exactly_one_target", type_="check")
        batch_op.drop_constraint("uq_likes_user_comment", type_="unique")
        batch_op.drop_constraint("uq_likes_user_blog", type_="unique")
