import json
from pathlib import Path
from app import app, db
from models import User, Player, Coach, Folder, History, ProgHistory, Lineup

BASE_DIR = Path("efootball_data")

def leer_d(p):
    if not p.exists(): return {}
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
        return d if isinstance(d, dict) else {}
    except: return {}

def leer(p):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []

def migrate():
    with app.app_context():
        db.create_all()
        
        # Usuarios
        usuarios_file = BASE_DIR / "usuarios.json"
        usuarios = leer_d(usuarios_file)
        
        for username, data in usuarios.items():
            if not db.session.get(User, username):
                u = User(
                    username=username,
                    password=data.get("password", ""),
                    nombre=data.get("nombre", username),
                    created=data.get("created", ""),
                    pregunta=data.get("pregunta"),
                    respuesta=data.get("respuesta")
                )
                db.session.add(u)
        db.session.commit()
        print(f"Migrados {len(usuarios)} usuarios.")

        # Por cada usuario, migrar sus archivos
        users_dir = BASE_DIR / "usuarios"
        if users_dir.exists():
            for user_path in users_dir.iterdir():
                if user_path.is_dir():
                    username = user_path.name
                    if not db.session.get(User, username):
                        print(f"Usuario {username} no está en usuarios.json. Saltando.")
                        continue
                        
                    def migrar_directorio(d_path, uname):
                        # Jugadores
                        jugadores = leer(d_path / "jugadores.json")
                        for j in jugadores:
                            jid = j.get("id")
                            if jid and not Player.query.filter_by(username=uname, id=jid).first():
                                db.session.add(Player(username=uname, id=jid, data=json.dumps(j, ensure_ascii=False)))
                                
                        # Tecnicos
                        tecnicos = leer(d_path / "tecnicos.json")
                        for t in tecnicos:
                            tid = t.get("id")
                            if tid and not Coach.query.filter_by(username=uname, id=tid).first():
                                db.session.add(Coach(username=uname, id=tid, data=json.dumps(t, ensure_ascii=False)))
                                
                        # Carpetas
                        carpetas = leer(d_path / "carpetas.json")
                        for c in carpetas:
                            cid = c.get("id")
                            if cid and not Folder.query.filter_by(username=uname, id=cid).first():
                                db.session.add(Folder(username=uname, id=cid, data=json.dumps(c, ensure_ascii=False)))
                                
                        # Historial
                        historial = leer_d(d_path / "historial.json")
                        for jid, snaps in historial.items():
                            for snap in reversed(snaps): 
                                created_at = snap.get("_ts", "")
                                db.session.add(History(username=uname, player_id=jid, snapshot=json.dumps(snap, ensure_ascii=False), created_at=created_at))
                                
                        # Prog Historial
                        prog = leer_d(d_path / "prog_historial.json")
                        for jid, snaps in prog.items():
                            for snap in reversed(snaps):
                                created_at = snap.get("_ts", "")
                                db.session.add(ProgHistory(username=uname, player_id=jid, snapshot=json.dumps(snap, ensure_ascii=False), created_at=created_at))
                                
                        # Plantillas
                        plantillas = leer_d(d_path / "plantillas.json")
                        for tid, data in plantillas.items():
                            if not Lineup.query.filter_by(username=uname, coach_id=tid).first():
                                db.session.add(Lineup(username=uname, coach_id=tid, data=json.dumps(data, ensure_ascii=False)))
                                
                        db.session.commit()
                    
                    migrar_directorio(user_path, username)
                    print(f"Migrados datos de usuario: {username}")
        
        # Migrar datos antiguos en la raíz (legacy) al usuario 'admin' si existen
        if (BASE_DIR / "jugadores.json").exists():
            admin_user = db.session.get(User, "admin")
            if admin_user:
                print("Se encontraron datos antiguos en la raíz, migrándolos al usuario 'admin'...")
                migrar_directorio(BASE_DIR, "admin")
            else:
                print("Se encontraron datos antiguos en la raíz pero no existe el usuario 'admin'.")

        print("Migración completada exitosamente.")

if __name__ == "__main__":
    migrate()
