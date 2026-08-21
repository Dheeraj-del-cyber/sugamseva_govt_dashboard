"""Lightweight, dependency-free auto-migration.

This project doesn't run Alembic migrations, and Base.metadata.create_all()
only creates tables that don't exist yet - it silently does nothing for a
table that already exists but is missing newly-added columns. That's exactly
what happens when this codebase is pulled onto a machine with an older
sugamseva.db: SQLAlchemy's ORM layer references columns (e.g. schemes.code)
that were never added to the physical table, and every query against that
table fails with "OperationalError: no such column ...", which crashes the
app on startup.

run_lightweight_migrations() closes that gap: for every table that already
exists, it diffs the live DB columns against the SQLAlchemy model and adds
whatever is missing with `ALTER TABLE ... ADD COLUMN`. Safe to run on every
startup - tables that are already up to date are left untouched, and brand
new tables are skipped here (create_all handles those).
"""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.database import Base


def run_lightweight_migrations(engine: Engine) -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table_name, table in Base.metadata.tables.items():
            if table_name not in existing_tables:
                continue  # brand new table - create_all() already handles it

            existing_columns = {col["name"] for col in inspector.get_columns(table_name)}

            for column in table.columns:
                if column.name in existing_columns:
                    continue

                col_type = column.type.compile(dialect=engine.dialect)
                ddl = f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type}'
                conn.execute(text(ddl))
                print(f"[migrate] added column {table_name}.{column.name} ({col_type})")