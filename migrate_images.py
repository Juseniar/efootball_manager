import json
import mimetypes
import os
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from migrate_database import normalize_database_url
from models import Coach, GoalTracker, Player
from storage import ensure_public_bucket, upload_public_image


def migrate_image_reference(username, image_url, data_dir, uploaded_urls):
    if not isinstance(image_url, str):
        return image_url, False, False
    path_parts = PurePosixPath(unquote(urlsplit(image_url).path)).parts
    if path_parts and path_parts[0] == "/":
        path_parts = path_parts[1:]
    if (
        len(path_parts) < 3
        or path_parts[0] != "imagenes"
        or path_parts[1] != username
    ):
        return image_url, False, False
    if Path(username).name != username or username in (".", ".."):
        print("Skipping an unsafe username in an image path.")
        return image_url, False, False

    relative_image = PurePosixPath(*path_parts[2:])
    if not relative_image.parts or ".." in relative_image.parts:
        print(f"Skipping unsafe image path for {username}.")
        return image_url, False, False

    image_root = (data_dir / "usuarios" / username / "imagenes").resolve()
    image_path = (image_root / Path(*relative_image.parts)).resolve()
    try:
        image_path.relative_to(image_root)
    except ValueError:
        print(f"Skipping image outside the user folder for {username}.")
        return image_url, False, False

    cache_key = (username, relative_image.as_posix())
    if cache_key in uploaded_urls:
        return uploaded_urls[cache_key], True, False
    if not image_path.is_file():
        print(f"Image file not found for {username}: {relative_image.as_posix()}")
        return image_url, False, True

    object_path = f"{username}/{relative_image.as_posix()}"
    content_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
    uploaded_urls[cache_key] = upload_public_image(
        object_path,
        image_path.read_bytes(),
        content_type,
    )
    return uploaded_urls[cache_key], True, False


def migrate_image_references(value, username, data_dir, uploaded_urls):
    updated = 0
    missing = 0
    if isinstance(value, dict):
        if "imagen" in value:
            image_url, changed, file_missing = migrate_image_reference(
                username, value["imagen"], data_dir, uploaded_urls
            )
            if changed:
                value["imagen"] = image_url
                updated += 1
            if file_missing:
                missing += 1
        for child in value.values():
            child_updated, child_missing = migrate_image_references(
                child, username, data_dir, uploaded_urls
            )
            updated += child_updated
            missing += child_missing
    elif isinstance(value, list):
        for child in value:
            child_updated, child_missing = migrate_image_references(
                child, username, data_dir, uploaded_urls
            )
            updated += child_updated
            missing += child_missing
    return updated, missing


def migrate_model_images(session, model, data_dir, uploaded_urls):
    uploaded = 0
    missing = 0
    for row in session.query(model).yield_per(200):
        data = json.loads(row.data)
        updated, missing_files = migrate_image_references(
            data, row.username, data_dir, uploaded_urls
        )
        if updated:
            row.data = json.dumps(data, ensure_ascii=False)
            uploaded += updated
        missing += missing_files

    session.commit()
    print(f"{model.__tablename__}: updated {uploaded}; missing files {missing}.")


def main():
    database_url = os.environ.get("DATABASE_URL")
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not database_url or not supabase_url or not service_key:
        raise RuntimeError(
            "Set DATABASE_URL, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY first."
        )

    data_dir = Path(os.environ.get("DATA_DIR", "efootball_data"))
    ensure_public_bucket()
    engine = create_engine(normalize_database_url(database_url), pool_pre_ping=True)
    session = sessionmaker(engine)()
    uploaded_urls = {}
    try:
        for model in (Player, Coach, GoalTracker):
            migrate_model_images(session, model, data_dir, uploaded_urls)
    finally:
        session.close()
        engine.dispose()

    print("Image migration complete. Local image files were not deleted.")


if __name__ == "__main__":
    main()
