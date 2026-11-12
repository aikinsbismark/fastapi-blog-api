from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # fill any NULLs first, otherwise NOT NULL would fail
    op.execute("UPDATE admin_user SET is_superuser = true WHERE is_superuser IS NULL")
    with op.batch_alter_table("admin_user") as batch_op:
        batch_op.alter_column(
            "is_superuser",
            existing_type=sa.Boolean(),
            nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("admin_user") as batch_op:
        batch_op.alter_column(
            "is_superuser",
            existing_type=sa.Boolean(),
            nullable=True,
        )
