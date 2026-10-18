import base64
import binascii
import hashlib
import hmac
import json
import mimetypes
import os
import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit

from django.http import (
    FileResponse,
    HttpResponseNotFound,
    JsonResponse,
    QueryDict,
)
from django.http.multipartparser import MultiPartParser, MultiPartParserError
from django.shortcuts import redirect
from django.utils.datastructures import MultiValueDict
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from sqlalchemy import text
from werkzeug.security import check_password_hash, generate_password_hash

from django_project.database import ROOT
from models import (
    Coach,
    Folder,
    GoalTracker,
    History,
    Lineup,
    Player,
    ProgHistory,
    SquadSnapshot,
    User,
    db,
)
from storage import download_public_image, upload_public_image


BASE_DIR = Path(os.environ.get("DATA_DIR", "efootball_data"))
BASE_DIR.mkdir(exist_ok=True)
ADMIN_USERS = {"admin"}
MAX_BACKUP_BYTES = 25 * 1024 * 1024
MAX_BACKUP_IMAGE_BYTES = 10 * 1024 * 1024


def json_response(data, status=200):
    return JsonResponse(data, safe=not isinstance(data, list), status=status)


def json_body(request):
    try:
        data = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, json_response({"error": "JSON inválido"}, 400)
    if not isinstance(data, dict):
        return None, json_response({"error": "Se esperaba un objeto JSON"}, 400)
    return data, None


def form_data(request):
    if request.method == "POST":
        return request.POST.dict(), request.FILES
    if request.content_type == "multipart/form-data":
        try:
            fields, files = MultiPartParser(
                request.META,
                request,
                request.upload_handlers,
                request.encoding,
            ).parse()
        except MultiPartParserError:
            return None, json_response({"error": "Formulario multipart inválido"}, 400)
        return fields.dict(), files
    if request.content_type == "application/x-www-form-urlencoded":
        try:
            fields = QueryDict(request.body, encoding=request.encoding)
        except UnicodeDecodeError:
            return None, json_response({"error": "Formulario inválido"}, 400)
        return fields.dict(), MultiValueDict()
    return {}, MultiValueDict()


def hash_pwd(password):
    return generate_password_hash(password, method="pbkdf2:sha256", salt_length=8)


def verificar_password(stored, supplied):
    if stored.startswith("pbkdf2:"):
        return check_password_hash(stored, supplied)
    legacy_hash = hashlib.sha256(supplied.encode()).hexdigest()
    return hmac.compare_digest(stored, legacy_hash)


def usuario_actual(request):
    return request.session.get("username")


def authenticated_user(request):
    username = usuario_actual(request)
    if not username:
        return None, json_response({"error": "no auth"}, 401)
    return username, None


def user_dir(username):
    directory = BASE_DIR / "usuarios" / username
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "imagenes").mkdir(exist_ok=True)
    return directory


def save_img(upload, prefix, record_id, username):
    if upload and upload.name:
        extension = Path(upload.name).suffix or ".png"
        name = f"{prefix}_{record_id}{extension}"
        if os.environ.get("SUPABASE_URL") or os.environ.get(
            "SUPABASE_SERVICE_ROLE_KEY"
        ):
            return upload_public_image(
                f"{username}/{name}",
                upload.read(),
                upload.content_type or "application/octet-stream",
            )
        image_dir = user_dir(username) / "imagenes"
        image_dir.mkdir(exist_ok=True)
        with (image_dir / name).open("wb") as destination:
            for chunk in upload.chunks():
                destination.write(chunk)
        return f"/imagenes/{username}/{name}"
    return None


def _file_response(path, content_type=None):
    return FileResponse(path.open("rb"), content_type=content_type)


def _safe_file(base, relative):
    root = Path(base).resolve()
    candidate = (root / relative).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


def _user_data(username):
    return {
        "jugadores": [
            {"id": item.id, "data": item.parsed_data}
            for item in Player.query.filter_by(username=username).order_by(Player.id)
        ],
        "tecnicos": [
            {"id": item.id, "data": item.parsed_data}
            for item in Coach.query.filter_by(username=username).order_by(Coach.id)
        ],
        "carpetas": [
            {"id": item.id, "data": item.parsed_data}
            for item in Folder.query.filter_by(username=username).order_by(Folder.id)
        ],
        "plantillas": {
            item.coach_id: json.loads(item.data)
            for item in Lineup.query.filter_by(username=username).order_by(Lineup.coach_id)
        },
        "historial": [
            {
                "player_id": item.player_id,
                "snapshot": json.loads(item.snapshot),
                "created_at": item.created_at,
            }
            for item in History.query.filter_by(username=username).order_by(History.id)
        ],
        "prog_historial": [
            {
                "player_id": item.player_id,
                "snapshot": json.loads(item.snapshot),
                "created_at": item.created_at,
            }
            for item in ProgHistory.query.filter_by(username=username).order_by(ProgHistory.id)
        ],
        "goleadores": next(
            (
                item.parsed_data
                for item in GoalTracker.query.filter_by(username=username).limit(1)
            ),
            None,
        ),
    }


