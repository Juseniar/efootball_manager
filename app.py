"""eFootball Manager v3 — Multi-usuario."""
import hashlib
import hmac
import json
import os
import secrets
import uuid
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, send_file, session, redirect
from sqlalchemy import text
from models import db, User, Player, Coach, Folder, History, ProgHistory, Lineup, GoalTracker
from storage import upload_public_image
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__, static_folder="static")
app.secret_key = os.environ.get("SECRET_KEY", "local-development-only-change-me")

LOCAL_DATABASE_PATH = Path(__file__).resolve().parent / "instance" / "database.db"
LOCAL_DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{LOCAL_DATABASE_PATH.as_posix()}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
database_url = os.environ.get("DATABASE_URL")
if database_url:
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace(
            "postgresql://", "postgresql+psycopg://", 1
        )
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = bool(os.environ.get("RENDER"))
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}
db.init_app(app)

with app.app_context():
    db.create_all()

@app.after_request
def no_cache(response):
    if request.path in ('/', '/login') or request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

BASE_DIR = Path(os.environ.get("DATA_DIR", "efootball_data"))
BASE_DIR.mkdir(exist_ok=True)

def hash_pwd(pwd):
    return generate_password_hash(pwd, method="pbkdf2:sha256", salt_length=8)

def verificar_password(stored, supplied):
    if stored.startswith("pbkdf2:"):
        return check_password_hash(stored, supplied)
    legacy_hash = hashlib.sha256(supplied.encode()).hexdigest()
    return hmac.compare_digest(stored, legacy_hash)

def user_dir(username):
    d = BASE_DIR / "usuarios" / username
    d.mkdir(parents=True, exist_ok=True)
    (d / "imagenes").mkdir(exist_ok=True)
    return d

def usuario_actual():
    return session.get("username")

def requiere_login():
    if not usuario_actual():
        return redirect("/login")
    return None

def save_img(f, prefix, id_, username):
    if f and f.filename:
        ext = Path(f.filename).suffix or ".png"
        name = f"{prefix}_{id_}{ext}"
        if os.environ.get("SUPABASE_URL") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
            return upload_public_image(
                f"{username}/{name}",
                f.read(),
                f.mimetype or "application/octet-stream",
            )
        img_dir = user_dir(username) / "imagenes"
        img_dir.mkdir(exist_ok=True)
        f.save(img_dir / name)
        return f"/imagenes/{username}/{name}"
    return None

# ── Rutas estáticas ───────────────────────────────────────────────────────────
@app.route("/sw.js")
def sw(): return send_file("sw.js", mimetype="application/javascript")

@app.route("/manifest.json")
def manifest(): return send_file("manifest.json", mimetype="application/manifest+json")

@app.route("/goleadores.js")
def goleadores_js(): return send_file("goleadores.js", mimetype="application/javascript")

@app.route("/goleadores.css")
def goleadores_css(): return send_file("goleadores.css", mimetype="text/css")

@app.route("/imagenes/<path:path>")
def imagen(path):
    parts = Path(path).parts
    if len(parts) >= 2:
        base = BASE_DIR / "usuarios" / parts[0] / "imagenes"
        fname = "/".join(parts[1:])
        if (base / fname).exists():
            return send_from_directory(base, fname)
    for base in (BASE_DIR / "imagenes", Path("imagenes"),
                 Path("imagenes/jugadores"), Path("imagenes/tecnicos"), Path("imagenes/escudos")):
        if (base / path).exists():
            return send_from_directory(base, path)
    return "not found", 404

@app.route("/api/escudos")
def get_escudos():
    d = Path("imagenes/escudos")
    if not d.exists(): return jsonify([])
    ext = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
    return jsonify([{"nombre": f.stem, "url": f"/imagenes/escudos/{f.name}"}
        for f in sorted(d.iterdir()) if f.suffix.lower() in ext])

@app.route("/api/login-cards")
def get_login_cards():
    d = Path(__file__).resolve().parent / "imagenes" / "jugadores"
    if not d.exists(): return jsonify([])
    ext = {".png", ".jpg", ".jpeg", ".webp"}
    return jsonify([{"url": f"/imagenes/jugadores/{f.name}"}
        for f in sorted(d.iterdir()) if f.is_file() and f.suffix.lower() in ext])

@app.route("/api/health")
def health():
    db.session.execute(text("SELECT 1"))
    return jsonify({"ok": True})

