import hashlib
import json
import os
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from models import (
    Coach,
    Folder,
    GoalTracker,
    History,
    Lineup,
    MigrationConflict,
    MigrationRecord,
    Player,
    ProgHistory,
    SquadSnapshot,
    User,
    db,
)


MODELS = (
    User,
    Player,
    Coach,
    Folder,
    History,
    ProgHistory,
    Lineup,
    GoalTracker,
    SquadSnapshot,
)
HISTORY_MODELS = (History, ProgHistory)


def normalize_database_url(url):
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def get_source_key(source_engine, source_identifier=None):
    if source_identifier:
        identity = source_identifier
    elif source_engine.dialect.name == "sqlite":
        database = source_engine.url.database or ":memory:"
        if database == ":memory:":
            identity = "sqlite::memory:"
        else:
            identity = f"sqlite:{Path(database).resolve()}"
    else:
        url = source_engine.url
        identity = "|".join(
            (
                url.drivername,
                url.username or "",
                url.host or "",
                str(url.port or ""),
                url.database or "",
            )
        )
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()


def serialize_conflict_row(values, model):
    safe_values = dict(values)
    if model is User and "password" in safe_values:
        safe_values["password"] = "[redacted]"
    return json.dumps(
        safe_values,
        ensure_ascii=False,
        sort_keys=True,
        default=str,
    )


def migrate_databases(source_engine, target_engine, source_identifier=None):
    db.metadata.create_all(target_engine)
    source_tables = set(inspect(source_engine).get_table_names())
    target_session = sessionmaker(bind=target_engine)()
    source_session = sessionmaker(bind=source_engine)()
    source_key = get_source_key(source_engine, source_identifier)
    conflicts = 0

    try:
        for model in MODELS:
            table_name = model.__tablename__
            if table_name not in source_tables:
                print(f"Skipping missing source table: {table_name}")
                continue

            mapper = inspect(model)
            inserted = 0
            skipped = 0
            rekeyed = 0
            table_conflicts = 0
            for row in source_session.query(model).yield_per(500):
                values = {
                    column.key: getattr(row, column.key)
                    for column in mapper.column_attrs
                }
                key = tuple(values[column.key] for column in mapper.primary_key)
                identity = key[0] if len(key) == 1 else key

                if model in HISTORY_MODELS:
                    source_row_id = str(values["id"])
                    migration_identity = (
                        source_key,
                        table_name,
                        source_row_id,
                    )
                    if target_session.get(MigrationRecord, migration_identity):
                        skipped += 1
                        continue

                    natural_key = {
                        key: value for key, value in values.items() if key != "id"
                    }
                    matching_query = target_session.query(model)
                    for key, value in natural_key.items():
                        column = getattr(model, key)
                        matching_query = matching_query.filter(
                            column.is_(None) if value is None else column == value
                        )
                    matching_rows = matching_query.order_by(model.id).all()
                    unclaimed_match = next(
                        (
                            candidate
                            for candidate in matching_rows
                            if target_session.query(MigrationRecord)
                            .filter_by(
                                source_key=source_key,
                                table_name=table_name,
                                target_id=candidate.id,
                            )
                            .first()
                            is None
                        ),
                        None,
                    )
                    if unclaimed_match is not None:
                        target_session.add(
                            MigrationRecord(
                                source_key=source_key,
                                table_name=table_name,
                                source_row_id=source_row_id,
                                target_id=unclaimed_match.id,
                            )
                        )
                        skipped += 1
                        continue

                    insert_values = dict(values)
                    if target_session.get(model, identity) is not None:
                        insert_values.pop("id")
                        rekeyed += 1
                else:
                    insert_values = values
                    existing = target_session.get(model, identity)
                    if existing is not None:
                        skipped += 1
                        if any(
                            getattr(existing, column.key) != values[column.key]
                            for column in mapper.column_attrs
                        ):
                            table_conflicts += 1
                            conflicts += 1
                            source_row_id = json.dumps(
                                identity, ensure_ascii=False, default=str
                            )
                            conflict_identity = (
                                source_key,
                                table_name,
                                source_row_id,
                            )
                            if not target_session.get(
                                MigrationConflict, conflict_identity
                            ):
                                target_session.add(
                                    MigrationConflict(
                                        source_key=source_key,
                                        table_name=table_name,
                                        source_row_id=source_row_id,
                                        source_data=serialize_conflict_row(
                                            values, model
                                        ),
                                        target_data=serialize_conflict_row(
                                            {
                                                column.key: getattr(
                                                    existing, column.key
                                                )
                                                for column in mapper.column_attrs
                                            },
                                            model,
                                        ),
                                    )
                                )
                        continue

                migrated_row = model(**insert_values)
                target_session.add(migrated_row)
                if model in HISTORY_MODELS:
                    target_session.flush()
                    target_session.add(
                        MigrationRecord(
                            source_key=source_key,
                            table_name=table_name,
                            source_row_id=source_row_id,
                            target_id=migrated_row.id,
                        )
                    )
                inserted += 1
                if inserted % 500 == 0:
                    target_session.commit()

            target_session.commit()
            print(
                f"{table_name}: copied {inserted}, kept existing {skipped}, "
                f"rekeyed histories {rekeyed}, conflicts {table_conflicts}."
            )

        if target_engine.dialect.name == "postgresql":
            for table_name in ("histories", "prog_histories"):
                target_session.execute(
                    text(
                        f"SELECT setval("
                        f"pg_get_serial_sequence('{table_name}', 'id'), "
                        f"GREATEST(COALESCE(MAX(id), 1), 1), "
                        f"MAX(id) IS NOT NULL) FROM {table_name}"
                    )
                )
            target_session.commit()
    finally:
        source_session.close()
        target_session.close()

    return conflicts


def main():
    source_url = os.environ.get("SOURCE_DATABASE_URL")
    target_url = os.environ.get("DATABASE_URL")
    if not source_url or not target_url:
        raise RuntimeError(
            "Set SOURCE_DATABASE_URL and DATABASE_URL before running the migration."
        )

    normalized_source = normalize_database_url(source_url)
    normalized_target = normalize_database_url(target_url)
    if normalized_source == normalized_target:
        raise ValueError("Source and target databases must be different.")
    source_engine = create_engine(normalized_source, pool_pre_ping=True)
    target_engine = create_engine(normalized_target, pool_pre_ping=True)
    try:
        conflicts = migrate_databases(
            source_engine,
            target_engine,
            source_identifier=os.environ.get("SOURCE_DATABASE_ID"),
        )
    finally:
        source_engine.dispose()
        target_engine.dispose()

    if conflicts:
        raise RuntimeError(
            f"Database copy found {conflicts} conflicting rows with existing "
            "primary keys. Destination rows were kept; review the source and "
            "destination before treating the migration as complete."
        )
    print("Database copy complete. The source database was not modified.")


if __name__ == "__main__":
    main()