def _backup_image(reference, username):
    parsed = urlsplit(reference)
    path = unquote(parsed.path)
    image_dir = user_dir(username) / "imagenes"
    local_prefix = f"/imagenes/{username}/"
    if not parsed.scheme and path.startswith(local_prefix):
        filename = path[len(local_prefix):]
        if not filename or Path(filename).name != filename:
            return None
        image_path = _safe_file(image_dir, filename)
        if not image_path:
            return None
        content = image_path.read_bytes()
        object_path = None
    else:
        storage_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        if not storage_url:
            return None
        storage_origin = urlsplit(storage_url)
        if (parsed.scheme, parsed.netloc) != (storage_origin.scheme, storage_origin.netloc):
            return None
        bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "player-images")
        object_prefix = f"/storage/v1/object/public/{bucket}/{username}/"
        if not path.startswith(object_prefix):
            return None
        object_path = path[len(f"/storage/v1/object/public/{bucket}/"):]
        if any(part in ("", ".", "..") for part in object_path.split("/")):
            return None
        content = download_public_image(object_path, MAX_BACKUP_IMAGE_BYTES)

    if len(content) > MAX_BACKUP_IMAGE_BYTES:
        raise ValueError("Una imagen supera el límite de 10 MB del respaldo.")
    filename = Path(object_path or filename).name
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    if not content_type.startswith("image/"):
        return None
    return {
        "reference": reference,
        "filename": filename,
        "object_path": object_path,
        "content_type": content_type,
        "content_base64": base64.b64encode(content).decode("ascii"),
    }


def _make_backup(username):
    data = _user_data(username)
    versions = [
        {
            "id": item.id,
            "name": item.name,
            "created_at": item.created_at,
            "data": json.loads(item.data),
        }
        for item in SquadSnapshot.query.filter_by(username=username).order_by(
            SquadSnapshot.created_at, SquadSnapshot.id
        )
    ]
    image_refs = set()
    for collection in (data["jugadores"], data["tecnicos"]):
        for item in collection:
            reference = item["data"].get("imagen")
            if isinstance(reference, str) and reference and not reference.startswith("data:"):
                image_refs.add(reference)
    for version in versions:
        snapshot_data = version["data"]
        for key in ("jugadores", "tecnicos"):
            for item in snapshot_data.get(key, []):
                reference = item.get("data", {}).get("imagen")
                if isinstance(reference, str) and reference and not reference.startswith("data:"):
                    image_refs.add(reference)

    images = []
    warnings = []
    total_image_bytes = 0
    for reference in sorted(image_refs):
        try:
            image = _backup_image(reference, username)
        except (OSError, RuntimeError, ValueError) as error:
            warnings.append(f"No se pudo incluir una imagen: {error}")
            continue
        if image:
            image_size = len(base64.b64decode(image["content_base64"]))
            if total_image_bytes + image_size > MAX_BACKUP_BYTES:
                warnings.append("Se omitieron imágenes al alcanzar el límite de 25 MB por respaldo.")
                continue
            total_image_bytes += image_size
            images.append(image)
        else:
            warnings.append(
                "Una imagen externa o ausente conserva su URL, pero no está incluida."
            )
    return {
        "format": "efootball-manager-backup",
        "version": 2,
        "created_at": datetime.now().astimezone().isoformat(),
        "data": data,
        "versions": versions,
        "images": images,
        "image_warnings": warnings,
    }


