import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime
from pathlib import Path

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
    User,
    db,
)
from storage import upload_public_image


BASE_DIR = Path(os.environ.get("DATA_DIR", "efootball_data"))
BASE_DIR.mkdir(exist_ok=True)
ADMIN_USERS = {"admin"}


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
    db.session.delete(user)
    db.session.commit()
    return json_response({"ok": True})


@require_GET
def admin_yo(request):
    username = usuario_actual(request)
    if not username:
        return json_response({"error": "no auth"}, 401)
    return json_response({"username": username, "es_admin": es_admin(request)})
