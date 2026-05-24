"""eFootball Manager v3"""
import json, uuid
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, send_file

app = Flask(__name__, static_folder="static")

DATA_DIR = Path("efootball_data")
IMG_DIR  = DATA_DIR / "imagenes"
F_JUG    = DATA_DIR / "jugadores.json"
F_TEC    = DATA_DIR / "tecnicos.json"
F_CAR    = DATA_DIR / "carpetas.json"
F_PLT    = DATA_DIR / "plantillas.json"
F_HIST   = DATA_DIR / "historial.json"

DATA_DIR.mkdir(exist_ok=True)
IMG_DIR.mkdir(exist_ok=True)

def leer(p):    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []
def leer_d(p):
    if not p.exists(): return {}
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
        return d if isinstance(d, dict) else {}
    except: return {}
def guardar(p,d): p.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
def save_img(f, prefix, id_):
    if f and f.filename:
        ext = Path(f.filename).suffix or ".png"
        name = f"{prefix}_{id_}{ext}"
        f.save(IMG_DIR / name)
        return f"/imagenes/{name}"
    return None

@app.route("/")
def index(): return send_file("index.html")

@app.route("/imagenes/<path:n>")
def imagen(n): return send_from_directory(IMG_DIR, n)

# ── Jugadores ─────────────────────────────────────────────────────────────────
@app.route("/api/jugadores", methods=["GET"])
def get_jug(): return jsonify(leer(F_JUG))

@app.route("/api/jugadores", methods=["POST"])
def post_jug():
    d = request.form.to_dict(); d["id"] = str(uuid.uuid4())[:8]
    img = save_img(request.files.get("imagen"), "j", d["id"])
    if img: d["imagen"] = img
    j = leer(F_JUG); j.append(d); guardar(F_JUG, j)
    return jsonify(d), 201

@app.route("/api/jugadores/<jid>", methods=["PUT"])
def put_jug(jid):
    d = request.form.to_dict(); d["id"] = jid
    j = leer(F_JUG)
    for i, x in enumerate(j):
        if x["id"] == jid:
            img = save_img(request.files.get("imagen"), "j", jid)
            d["imagen"] = img if img else x.get("imagen", "")
            j[i] = d; guardar(F_JUG, j)
            # Guardar snapshot en historial
            hist = leer_d(F_HIST)
            if jid not in hist: hist[jid] = []
            snap = dict(d); snap["_ts"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            hist[jid].insert(0, snap)
            hist[jid] = hist[jid][:30]
            guardar(F_HIST, hist)
            return jsonify(d)
    return jsonify({"error": "no encontrado"}), 404

@app.route("/api/jugadores/<jid>", methods=["DELETE"])
def del_jug(jid):
    guardar(F_JUG, [x for x in leer(F_JUG) if x["id"] != jid])
    guardar(F_CAR, [x for x in leer(F_CAR) if x.get("jugador_id") != jid])
    return jsonify({"ok": True})

# ── Técnicos ──────────────────────────────────────────────────────────────────
@app.route("/api/tecnicos", methods=["GET"])
def get_tec(): return jsonify(leer(F_TEC))

@app.route("/api/tecnicos", methods=["POST"])
def post_tec():
    d = request.form.to_dict(); d["id"] = str(uuid.uuid4())[:8]
    img = save_img(request.files.get("imagen"), "t", d["id"])
    if img: d["imagen"] = img
    t = leer(F_TEC); t.append(d); guardar(F_TEC, t)
    return jsonify(d), 201

@app.route("/api/tecnicos/<tid>", methods=["PUT"])
def put_tec(tid):
    d = request.form.to_dict(); d["id"] = tid
    t = leer(F_TEC)
    for i, x in enumerate(t):
        if x["id"] == tid:
            img = save_img(request.files.get("imagen"), "t", tid)
            d["imagen"] = img if img else x.get("imagen", "")
            t[i] = d; guardar(F_TEC, t); return jsonify(d)
    return jsonify({"error": "no encontrado"}), 404

@app.route("/api/tecnicos/<tid>", methods=["DELETE"])
def del_tec(tid):
    guardar(F_TEC, [x for x in leer(F_TEC) if x["id"] != tid])
    guardar(F_CAR, [x for x in leer(F_CAR) if x.get("tecnico_id") != tid])
    plt = leer_d(F_PLT); plt.pop(tid, None); guardar(F_PLT, plt)
    return jsonify({"ok": True})

# ── Carpetas ──────────────────────────────────────────────────────────────────
@app.route("/api/carpetas", methods=["GET"])
def get_car(): return jsonify(leer(F_CAR))

@app.route("/api/carpetas", methods=["POST"])
def post_car():
    d = request.form.to_dict(); d["id"] = str(uuid.uuid4())[:8]
    c = leer(F_CAR); c.append(d); guardar(F_CAR, c)
    return jsonify(d), 201

@app.route("/api/carpetas/<cid>", methods=["PUT"])
def put_car(cid):
    d = request.form.to_dict(); d["id"] = cid
    c = leer(F_CAR)
    for i, x in enumerate(c):
        if x["id"] == cid: c[i] = d; guardar(F_CAR, c); return jsonify(d)
    return jsonify({"error": "no encontrado"}), 404

@app.route("/api/carpetas/<cid>", methods=["DELETE"])
def del_car(cid):
    guardar(F_CAR, [x for x in leer(F_CAR) if x["id"] != cid])
    return jsonify({"ok": True})

# ── Historial de stats ────────────────────────────────────────────────────────
@app.route("/api/historial/<jid>", methods=["GET"])
def get_hist(jid): return jsonify(leer_d(F_HIST).get(jid, []))

# ── Plantillas ────────────────────────────────────────────────────────────────
@app.route("/api/plantillas/<tid>", methods=["GET"])
def get_plt(tid):
    d = leer_d(F_PLT).get(tid, {})
    if isinstance(d, list): d = {"posiciones": d, "dibujos": []}
    return jsonify(d if d else {"posiciones": [], "dibujos": []})

@app.route("/api/plantillas/<tid>", methods=["POST"])
def post_plt(tid):
    plt = leer_d(F_PLT)
    plt[tid] = request.json or {"posiciones": [], "dibujos": []}
    guardar(F_PLT, plt)
    return jsonify(plt[tid])

if __name__ == "__main__":
    import webbrowser
    print("\n⚽ eFootball Manager v3\n   http://localhost:5000\n")
    webbrowser.open("http://localhost:5000")
    app.run(debug=False, port=5000)