def _normalize_backup(backup, username):
    if not isinstance(backup, dict):
        raise ValueError("El respaldo debe ser un objeto JSON.")
    if backup.get("format") == "efootball-manager-backup":
        if backup.get("version") != 2:
            raise ValueError("La versión del respaldo no es compatible.")
        data = backup.get("data")
    else:
        data = backup

    if not isinstance(data, dict):
        raise ValueError("El respaldo no contiene datos válidos.")
    players = data.get("jugadores", [])
    coaches = data.get("tecnicos", [])
    folders = data.get("carpetas", [])
    if not all(isinstance(items, list) for items in (players, coaches, folders)):
        raise ValueError("Jugadores, técnicos y carpetas deben ser listas.")

    def normalize_records(records, label):
        normalized = []
        ids = set()
        for record in records:
            if not isinstance(record, dict):
                raise ValueError(f"Registro de {label} inválido.")
            item_data = record.get("data", record)
            if not isinstance(item_data, dict):
                raise ValueError(f"Registro de {label} inválido.")
            record_id = str(record.get("id") or item_data.get("id") or "")
            if not record_id or len(record_id) > 20 or record_id in ids:
                raise ValueError(f"ID inválido o duplicado en {label}.")
            ids.add(record_id)
            item_data = dict(item_data)
            item_data["id"] = record_id
            normalized.append({"id": record_id, "data": item_data})
        return normalized

    normalized = {
        "jugadores": normalize_records(players, "jugadores"),
        "tecnicos": normalize_records(coaches, "técnicos"),
        "carpetas": normalize_records(folders, "carpetas"),
        "plantillas": data.get("plantillas", {}),
        "historial": data.get("historial", []),
        "prog_historial": data.get("prog_historial", []),
        "goleadores": data.get("goleadores"),
    }

    # Accept the original browser backup format (maps keyed by player/coach ID).
    for key in ("historial", "prog_historial"):
        if isinstance(normalized[key], dict):
            normalized[key] = [
                {
                    "player_id": player_id,
                    "snapshot": snapshot,
                    "created_at": snapshot.get("_ts") if isinstance(snapshot, dict) else None,
                }
                for player_id, snapshots in normalized[key].items()
                if isinstance(snapshots, list)
                for snapshot in snapshots
            ]
    if not isinstance(normalized["plantillas"], dict):
        raise ValueError("Las alineaciones deben ser un objeto.")
    for coach_id, lineup in normalized["plantillas"].items():
        if not isinstance(coach_id, str) or len(coach_id) > 20 or not isinstance(lineup, (dict, list)):
            raise ValueError("Se encontró una alineación inválida.")
    for key in ("historial", "prog_historial"):
        for item in normalized[key]:
            if (
                not isinstance(item, dict)
                or not isinstance(item.get("snapshot"), dict)
                or not isinstance(item.get("player_id"), str)
            ):
                raise ValueError(f"Registro inválido en {key}.")
    if normalized["goleadores"] is not None and not isinstance(normalized["goleadores"], dict):
        raise ValueError("Los datos de goleadores no tienen un formato válido.")

    images = backup.get("images", [])
    if not isinstance(images, list):
        raise ValueError("La lista de imágenes no es válida.")
    decoded_images = {}
    total_image_bytes = 0
    for image in images:
        if not isinstance(image, dict):
            raise ValueError("El respaldo contiene una imagen inválida.")
        reference = image.get("reference")
        filename = image.get("filename")
        content_type = image.get("content_type")
        encoded = image.get("content_base64")
        if (
            not isinstance(reference, str)
            or not isinstance(filename, str)
            or Path(filename).name != filename
            or not isinstance(content_type, str)
            or not content_type.startswith("image/")
            or not isinstance(encoded, str)
        ):
            raise ValueError("Los metadatos de una imagen no son válidos.")
        object_path = image.get("object_path")
        if object_path is not None and (
            not isinstance(object_path, str)
            or not object_path.startswith(f"{username}/")
            or any(part in ("", ".", "..") for part in object_path.split("/"))
        ):
            raise ValueError("La ruta de una imagen no es válida.")
        try:
            content = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError) as error:
            raise ValueError("Una imagen del respaldo está dañada.") from error
        total_image_bytes += len(content)
        if len(content) > MAX_BACKUP_IMAGE_BYTES or total_image_bytes > MAX_BACKUP_BYTES:
            raise ValueError("Las imágenes superan el límite permitido del respaldo.")
        decoded_images[reference] = {
            "filename": filename,
            "object_path": object_path,
            "content_type": content_type,
            "content": content,
        }
    versions = backup.get("versions", [])
    if not isinstance(versions, list):
        raise ValueError("El historial de versiones no es válido.")
    normalized_versions = []
    version_ids = set()
    for version in versions:
        if (
            not isinstance(version, dict)
            or not isinstance(version.get("id"), str)
            or not version["id"]
            or len(version["id"]) > 36
            or version["id"] in version_ids
            or not isinstance(version.get("name"), str)
            or not version["name"]
            or len(version["name"]) > 120
            or (version.get("created_at") is not None and not isinstance(version["created_at"], str))
            or not isinstance(version.get("data"), dict)
        ):
            raise ValueError("Una versión guardada tiene un formato inválido.")
        version_ids.add(version["id"])
        version_data, _, _ = _normalize_backup({"data": version["data"]}, username)
        normalized_versions.append({**version, "data": version_data})
    return normalized, decoded_images, normalized_versions


def _replace_user_data(username, data, versions=()):
    for model in (History, ProgHistory, Folder, Coach, Player, Lineup, GoalTracker, SquadSnapshot):
        model.query.filter_by(username=username).delete(synchronize_session=False)
    db.session.flush()
    db.session.expunge_all()

    for model, collection in ((Player, data["jugadores"]), (Coach, data["tecnicos"]), (Folder, data["carpetas"])):
        db.session.add_all(
            model(username=username, id=item["id"], data=json.dumps(item["data"], ensure_ascii=False))
            for item in collection
        )
    db.session.add_all(
        Lineup(username=username, coach_id=coach_id, data=json.dumps(value, ensure_ascii=False))
        for coach_id, value in data["plantillas"].items()
    )
    db.session.add_all(
        History(
            username=username,
            player_id=item["player_id"],
            snapshot=json.dumps(item["snapshot"], ensure_ascii=False),
            created_at=item.get("created_at"),
        )
        for item in data["historial"]
    )
    db.session.add_all(
        ProgHistory(
            username=username,
            player_id=item["player_id"],
            snapshot=json.dumps(item["snapshot"], ensure_ascii=False),
            created_at=item.get("created_at"),
        )
        for item in data["prog_historial"]
    )
    if data["goleadores"] is not None:
        db.session.add(
            GoalTracker(username=username, data=json.dumps(data["goleadores"], ensure_ascii=False))
        )
    db.session.add_all(
        SquadSnapshot(
            id=version["id"],
            username=username,
            name=version["name"][:120],
            created_at=version.get("created_at") or datetime.now().isoformat(),
            data=json.dumps(version["data"], ensure_ascii=False),
        )
        for version in versions
    )
    db.session.commit()


