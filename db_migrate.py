import hashlib
import json
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from migrate_database import normalize_database_url
from models import (
    Coach,
    Folder,
    GoalTracker,
    History,
    Lineup,
    MigrationRecord,
    Player,
    ProgHistory,
    User,
    db,
)


BASE_DIR = Path(os.environ.get("DATA_DIR", "efootball_data"))
MODELS = (User, Player, Coach, Folder, History, ProgHistory, Lineup, GoalTracker)
COLLECTIONS = (
    ("jugadores.json", Player),
    ("tecnicos.json", Coach),
    ("carpetas.json", Folder),
)


def read_json(path, expected_type, default):
    if not path.exists():
        return default
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON in {path}: {error}") from error
    if not isinstance(value, expected_type):
        raise ValueError(
            f"Expected {expected_type.__name__} in {path}, "
            f"found {type(value).__name__}."
        )
    return value


def encode_json(value):
    return json.dumps(value, ensure_ascii=False)


def get_json_source_key(path):
    identity = f"json:{path.resolve()}"
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()


def add_if_missing(session, model, identity, values, stats):
    existing = session.get(model, identity)
    if existing is None:
        session.add(model(**values))
        stats["inserted"] += 1
        return

    if any(getattr(existing, key) != value for key, value in values.items()):
        stats["conflicts"] += 1


def add_goal_tracker_if_missing(session, username, values, stats):
    existing = session.get(GoalTracker, username)
    if existing is None:
        session.add(GoalTracker(**values))
        stats["inserted"] += 1
        return

    current_data = json.loads(existing.data)
    source_data = json.loads(values["data"])
    tracked_collections = (
        "delanteros",
        "historial_partidos",
        "temporadas_archivadas",
    )
    current_has_records = any(current_data.get(key) for key in tracked_collections)
    source_has_records = any(source_data.get(key) for key in tracked_collections)

    if not current_has_records and source_has_records:
        existing.data = values["data"]
        stats["restored"] += 1
    elif existing.data != values["data"]:
        stats["conflicts"] += 1


def import_user_directory(session, username, directory, stats):
    for filename, model in COLLECTIONS:
        for record in read_json(directory / filename, list, []):
            if not isinstance(record, dict):
                raise ValueError(f"Expected an object in {directory / filename}.")
            record_id = record.get("id")
            if record_id is None or str(record_id) == "":
                raise ValueError(
                    f"Record without an id in {directory / filename}; "
                    "nothing was imported."
                )
            record_id = str(record_id)
            if len(record_id) > 20:
                raise ValueError(
                    f"Record id exceeds 20 characters in {directory / filename}."
                )
            values = {
                "username": username,
                "id": record_id,
                "data": encode_json(record),
            }
            add_if_missing(session, model, (username, record_id), values, stats)

    for filename, model in (
        ("historial.json", History),
        ("prog_historial.json", ProgHistory),
    ):
        histories = read_json(directory / filename, dict, {})
        source_key = get_json_source_key(directory / filename)
        for player_id, snapshots in histories.items():
            if not isinstance(snapshots, list):
                raise ValueError(
                    f"Expected a list of snapshots for {player_id} in "
                    f"{directory / filename}."
                )
            occurrences = {}
            for snapshot_index in reversed(range(len(snapshots))):
                snapshot = snapshots[snapshot_index]
                if not isinstance(snapshot, dict):
                    raise ValueError(
                        f"Expected an object snapshot for {player_id} in "
                        f"{directory / filename}."
                    )
                values = {
                    "username": username,
                    "player_id": str(player_id),
                    "snapshot": encode_json(snapshot),
                    "created_at": snapshot.get("_ts", ""),
                }
                source_row_id = f"{player_id}:{snapshot_index}"
                migration_identity = (source_key, model.__tablename__, source_row_id)
                if session.get(MigrationRecord, migration_identity):
                    continue

                natural_key = tuple(values.values())
                occurrence = occurrences.get(natural_key, 0)
                occurrences[natural_key] = occurrence + 1
                matching_rows = (
                    session.query(model)
                    .filter_by(**values)
                    .order_by(model.id)
                    .all()
                )
                if len(matching_rows) > occurrence:
                    target_id = matching_rows[occurrence].id
                else:
                    migrated_row = model(**values)
                    session.add(migrated_row)
                    session.flush()
                    target_id = migrated_row.id
                    stats["inserted"] += 1
                session.add(
                    MigrationRecord(
                        source_key=source_key,
                        table_name=model.__tablename__,
                        source_row_id=source_row_id,
                        target_id=target_id,
                    )
                )

    lineups = read_json(directory / "plantillas.json", dict, {})
    for coach_id, data in lineups.items():
        values = {
            "username": username,
            "coach_id": str(coach_id),
            "data": encode_json(data),
        }
        add_if_missing(
            session,
            Lineup,
            (username, str(coach_id)),
            values,
            stats,
        )

    goals = read_json(directory / "goleadores.json", dict, {})
    if goals:
        values = {"username": username, "data": encode_json(goals)}
        add_goal_tracker_if_missing(session, username, values, stats)


def migrate():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "Set DATABASE_URL to the destination database before importing JSON."
        )

    users_file = BASE_DIR / "usuarios.json"
    users = read_json(users_file, dict, {})
    users_dir = BASE_DIR / "usuarios"
    legacy_files = (
        "jugadores.json",
        "tecnicos.json",
        "carpetas.json",
        "plantillas.json",
        "historial.json",
        "prog_historial.json",
        "goleadores.json",
    )
    has_legacy_data = any((BASE_DIR / filename).exists() for filename in legacy_files)

    for username, user_data in users.items():
        if not isinstance(user_data, dict) or not user_data.get("password"):
            raise ValueError(f"User {username!r} has no valid password in {users_file}.")
        if len(username) > 80:
            raise ValueError(f"Username exceeds 80 characters in {users_file}.")

    directories = []
    if users_dir.exists():
        for user_directory in sorted(users_dir.iterdir()):
            if not user_directory.is_dir():
                continue
            if user_directory.name not in users:
                raise ValueError(
                    f"Data directory {user_directory} has no matching account in "
                    f"{users_file}; create or restore that account before importing."
                )
            directories.append((user_directory.name, user_directory))

    if has_legacy_data and "admin" not in users:
        raise ValueError(
            f"Legacy game data exists in {BASE_DIR}, but no admin account exists "
            f"in {users_file}; nothing was imported."
        )

    engine = create_engine(normalize_database_url(database_url), pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    stats = {"inserted": 0, "restored": 0, "conflicts": 0}
    db.metadata.create_all(engine)

    try:
        with Session.begin() as session:
            for username, user_data in users.items():
                values = {
                    "username": username,
                    "password": user_data["password"],
                    "nombre": user_data.get("nombre") or username,
                    "created": user_data.get("created", ""),
                    "pregunta": user_data.get("pregunta"),
                    "respuesta": user_data.get("respuesta"),
                }
                add_if_missing(session, User, username, values, stats)

            for username, directory in directories:
                import_user_directory(session, username, directory, stats)

            if has_legacy_data:
                import_user_directory(session, "admin", BASE_DIR, stats)
    finally:
        engine.dispose()

    print(f"JSON records inserted: {stats['inserted']}.")
    if stats["restored"]:
        print(f"Empty scorer records restored: {stats['restored']}.")
    if stats["conflicts"]:
        raise RuntimeError(
            f"Import completed without overwriting existing rows, but found "
            f"{stats['conflicts']} conflicting records. Review those records "
            "before considering the migration complete."
        )
    print("JSON migration complete. Original files were not modified.")


if __name__ == "__main__":
    migrate()