# ── Auth routes ───────────────────────────────────────────────────────────────
@app.route("/")
def index():
    if not usuario_actual():
        return redirect("/login")
    return send_file("index.html")

@app.route("/login", methods=["GET"])
def login_page():
    if usuario_actual():
        return redirect("/")
    return send_file("login.html")

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.json or {}
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "Usuario y contraseña requeridos"}), 400
    
    u = db.session.get(User, username)
    if not u or not verificar_password(u.password, password):
        return jsonify({"error": "Usuario o contraseña incorrectos"}), 401

    if not u.password.startswith("pbkdf2:"):
        u.password = hash_pwd(password)
        db.session.commit()
        
    session["username"] = username
    session["nombre"] = u.nombre
    return jsonify({"ok": True, "nombre": u.nombre})

@app.route("/api/registro", methods=["POST"])
def api_registro():
    data = request.json or {}
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""
    nombre   = (data.get("nombre") or username).strip()
    if not username or not password:
        return jsonify({"error": "Usuario y contraseña requeridos"}), 400
    if len(username) < 3:
        return jsonify({"error": "Usuario mínimo 3 caracteres"}), 400
    if len(password) < 4:
        return jsonify({"error": "Contraseña mínimo 4 caracteres"}), 400
        
    if db.session.get(User, username):
        return jsonify({"error": "Ese usuario ya existe"}), 409
        
    u = User(
        username=username,
        password=hash_pwd(password),
        nombre=nombre,
        created=datetime.now().isoformat()
    )
    db.session.add(u)
    db.session.commit()
    
    user_dir(username)  # create folder
    session["username"] = username
    session["nombre"] = nombre
    return jsonify({"ok": True, "nombre": nombre}), 201

@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"ok": True})

@app.route("/api/pregunta", methods=["POST"])
def api_pregunta():
    data = request.json or {}
    username = (data.get("username") or "").strip().lower()
    u = db.session.get(User, username)
    if not u:
        return jsonify({"error": "Usuario no encontrado"}), 404
    if not u.pregunta:
        return jsonify({"error": "Este usuario no tiene pregunta de seguridad configurada"}), 400
    return jsonify({"pregunta": u.pregunta})

@app.route("/api/recuperar", methods=["POST"])
def api_recuperar():
    data = request.json or {}
    username  = (data.get("username") or "").strip().lower()
    respuesta = (data.get("respuesta") or "").strip().lower()
    nueva_pwd = data.get("nueva_pwd") or ""
    u = db.session.get(User, username)
    if not u:
        return jsonify({"error": "Usuario no encontrado"}), 404
    if not u.pregunta:
        return jsonify({"error": "Sin pregunta de seguridad"}), 400
    if (u.respuesta or "").lower() != respuesta:
        return jsonify({"error": "Respuesta incorrecta"}), 401
    if len(nueva_pwd) < 4:
        return jsonify({"error": "Contraseña mínimo 4 caracteres"}), 400
        
    u.password = hash_pwd(nueva_pwd)
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/api/configurar_pregunta", methods=["POST"])
def api_configurar_pregunta():
    un = usuario_actual()
    if not un: return jsonify({"error": "no auth"}), 401
    data = request.json or {}
    pregunta  = (data.get("pregunta") or "").strip()
    respuesta = (data.get("respuesta") or "").strip().lower()
    if not pregunta or not respuesta:
        return jsonify({"error": "Pregunta y respuesta requeridas"}), 400
        
    u = db.session.get(User, un)
    u.pregunta = pregunta
    u.respuesta = respuesta
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/api/me")
def api_me():
    u = usuario_actual()
    if not u: return jsonify({"error": "no auth"}), 401
    return jsonify({"username": u, "nombre": session.get("nombre", u)})

def check_auth():
    u = usuario_actual()
    if not u: return None, jsonify({"error": "no auth"}), 401
    return u, None, None

# ── Jugadores ─────────────────────────────────────────────────────────────────
@app.route("/api/jugadores", methods=["GET"])
def get_jug():
    u, err, code = check_auth()
    if err: return err, code
    jugs = Player.query.filter_by(username=u).all()
    return jsonify([j.parsed_data for j in jugs])

@app.route("/api/jugadores", methods=["POST"])
def post_jug():
    u, err, code = check_auth()
    if err: return err, code
    d = request.form.to_dict(); d["id"] = str(uuid.uuid4())[:8]
    img = save_img(request.files.get("imagen"), "j", d["id"], u)
    if img: d["imagen"] = img
    
    j = Player(username=u, id=d["id"], data=json.dumps(d, ensure_ascii=False))
    db.session.add(j)
    db.session.commit()
    return jsonify(d), 201