def _restore_backup_images(username, image_map):
    reference_map = {}
    for reference, image in image_map.items():
        local_path = urlsplit(reference).path
        local_prefix = f"/imagenes/{username}/"
        if not urlsplit(reference).scheme and local_path.startswith(local_prefix):
            filename = image["filename"]
            target = user_dir(username) / "imagenes" / filename
            target.write_bytes(image["content"])
            reference_map[reference] = f"{local_prefix}{filename}"
            continue

        object_path = image.get("object_path")
        if object_path:
            reference_map[reference] = upload_public_image(
                object_path, image["content"], image["content_type"]
            )
    return reference_map


def _replace_image_references(data, reference_map):
    for collection in ("jugadores", "tecnicos"):
        for item in data.get(collection, []):
            record = item.get("data", item)
            reference = record.get("imagen")
            if reference in reference_map:
                record["imagen"] = reference_map[reference]


@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_backup(request):
    username, error = authenticated_user(request)
    if error:
        return error
    if request.method == "GET":
        return json_response(_make_backup(username))

    backup, error = json_body(request)
    if error:
        return error
    try:
        data, images, versions = _normalize_backup(backup, username)
        reference_map = _restore_backup_images(username, images)
        _replace_image_references(data, reference_map)
        for version in versions:
            _replace_image_references(version["data"], reference_map)
        _replace_user_data(username, data, versions)
    except ValueError as failure:
        return json_response({"error": str(failure)}, 400)
    except (OSError, RuntimeError) as failure:
        return json_response(
            {"error": f"No se pudo restaurar una imagen: {failure}"}, 502
        )
    return json_response(
        {
            "ok": True,
            "jugadores": len(data["jugadores"]),
            "tecnicos": len(data["tecnicos"]),
            "alineaciones": len(data["plantillas"]),
            "versiones": len(versions),
        }
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_versions(request):
    username, error = authenticated_user(request)
    if error:
        return error
    if request.method == "GET":
        versions = SquadSnapshot.query.filter_by(username=username).order_by(
            SquadSnapshot.created_at.desc(), SquadSnapshot.id.desc()
        )
        return json_response(
            [
                {
                    "id": item.id,
                    "name": item.name,
                    "created_at": item.created_at,
                    "jugadores": len(json.loads(item.data).get("jugadores", [])),
                    "tecnicos": len(json.loads(item.data).get("tecnicos", [])),
                }
                for item in versions
            ]
        )

    data, error = json_body(request)
    if error:
        return error
    name = (data.get("name") or "").strip()
    if not name or len(name) > 120:
        return json_response(
            {"error": "El nombre debe tener entre 1 y 120 caracteres."}, 400
        )
    snapshot = SquadSnapshot(
        id=str(uuid.uuid4()),
        username=username,
        name=name,
        created_at=datetime.now().astimezone().isoformat(),
        data=json.dumps(_user_data(username), ensure_ascii=False),
    )
    db.session.add(snapshot)
    db.session.commit()
    return json_response(
        {
            "id": snapshot.id,
            "name": snapshot.name,
            "created_at": snapshot.created_at,
        },
        201,
    )


@require_GET
def api_version_detail(request, snapshot_id):
    username, error = authenticated_user(request)
    if error:
        return error
    snapshot = SquadSnapshot.query.filter_by(
        username=username, id=snapshot_id
    ).first()
    if not snapshot:
        return json_response({"error": "Versión no encontrada."}, 404)
    return json_response(
        {
            "id": snapshot.id,
            "name": snapshot.name,
            "created_at": snapshot.created_at,
            "data": json.loads(snapshot.data),
        }
    )


@csrf_exempt
@require_POST
def api_restore_version(request, snapshot_id):
    username, error = authenticated_user(request)
    if error:
        return error
    snapshot = SquadSnapshot.query.filter_by(
        username=username, id=snapshot_id
    ).first()
    if not snapshot:
        return json_response({"error": "Versión no encontrada."}, 404)
    try:
        data, _, _ = _normalize_backup(
            {"format": "efootball-manager-backup", "version": 2, "data": json.loads(snapshot.data)},
            username,
        )
        versions = [
            {
                "id": item.id,
                "name": item.name,
                "created_at": item.created_at,
                "data": json.loads(item.data),
            }
            for item in SquadSnapshot.query.filter_by(username=username)
        ]
        _replace_user_data(username, data, versions)
    except ValueError as failure:
        return json_response({"error": str(failure)}, 400)
    return json_response({"ok": True})


@csrf_exempt
@require_POST
def api_delete_version(request, snapshot_id):
    username, error = authenticated_user(request)
    if error:
        return error
    snapshot = SquadSnapshot.query.filter_by(
        username=username, id=snapshot_id
    ).first()
    if not snapshot:
        return json_response({"error": "Versión no encontrada."}, 404)
    db.session.delete(snapshot)
    db.session.commit()
    return json_response({"ok": True})


@require_GET
def service_worker(request):
    return _file_response(ROOT / "sw.js", "application/javascript")


@require_GET
def manifest(request):
    return _file_response(ROOT / "manifest.json", "application/manifest+json")


@require_GET
def goleadores_js(request):
    return _file_response(ROOT / "goleadores.js", "application/javascript")


@require_GET
def goleadores_css(request):
    return _file_response(ROOT / "goleadores.css", "text/css")


@require_GET
def imagen(request, path):
    parts = Path(path).parts
    if len(parts) >= 2:
        candidate = _safe_file(
            BASE_DIR / "usuarios" / parts[0] / "imagenes",
            Path(*parts[1:]),
        )
        if candidate:
            return _file_response(candidate)

    for base in (
        BASE_DIR / "imagenes",
        ROOT / "imagenes",
        ROOT / "imagenes" / "jugadores",
        ROOT / "imagenes" / "tecnicos",
        ROOT / "imagenes" / "escudos",
    ):
        candidate = _safe_file(base, Path(path))
        if candidate:
            return _file_response(candidate)
    return HttpResponseNotFound("not found")


@require_GET
def get_escudos(request):
    directory = ROOT / "imagenes" / "escudos"
    if not directory.exists():
        return json_response([])
    extensions = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
    return json_response(
        [
            {"nombre": item.stem, "url": f"/imagenes/escudos/{item.name}"}
            for item in sorted(directory.iterdir())
            if item.suffix.lower() in extensions
        ]
    )


@require_GET
def get_login_cards(request):
    directory = ROOT / "imagenes" / "jugadores"
    if not directory.exists():
        return json_response([])
    extensions = {".png", ".jpg", ".jpeg", ".webp"}
    return json_response(
        [
            {"url": f"/imagenes/jugadores/{item.name}"}
            for item in sorted(directory.iterdir())
            if item.is_file() and item.suffix.lower() in extensions
        ]
    )


@require_GET
def health(request):
    db.session.execute(text("SELECT 1"))
    response = json_response({"ok": True})
    response["X-Application-Framework"] = "Django"
    return response


@require_GET
def index(request):
    if not usuario_actual(request):
        return redirect("/login")
    return _file_response(ROOT / "index.html", "text/html; charset=utf-8")


@require_GET
def login_page(request):
    if usuario_actual(request):
        return redirect("/")
    return _file_response(ROOT / "login.html", "text/html; charset=utf-8")


@csrf_exempt
@require_POST
def api_login(request):
    data, error = json_body(request)
    if error:
        return error
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""
    if not username or not password:
        return json_response({"error": "Usuario y contraseña requeridos"}, 400)

    user = db.session.get(User, username)
    if not user or not verificar_password(user.password, password):
        return json_response({"error": "Usuario o contraseña incorrectos"}, 401)

    if not user.password.startswith("pbkdf2:"):
        user.password = hash_pwd(password)
        db.session.commit()

    request.session["username"] = username
    request.session["nombre"] = user.nombre
    return json_response({"ok": True, "nombre": user.nombre})


@csrf_exempt
@require_POST
def api_registro(request):
    data, error = json_body(request)
    if error:
        return error
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""
    nombre = (data.get("nombre") or username).strip()
    if not username or not password:
        return json_response({"error": "Usuario y contraseña requeridos"}, 400)
    if len(username) < 3:
        return json_response({"error": "Usuario mínimo 3 caracteres"}, 400)
    if len(password) < 4:
        return json_response({"error": "Contraseña mínimo 4 caracteres"}, 400)
    if db.session.get(User, username):
        return json_response({"error": "Ese usuario ya existe"}, 409)

    user = User(
        username=username,
        password=hash_pwd(password),
        nombre=nombre,
        created=datetime.now().isoformat(),
    )
    db.session.add(user)
    db.session.commit()

    user_dir(username)
    request.session["username"] = username
    request.session["nombre"] = nombre
    return json_response({"ok": True, "nombre": nombre}, 201)


@csrf_exempt
@require_POST
def api_logout(request):
    request.session.flush()
    return json_response({"ok": True})


@csrf_exempt
@require_POST
def api_pregunta(request):
    data, error = json_body(request)
    if error:
        return error
    username = (data.get("username") or "").strip().lower()
    user = db.session.get(User, username)
    if not user:
        return json_response({"error": "Usuario no encontrado"}, 404)
    if not user.pregunta:
        return json_response(
            {"error": "Este usuario no tiene pregunta de seguridad configurada"},
            400,
        )
    return json_response({"pregunta": user.pregunta})


@csrf_exempt
@require_POST
def api_recuperar(request):
    data, error = json_body(request)
    if error:
        return error
    username = (data.get("username") or "").strip().lower()
    respuesta = (data.get("respuesta") or "").strip().lower()
    nueva_pwd = data.get("nueva_pwd") or ""
    user = db.session.get(User, username)
    if not user:
        return json_response({"error": "Usuario no encontrado"}, 404)
    if not user.pregunta:
        return json_response({"error": "Sin pregunta de seguridad"}, 400)
    if (user.respuesta or "").lower() != respuesta:
        return json_response({"error": "Respuesta incorrecta"}, 401)
    if len(nueva_pwd) < 4:
        return json_response({"error": "Contraseña mínimo 4 caracteres"}, 400)

    user.password = hash_pwd(nueva_pwd)
    db.session.commit()
    return json_response({"ok": True})


@csrf_exempt
@require_POST
def api_configurar_pregunta(request):
    username = usuario_actual(request)
    if not username:
        return json_response({"error": "no auth"}, 401)
    data, error = json_body(request)
    if error:
        return error
    pregunta = (data.get("pregunta") or "").strip()
    respuesta = (data.get("respuesta") or "").strip().lower()
    if not pregunta or not respuesta:
        return json_response({"error": "Pregunta y respuesta requeridas"}, 400)

    user = db.session.get(User, username)
    user.pregunta = pregunta
    user.respuesta = respuesta
    db.session.commit()
    return json_response({"ok": True})


@require_GET
def api_me(request):
    username = usuario_actual(request)
    if not username:
        return json_response({"error": "no auth"}, 401)
    return json_response(
        {"username": username, "nombre": request.session.get("nombre", username)}
    )


@require_GET
def get_jug(request):
    username, error = authenticated_user(request)
    if error:
        return error
    players = Player.query.filter_by(username=username).all()
    return json_response([player.parsed_data for player in players])


@csrf_exempt
@require_POST
def post_jug(request):
    username, error = authenticated_user(request)
    if error:
        return error
    data, files = form_data(request)
    if data is None:
        return files
    data["id"] = str(uuid.uuid4())[:8]
    image = save_img(files.get("imagen"), "j", data["id"], username)
    if image:
        data["imagen"] = image

    db.session.add(
        Player(
            username=username,
            id=data["id"],
            data=json.dumps(data, ensure_ascii=False),
        )
    )
    db.session.commit()
    return json_response(data, 201)


@csrf_exempt
@require_http_methods(["PUT"])
def put_jug(request, jid):
    username, error = authenticated_user(request)
    if error:
        return error
    player = Player.query.filter_by(username=username, id=jid).first()
    if not player:
        return json_response({"error": "no encontrado"}, 404)

    data, files = form_data(request)
    if data is None:
        return files
    data["id"] = jid
    image = save_img(files.get("imagen"), "j", jid, username)
    old_data = player.parsed_data
    data["imagen"] = image if image else old_data.get("imagen", "")
    player.data = json.dumps(data, ensure_ascii=False)

    snapshot = dict(data)
    snapshot["_ts"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    db.session.add(
        History(
            username=username,
            player_id=jid,
            snapshot=json.dumps(snapshot, ensure_ascii=False),
            created_at=snapshot["_ts"],
        )
    )
    db.session.commit()
    return json_response(data)


@csrf_exempt
@require_http_methods(["PATCH"])
def patch_jug_imagen(request, jid):
    username, error = authenticated_user(request)
    if error:
        return error
    player = Player.query.filter_by(username=username, id=jid).first()
    if not player:
        return json_response({"error": "no encontrado"}, 404)

    data, files = form_data(request)
    if data is None:
        return files
    image = files.get("imagen")
    if not image or not image.name:
        return json_response({"error": "imagen requerida"}, 400)
    image_url = save_img(image, "j", jid, username)
    if not image_url:
        return json_response({"error": "no se pudo guardar la imagen"}, 400)

    data = player.parsed_data
    data["imagen"] = f"{image_url}?v={uuid.uuid4().hex}"
    player.data = json.dumps(data, ensure_ascii=False)
    db.session.commit()
    return json_response({"id": jid, "imagen": data["imagen"]})


@csrf_exempt
@require_http_methods(["DELETE"])
def del_jug(request, jid):
    username, error = authenticated_user(request)
    if error:
        return error
    Player.query.filter_by(username=username, id=jid).delete()
    for folder in Folder.query.filter_by(username=username).all():
        if folder.parsed_data.get("jugador_id") == jid:
            db.session.delete(folder)
    db.session.commit()
    return json_response({"ok": True})


@require_GET
def get_tec(request):
    username, error = authenticated_user(request)
    if error:
        return error
    coaches = Coach.query.filter_by(username=username).all()
    return json_response([coach.parsed_data for coach in coaches])


@csrf_exempt
@require_POST
def post_tec(request):
    username, error = authenticated_user(request)
    if error:
        return error
    data, files = form_data(request)
    if data is None:
        return files
    data["id"] = str(uuid.uuid4())[:8]
    image = save_img(files.get("imagen"), "t", data["id"], username)
    if image:
        data["imagen"] = image
    db.session.add(
        Coach(
            username=username,
            id=data["id"],
            data=json.dumps(data, ensure_ascii=False),
        )
    )
    db.session.commit()
    return json_response(data, 201)


@csrf_exempt
@require_http_methods(["PUT"])
def put_tec(request, tid):
    username, error = authenticated_user(request)
    if error:
        return error
    coach = Coach.query.filter_by(username=username, id=tid).first()
    if not coach:
        return json_response({"error": "no encontrado"}, 404)

    data, files = form_data(request)
    if data is None:
        return files
    data["id"] = tid
    image = save_img(files.get("imagen"), "t", tid, username)
    data["imagen"] = image if image else coach.parsed_data.get("imagen", "")
    coach.data = json.dumps(data, ensure_ascii=False)
    db.session.commit()
    return json_response(data)


@csrf_exempt
@require_http_methods(["DELETE"])
def del_tec(request, tid):
    username, error = authenticated_user(request)
    if error:
        return error
    Coach.query.filter_by(username=username, id=tid).delete()
    for folder in Folder.query.filter_by(username=username).all():
        if folder.parsed_data.get("tecnico_id") == tid:
            db.session.delete(folder)
    Lineup.query.filter_by(username=username, coach_id=tid).delete()
    db.session.commit()
    return json_response({"ok": True})


def norm_pot(data):
    potenciador = (data.get("potenciador") or "").strip()
    manual = (data.get("potenciador_manual") or "").strip()
    if potenciador == "__manual__":
        data["potenciador"] = manual if manual and manual != "__manual__" else ""
    data.pop("potenciador_manual", None)
    return data


@require_GET
def get_car(request):
    username, error = authenticated_user(request)
    if error:
        return error
    folders = Folder.query.filter_by(username=username).all()
    output = []
    changed = False
    for folder in folders:
        data = folder.parsed_data
        normalized = norm_pot(dict(data))
        if normalized != data:
            folder.data = json.dumps(normalized, ensure_ascii=False)
            changed = True
        output.append(normalized)
    if changed:
        db.session.commit()
    return json_response(output)


@csrf_exempt
@require_POST
def post_car(request):
    username, error = authenticated_user(request)
    if error:
        return error
    data, error = form_data(request)
    if data is None:
        return error
    data = norm_pot(data)
    coach_id = data.get("tecnico_id")
    player_id = data.get("jugador_id")
    if coach_id and player_id:
        existing = Folder.query.filter_by(username=username).all()
        if any(
            item.parsed_data.get("tecnico_id") == coach_id
            and item.parsed_data.get("jugador_id") == player_id
            for item in existing
        ):
            return json_response(
                {"error": "Este jugador ya está en la carpeta de este técnico"},
                409,
            )
    data["id"] = str(uuid.uuid4())[:8]
    db.session.add(
        Folder(
            username=username,
            id=data["id"],
            data=json.dumps(data, ensure_ascii=False),
        )
    )
    db.session.commit()
    return json_response(data, 201)


@csrf_exempt
@require_http_methods(["PUT"])
def put_car(request, cid):
    username, error = authenticated_user(request)
    if error:
        return error
    folder = Folder.query.filter_by(username=username, id=cid).first()
    if not folder:
        return json_response({"error": "no encontrado"}, 404)
    data, error = form_data(request)
    if data is None:
        return error
    data = norm_pot(data)
    data["id"] = cid
    folder.data = json.dumps(data, ensure_ascii=False)
    db.session.commit()
    return json_response(data)


@csrf_exempt
@require_http_methods(["DELETE"])
def del_car(request, cid):
    username, error = authenticated_user(request)
    if error:
        return error
    Folder.query.filter_by(username=username, id=cid).delete()
    db.session.commit()
    return json_response({"ok": True})


@require_GET
def get_hist(request, jid):
    username, error = authenticated_user(request)
    if error:
        return error
    histories = (
        History.query.filter_by(username=username, player_id=jid)
        .order_by(History.id.desc())
        .all()
    )
    return json_response([json.loads(item.snapshot) for item in histories])


@require_GET
def get_prog_hist(request, jid):
    username, error = authenticated_user(request)
    if error:
        return error
    histories = (
        ProgHistory.query.filter_by(username=username, player_id=jid)
        .order_by(ProgHistory.id.desc())
        .all()
    )
    return json_response([json.loads(item.snapshot) for item in histories])


@csrf_exempt
@require_POST
def post_prog_hist(request, jid):
    username, error = authenticated_user(request)
    if error:
        return error
    snapshot, error = json_body(request)
    if error:
        return error
    snapshot["_ts"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    db.session.add(
        ProgHistory(
            username=username,
            player_id=jid,
            snapshot=json.dumps(snapshot, ensure_ascii=False),
            created_at=snapshot["_ts"],
        )
    )
    db.session.commit()
    return json_response(snapshot, 201)


@require_GET
def get_plt(request, tid):
    username, error = authenticated_user(request)
    if error:
        return error
    lineup = Lineup.query.filter_by(username=username, coach_id=tid).first()
    if lineup:
        data = json.loads(lineup.data)
        if isinstance(data, list):
            data = {"posiciones": data, "dibujos": []}
        return json_response(data)
    return json_response({"posiciones": [], "dibujos": []})


@csrf_exempt
@require_POST
def post_plt(request, tid):
    username, error = authenticated_user(request)
    if error:
        return error
    data, error = json_body(request)
    if error:
        return error
    lineup = Lineup.query.filter_by(username=username, coach_id=tid).first()
    if lineup:
        lineup.data = json.dumps(data, ensure_ascii=False)
    else:
        db.session.add(
            Lineup(
                username=username,
                coach_id=tid,
                data=json.dumps(data, ensure_ascii=False),
            )
        )
    db.session.commit()
    return json_response(data)


@require_GET
def get_goleadores(request):
    username, error = authenticated_user(request)
    if error:
        return error
    tracker = GoalTracker.query.filter_by(username=username).first()
    if tracker:
        return json_response(tracker.parsed_data)

    default_data = {
        "delanteros": [],
        "estrella_id": None,
        "meta_modo": "max",
        "meta_fija": 20,
        "temporada": "Temporada Actual",
        "historial_partidos": [],
        "temporadas_archivadas": [],
    }
    db.session.add(
        GoalTracker(
            username=username,
            data=json.dumps(default_data, ensure_ascii=False),
        )
    )
    db.session.commit()
    return json_response(default_data)


@csrf_exempt
@require_POST
def post_goleadores(request):
    username, error = authenticated_user(request)
    if error:
        return error
    data, error = json_body(request)
    if error:
        return error
    tracker = GoalTracker.query.filter_by(username=username).first()
    if tracker:
        tracker.data = json.dumps(data, ensure_ascii=False)
    else:
        db.session.add(
            GoalTracker(
                username=username,
                data=json.dumps(data, ensure_ascii=False),
            )
        )
    db.session.commit()
    return json_response({"ok": True, "data": data})


def es_admin(request):
    return usuario_actual(request) in ADMIN_USERS


@require_GET
def admin_usuarios(request):
    if not es_admin(request):
        return json_response({"error": "no autorizado"}, 403)
    users = User.query.all()
    result = []
    for user in users:
        result.append(
            {
                "username": user.username,
                "nombre": user.nombre,
                "created": user.created,
                "tiene_pregunta": bool(user.pregunta),
                "jugadores": Player.query.filter_by(
                    username=user.username
                ).count(),
                "tecnicos": Coach.query.filter_by(username=user.username).count(),
                "carpetas": Folder.query.filter_by(username=user.username).count(),
            }
        )
    result.sort(key=lambda item: item["created"] or "", reverse=True)
    return json_response(result)


@csrf_exempt
@require_POST
def admin_reset_pwd(request):
    if not es_admin(request):
        return json_response({"error": "no autorizado"}, 403)
    data, error = json_body(request)
    if error:
        return error
    username = (data.get("username") or "").strip().lower()
    nueva_pwd = data.get("nueva_pwd") or ""
    if len(nueva_pwd) < 4:
        return json_response({"error": "Mínimo 4 caracteres"}, 400)
    user = db.session.get(User, username)
    if not user:
        return json_response({"error": "Usuario no encontrado"}, 404)
    user.password = hash_pwd(nueva_pwd)
    db.session.commit()
    return json_response({"ok": True})


@csrf_exempt
@require_POST
def admin_eliminar_usuario(request):
    if not es_admin(request):
        return json_response({"error": "no autorizado"}, 403)
    data, error = json_body(request)
    if error:
        return error
    username = (data.get("username") or "").strip().lower()
    if username == usuario_actual(request):
        return json_response({"error": "No puedes eliminarte a ti mismo"}, 400)
    user = db.session.get(User, username)
    if not user:
        return json_response({"error": "Usuario no encontrado"}, 404)

    Player.query.filter_by(username=username).delete()
    Coach.query.filter_by(username=username).delete()
    Folder.query.filter_by(username=username).delete()
    History.query.filter_by(username=username).delete()
    ProgHistory.query.filter_by(username=username).delete()
    Lineup.query.filter_by(username=username).delete()
    GoalTracker.query.filter_by(username=username).delete()
    SquadSnapshot.query.filter_by(username=username).delete()
    db.session.delete(user)
    db.session.commit()
    return json_response({"ok": True})


@require_GET
def admin_yo(request):
    username = usuario_actual(request)
    if not username:
        return json_response({"error": "no auth"}, 401)
    return json_response({"username": username, "es_admin": es_admin(request)})
