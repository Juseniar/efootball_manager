"""
eFootball Manager — Script de Migración
========================================
Mueve los datos del formato antiguo (efootball_data/*.json)
al nuevo formato multi-usuario (efootball_data/usuarios/{usuario}/).

Uso:
  python migrar_datos.py

El script te pedirá el nombre de usuario destino y copiará
todos los archivos y carpetas de imágenes automáticamente.
"""

import json, shutil, hashlib, getpass
from pathlib import Path
from datetime import datetime

BASE_DIR   = Path("efootball_data")
USERS_FILE = BASE_DIR / "usuarios.json"

ARCHIVOS = [
    "jugadores.json",
    "tecnicos.json",
    "carpetas.json",
    "plantillas.json",
    "historial.json",
    "prog_historial.json",
]

def hash_pwd(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest()

def leer_json(p):
    if not p.exists(): return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except:
        return None

def guardar_json(p, d):
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")

def separador():
    print("─" * 50)

def main():
    print()
    print("⚽  eFootball Manager — Migración de Datos")
    separador()

    # 1. Verificar que hay datos que migrar
    datos_encontrados = [f for f in ARCHIVOS if (BASE_DIR / f).exists()]
    imagenes_dir = BASE_DIR / "imagenes"

    if not datos_encontrados and not imagenes_dir.exists():
        print("✅ No se encontraron datos antiguos en efootball_data/")
        print("   Parece que ya estás usando el formato nuevo.")
        print()
        input("Presiona Enter para salir...")
        return

    print(f"📂 Datos encontrados en efootball_data/:")
    for f in datos_encontrados:
        data = leer_json(BASE_DIR / f)
        if isinstance(data, list):
            print(f"   ✓ {f} ({len(data)} registros)")
        elif isinstance(data, dict):
            print(f"   ✓ {f} ({len(data)} entradas)")
        else:
            print(f"   ✓ {f}")

    if imagenes_dir.exists():
        imgs = list(imagenes_dir.rglob("*.*"))
        print(f"   ✓ imagenes/ ({len(imgs)} imágenes)")

    print()

    # 2. Pedir usuario destino
    separador()
    print("¿A qué usuario quieres migrar estos datos?")
    print("(Si el usuario no existe, lo creamos ahora)")
    print()

    username = input("👤 Usuario: ").strip().lower()
    if not username or len(username) < 3:
        print("❌ El usuario debe tener mínimo 3 caracteres.")
        input("Presiona Enter para salir...")
        return

    # 3. Verificar/crear usuario
    BASE_DIR.mkdir(exist_ok=True)
    usuarios = leer_json(USERS_FILE) or {}

    if username in usuarios:
        print(f"✅ Usuario '{username}' encontrado.")
        confirmacion = input("¿Migrar datos a este usuario? (s/n): ").strip().lower()
        if confirmacion != 's':
            print("Migración cancelada.")
            input("Presiona Enter para salir...")
            return
    else:
        print(f"👤 Usuario '{username}' no existe. Vamos a crearlo.")
        nombre = input("   Nombre completo (Enter para usar el usuario): ").strip()
        if not nombre:
            nombre = username

        while True:
            pwd = getpass.getpass("   Contraseña (mín. 4 caracteres): ")
            if len(pwd) < 4:
                print("   ❌ Mínimo 4 caracteres.")
                continue
            pwd2 = getpass.getpass("   Confirmar contraseña: ")
            if pwd != pwd2:
                print("   ❌ Las contraseñas no coinciden.")
                continue
            break

        usuarios[username] = {
            "password": hash_pwd(pwd),
            "nombre": nombre,
            "created": datetime.now().isoformat()
        }
        guardar_json(USERS_FILE, usuarios)
        print(f"   ✅ Usuario '{username}' creado.")

    # 4. Crear carpeta del usuario
    user_dir = BASE_DIR / "usuarios" / username
    user_dir.mkdir(parents=True, exist_ok=True)
    img_dest = user_dir / "imagenes"
    img_dest.mkdir(exist_ok=True)

    separador()
    print("📦 Migrando datos...")
    print()

    migrados = 0
    omitidos = 0

    # 5. Copiar archivos JSON
    for archivo in ARCHIVOS:
        origen = BASE_DIR / archivo
        destino = user_dir / archivo
        if not origen.exists():
            continue
        if destino.exists():
            resp = input(f"   ⚠️  {archivo} ya existe en el usuario. ¿Sobreescribir? (s/n): ").strip().lower()
            if resp != 's':
                print(f"   ⏭️  Omitido: {archivo}")
                omitidos += 1
                continue
        shutil.copy2(origen, destino)
        data = leer_json(destino)
        count = len(data) if isinstance(data, (list, dict)) else "?"
        print(f"   ✅ {archivo} ({count} registros)")
        migrados += 1

    # 6. Copiar imágenes
    if imagenes_dir.exists():
        print()
        print("   🖼️  Copiando imágenes...")
        img_count = 0
        for img in imagenes_dir.rglob("*"):
            if img.is_file():
                # Mantener subdirectorio relativo
                rel = img.relative_to(imagenes_dir)
                dest_img = img_dest / rel
                dest_img.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(img, dest_img)
                img_count += 1
        print(f"   ✅ {img_count} imágenes copiadas")

        # Actualizar rutas de imágenes en jugadores.json y tecnicos.json
        print()
        print("   🔗 Actualizando rutas de imágenes...")
        for archivo in ["jugadores.json", "tecnicos.json"]:
            fp = user_dir / archivo
            if not fp.exists():
                continue
            data = leer_json(fp)
            if not isinstance(data, list):
                continue
            changed = False
            for item in data:
                img = item.get("imagen", "")
                if img and "/imagenes/" in img and f"/imagenes/{username}/" not in img:
                    # Actualizar ruta al nuevo formato
                    nombre_img = Path(img).name
                    # Buscar el archivo en las imágenes copiadas
                    for img_file in img_dest.rglob(nombre_img):
                        item["imagen"] = f"/imagenes/{username}/{img_file.relative_to(img_dest)}"
                        changed = True
                        break
            if changed:
                guardar_json(fp, data)
                print(f"   ✅ Rutas actualizadas en {archivo}")

    # 7. Resumen
    separador()
    print()
    print("🎉 ¡Migración completada!")
    print()
    print(f"   Usuario: {username}")
    print(f"   Archivos migrados: {migrados}")
    if omitidos:
        print(f"   Archivos omitidos: {omitidos}")
    print()
    print("   Puedes iniciar sesión en http://localhost:5000")
    print()
    print("   ⚠️  Los archivos originales NO fueron eliminados.")
    print("   Puedes borrarlos manualmente cuando confirmes que todo funciona.")
    print()

    # Ofrecer backup de originales
    hacer_backup = input("¿Crear backup de los archivos originales antes de terminar? (s/n): ").strip().lower()
    if hacer_backup == 's':
        backup_dir = BASE_DIR / f"backup_pre_migracion_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backup_dir.mkdir()
        for archivo in ARCHIVOS:
            if (BASE_DIR / archivo).exists():
                shutil.copy2(BASE_DIR / archivo, backup_dir / archivo)
        if imagenes_dir.exists():
            shutil.copytree(imagenes_dir, backup_dir / "imagenes")
        print(f"   ✅ Backup guardado en: {backup_dir.name}")

    print()
    input("Presiona Enter para salir...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nMigración cancelada por el usuario.")