@app.route("/api/jugadores/<jid>", methods=["PUT"])
def put_jug(jid):
    u, err, code = check_auth()
    if err: return err, code
    j = Player.query.filter_by(username=u, id=jid).first()
    if not j:
        return jsonify({"error": "no encontrado"}), 404
        
    d = request.form.to_dict(); d["id"] = jid
    img = save_img(request.files.get("imagen"), "j", jid, u)
    old_data = j.parsed_data
    d["imagen"] = img if img else old_data.get("imagen", "")
    
    j.data = json.dumps(d, ensure_ascii=False)
    
    snap = dict(d); snap["_ts"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    h = History(username=u, player_id=jid, snapshot=json.dumps(snap, ensure_ascii=False), created_at=snap["_ts"])
    db.session.add(h)
    
    db.session.commit()

    return jsonify(d)

@app.route("/api/jugadores/<jid>/imagen", methods=["PATCH"])
def patch_jug_imagen(jid):
    u, err, code = check_auth()
    if err: return err, code
    j = Player.query.filter_by(username=u, id=jid).first()
    if not j:
        return jsonify({"error": "no encontrado"}), 404

    imagen = request.files.get("imagen")
    if not imagen or not imagen.filename:
        return jsonify({"error": "imagen requerida"}), 400

    image_url = save_img(imagen, "j", jid, u)
    if not image_url:
        return jsonify({"error": "no se pudo guardar la imagen"}), 400

    data = j.parsed_data
    data["imagen"] = f"{image_url}?v={uuid.uuid4().hex}"
    j.data = json.dumps(data, ensure_ascii=False)
    db.session.commit()
    return jsonify({"id": jid, "imagen": data["imagen"]})

@app.route("/api/jugadores/<jid>", methods=["DELETE"])
def del_jug(jid):
    u, err, code = check_auth()
    if err: return err, code
    Player.query.filter_by(username=u, id=jid).delete()
    # also remove from folders
    folders = Folder.query.filter_by(username=u).all()
    for f in folders:
        fd = f.parsed_data
        if fd.get("jugador_id") == jid:
            db.session.delete(f)
    db.session.commit()
    return jsonify({"ok": True})

# ── Técnicos ──────────────────────────────────────────────────────────────────
@app.route("/api/tecnicos", methods=["GET"])
def get_tec():
    u, err, code = check_auth()
    if err: return err, code
    tecs = Coach.query.filter_by(username=u).all()
    return jsonify([t.parsed_data for t in tecs])

@app.route("/api/tecnicos", methods=["POST"])
def post_tec():
    u, err, code = check_auth()
    if err: return err, code
    d = request.form.to_dict(); d["id"] = str(uuid.uuid4())[:8]
    img = save_img(request.files.get("imagen"), "t", d["id"], u)
    if img: d["imagen"] = img
    
    t = Coach(username=u, id=d["id"], data=json.dumps(d, ensure_ascii=False))
    db.session.add(t)
    db.session.commit()
    return jsonify(d), 201

@app.route("/api/tecnicos/<tid>", methods=["PUT"])
def put_tec(tid):
    u, err, code = check_auth()
    if err: return err, code
    t = Coach.query.filter_by(username=u, id=tid).first()
    if not t: return jsonify({"error": "no encontrado"}), 404
        
    d = request.form.to_dict(); d["id"] = tid
    img = save_img(request.files.get("imagen"), "t", tid, u)
    old_data = t.parsed_data
    d["imagen"] = img if img else old_data.get("imagen", "")
    t.data = json.dumps(d, ensure_ascii=False)
    db.session.commit()
    return jsonify(d)

@app.route("/api/tecnicos/<tid>", methods=["DELETE"])
def del_tec(tid):
    u, err, code = check_auth()
    if err: return err, code
    Coach.query.filter_by(username=u, id=tid).delete()
    
    folders = Folder.query.filter_by(username=u).all()
    for f in folders:
        fd = f.parsed_data
        if fd.get("tecnico_id") == tid:
            db.session.delete(f)
            
    Lineup.query.filter_by(username=u, coach_id=tid).delete()
    db.session.commit()
    return jsonify({"ok": True})

# ── Carpetas ──────────────────────────────────────────────────────────────────
def norm_pot(d):
    p  = (d.get("potenciador") or "").strip()
    pm = (d.get("potenciador_manual") or "").strip()
    if p == "__manual__":
        d["potenciador"] = pm if pm and pm != "__manual__" else ""
    d.pop("potenciador_manual", None)
    return d

@app.route("/api/carpetas", methods=["GET"])
def get_car():
    u, err, code = check_auth()
    if err: return err, code
    folders = Folder.query.filter_by(username=u).all()
    out = []
    changed = False
    for f in folders:
        fd = f.parsed_data
        n = norm_pot(dict(fd))
        if n != fd:
            f.data = json.dumps(n, ensure_ascii=False)
            changed = True
        out.append(n)
    if changed: db.session.commit()
    return jsonify(out)

@app.route("/api/carpetas", methods=["POST"])
def post_car():
    u, err, code = check_auth()
    if err: return err, code
    d = norm_pot(request.form.to_dict())
    tid = d.get("tecnico_id")
    jid = d.get("jugador_id")
    
    # check existing
    if tid and jid:
        existing = Folder.query.filter_by(username=u).all()
        if any(x.parsed_data.get("tecnico_id") == tid and x.parsed_data.get("jugador_id") == jid for x in existing):
            return jsonify({"error": "Este jugador ya está en la carpeta de este técnico"}), 409
            
    d["id"] = str(uuid.uuid4())[:8]
    f = Folder(username=u, id=d["id"], data=json.dumps(d, ensure_ascii=False))
    db.session.add(f)
    db.session.commit()
    return jsonify(d), 201

@app.route("/api/carpetas/<cid>", methods=["PUT"])
def put_car(cid):
    u, err, code = check_auth()
    if err: return err, code
    f = Folder.query.filter_by(username=u, id=cid).first()
    if not f: return jsonify({"error": "no encontrado"}), 404
    
    d = norm_pot(request.form.to_dict()); d["id"] = cid
    f.data = json.dumps(d, ensure_ascii=False)
    db.session.commit()
    return jsonify(d)

@app.route("/api/carpetas/<cid>", methods=["DELETE"])
def del_car(cid):
    u, err, code = check_auth()
    if err: return err, code
    Folder.query.filter_by(username=u, id=cid).delete()
    db.session.commit()
    return jsonify({"ok": True})

# ── Historial ─────────────────────────────────────────────────────────────────
@app.route("/api/historial/<jid>")
def get_hist(jid):
    u, err, code = check_auth()
    if err: return err, code
    histories = History.query.filter_by(username=u, player_id=jid).order_by(History.id.desc()).all()
    return jsonify([json.loads(h.snapshot) for h in histories])

@app.route("/api/prog_historial/<jid>", methods=["GET"])
def get_prog_hist(jid):
    u, err, code = check_auth()
    if err: return err, code
    ph = ProgHistory.query.filter_by(username=u, player_id=jid).order_by(ProgHistory.id.desc()).all()
    return jsonify([json.loads(h.snapshot) for h in ph])

@app.route("/api/prog_historial/<jid>", methods=["POST"])
def post_prog_hist(jid):
    u, err, code = check_auth()
    if err: return err, code
    snap = request.json or {}
    snap["_ts"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    
    ph = ProgHistory(username=u, player_id=jid, snapshot=json.dumps(snap, ensure_ascii=False), created_at=snap["_ts"])
    db.session.add(ph)
    db.session.commit()
        
    return jsonify(snap), 201

# ── Plantillas ────────────────────────────────────────────────────────────────
@app.route("/api/plantillas/<tid>", methods=["GET"])
def get_plt(tid):
    u, err, code = check_auth()
    if err: return err, code
    plt = Lineup.query.filter_by(username=u, coach_id=tid).first()
    if plt:
        d = json.loads(plt.data)
        if isinstance(d, list): d = {"posiciones": d, "dibujos": []}
        return jsonify(d)
    return jsonify({"posiciones": [], "dibujos": []})

@app.route("/api/plantillas/<tid>", methods=["POST"])
def post_plt(tid):
    u, err, code = check_auth()
    if err: return err, code
    data_dict = request.json or {"posiciones": [], "dibujos": []}
    
    plt = Lineup.query.filter_by(username=u, coach_id=tid).first()
    if plt:
        plt.data = json.dumps(data_dict, ensure_ascii=False)
    else:
        plt = Lineup(username=u, coach_id=tid, data=json.dumps(data_dict, ensure_ascii=False))
        db.session.add(plt)
    db.session.commit()
    return jsonify(data_dict)

# ── Goleadores ────────────────────────────────────────────────────────────────
@app.route("/api/goleadores", methods=["GET"])
def get_goleadores():
    u, err, code = check_auth()
    if err: return err, code
    gt = GoalTracker.query.filter_by(username=u).first()
    if gt:
        return jsonify(gt.parsed_data)
    
    default_data = {
        "delanteros": [],
        "estrella_id": None,
        "meta_modo": "max",
        "meta_fija": 20,
        "temporada": "Temporada Actual",
        "historial_partidos": [],
        "temporadas_archivadas": []
    }
    
    gt = GoalTracker(username=u, data=json.dumps(default_data, ensure_ascii=False))
    db.session.add(gt)
    db.session.commit()
    return jsonify(default_data)

@app.route("/api/goleadores", methods=["POST"])
def post_goleadores():
    u, err, code = check_auth()
    if err: return err, code
    data = request.json or {}
    gt = GoalTracker.query.filter_by(username=u).first()
    if gt:
        gt.data = json.dumps(data, ensure_ascii=False)
    else:
        gt = GoalTracker(username=u, data=json.dumps(data, ensure_ascii=False))
        db.session.add(gt)
    db.session.commit()
    return jsonify({"ok": True, "data": data})

# ── Panel Admin ──────────────────────────────────────────────────────────────
ADMIN_USERS = {"admin"}

def es_admin():
    return usuario_actual() in ADMIN_USERS

@app.route("/api/admin/usuarios")
def admin_usuarios():
    if not es_admin(): return jsonify({"error": "no autorizado"}), 403
    usuarios = User.query.all()
    result = []
    for u in usuarios:
        jugs_count = Player.query.filter_by(username=u.username).count()
        tecs_count = Coach.query.filter_by(username=u.username).count()
        cars_count = Folder.query.filter_by(username=u.username).count()
        result.append({
            "username": u.username,
            "nombre": u.nombre,
            "created": u.created,
            "tiene_pregunta": bool(u.pregunta),
            "jugadores": jugs_count,
            "tecnicos": tecs_count,
            "carpetas": cars_count,
        })
    result.sort(key=lambda x: x["created"] or "", reverse=True)
    return jsonify(result)

@app.route("/api/admin/reset_pwd", methods=["POST"])
def admin_reset_pwd():
    if not es_admin(): return jsonify({"error": "no autorizado"}), 403
    data = request.json or {}
    username = (data.get("username") or "").strip().lower()
    nueva_pwd = data.get("nueva_pwd") or ""
    if len(nueva_pwd) < 4:
        return jsonify({"error": "Mínimo 4 caracteres"}), 400
    u = db.session.get(User, username)
    if not u:
        return jsonify({"error": "Usuario no encontrado"}), 404
    u.password = hash_pwd(nueva_pwd)
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/api/admin/eliminar_usuario", methods=["POST"])
def admin_eliminar_usuario():
    if not es_admin(): return jsonify({"error": "no autorizado"}), 403
    data = request.json or {}
    username = (data.get("username") or "").strip().lower()
    if username == usuario_actual():
        return jsonify({"error": "No puedes eliminarte a ti mismo"}), 400
    u = db.session.get(User, username)
    if not u:
        return jsonify({"error": "Usuario no encontrado"}), 404
        
    # Delete cascaded manually since SQLite FK constraints aren't enabled by default usually, and we didn't specify cascade
    Player.query.filter_by(username=username).delete()
    Coach.query.filter_by(username=username).delete()
    Folder.query.filter_by(username=username).delete()
    History.query.filter_by(username=username).delete()
    ProgHistory.query.filter_by(username=username).delete()
    Lineup.query.filter_by(username=username).delete()
    GoalTracker.query.filter_by(username=username).delete()
    
    db.session.delete(u)
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/api/admin/yo")
def admin_yo():
    u = usuario_actual()
    if not u: return jsonify({"error": "no auth"}), 401
    return jsonify({"username": u, "es_admin": es_admin()})

if __name__ == "__main__":
    import webbrowser
    print("\n[eFootball Manager v3] Multi-usuario (SQLite)")
    print("   http://localhost:5000\n")
    webbrowser.open("http://localhost:5000")
    app.run(
        host="127.0.0.1",
        debug=False,
        port=int(os.environ.get("EFOOTBALL_PORT", "5000")),
    )
