# Despliegue y migración sin borrar datos

La aplicación se publica con la interfaz en Netlify, la API Django en Render y PostgreSQL/Storage en Supabase. Django conserva las rutas y el esquema de base de datos existentes; Flask-SQLAlchemy sigue instalado para las herramientas y modelos de migración que lo utilizan. Las cuentas existentes siguen autenticándose contra la tabla `users`; los hashes SHA-256 antiguos se aceptan y se convierten a PBKDF2 después del primer inicio de sesión correcto.

## Abrir la aplicación localmente

Con Python 3 instalado, haz doble clic en `abrir.vbs` en Windows. El lanzador utiliza primero el Python del entorno virtual del proyecto y, si el puerto 5000 está ocupado, busca otro puerto libre. En Ubuntu, abre una terminal en la carpeta del proyecto y ejecuta `python3 install_ubuntu.py` una sola vez. El instalador prepara el entorno virtual, instala las dependencias y crea el acceso «eFootball Manager» en el menú de aplicaciones. Luego pulsa Super, busca ese nombre y ábrelo; inicia la aplicación y el navegador sin volver a usar la terminal. La instalación inicial requiere conexión a Internet. Si falta el soporte de entornos virtuales, instala `python3-venv` con `sudo apt install python3-venv`. Para iniciar manualmente en Linux también puedes ejecutar `sh ./abrir.sh`. Los errores de inicio se guardan en `instance/launcher.log` y se muestran en un diálogo si hay un entorno gráfico compatible.

La aplicación requiere Python 3.10 o posterior y usa `instance/database.db` como base SQLite local predeterminada, sin necesitar un servicio MySQL/MariaDB. Esa base ya contiene datos y se conserva: Django sigue usando las mismas tablas y no ejecuta migraciones que las reescriban. Los cambios locales quedan en la base del equipo y no se sincronizan automáticamente con otro ordenador. Para usar una base remota, configura `DATABASE_URL` antes de iniciar la aplicación. Al cambiar de servidor, inicia sesión de nuevo para renovar la cookie de sesión.

Si aún necesitas MariaDB/MySQL, configura su dirección en `DATABASE_URL` con el esquema `mysql+pymysql://`. La aplicación conserva el controlador en `requirements.txt` para esa opción y para las migraciones.

Antes de importar datos entre bases, conserva copias de ambas. Las copias SQLite usadas durante la migración permanecen en `instance/`; los archivos JSON y las imágenes originales también se conservan.

## 1. Crear Supabase

1. Crea un proyecto Supabase.
2. Copia su URL y la cadena de conexión PostgreSQL. Usa una cadena compatible con psycopg (el formato `postgresql://` también es válido).
3. Conserva el `service_role` key como secreto privado del backend. Nunca lo pongas en HTML, JavaScript ni en el repositorio.

## 2. Migrar la base de datos existente

Haz la migración desde un equipo que pueda conectarse al proyecto Supabase. En este repositorio también hay una base SQLite local con registros, así que copia ambas bases: primero la MySQL actual (si está disponible) y luego la SQLite. Configura temporalmente estas variables en PowerShell; no guardes las cadenas en archivos versionados:

```powershell
$env:SOURCE_DATABASE_URL = "mysql+pymysql://USUARIO:CLAVE@HOST/efootball_manager"
$env:DATABASE_URL = "postgresql://USUARIO:CLAVE@HOST:5432/postgres?sslmode=require"
python migrate_database.py
$env:SOURCE_DATABASE_URL = "sqlite:///instance/database.db"
python migrate_database.py
```

`migrate_database.py` copia las tablas de la aplicación: cuentas, jugadores, técnicos, carpetas, historiales, historial de progreso, plantillas y goleadores. Las filas existentes no se sobrescriben. Registra el origen de cada historial para que también se conserven eventos con el mismo contenido y para poder repetir la operación sin duplicarlos. Si coinciden los IDs numéricos de dos historiales distintos, asigna un ID nuevo para conservar ambos. Los conflictos en otras claves se conservan en `migration_conflicts` para revisión; la aplicación sigue mostrando la versión que ya estaba en la base de destino. No modifica ni elimina las bases de origen. Si mueves una base de origen y necesitas que conserve su identidad de migración, puedes definir `SOURCE_DATABASE_ID` con un nombre estable antes de ejecutar el script.

Si también hay información en los archivos JSON de `efootball_data`, importa esos datos después de configurar `DATABASE_URL`:

```powershell
python db_migrate.py
```

El importador incorpora las cuentas de `usuarios.json`, los datos de cada carpeta `usuarios/<cuenta>/` y los archivos antiguos de la raíz al usuario `admin`. Incluye jugadores, técnicos, carpetas, historiales, historial de progreso, plantillas y goleadores. Valida los archivos antes de escribir y conserva los registros existentes; como excepción, recupera los goleadores desde el JSON si el destino solo tiene una lista vacía. Los demás conflictos no se sobrescriben. Si encuentra una carpeta sin cuenta o datos antiguos sin `admin`, se detiene para que esos datos no queden fuera silenciosamente. La importación se ejecuta en una transacción y se puede repetir; una tabla interna guarda el avance de historiales sin contener contraseñas ni datos de juego. Los JSON originales no se modifican ni se borran.

Las imágenes no se guardan como blobs en la base: sus referencias quedan en los datos de jugadores/técnicos y los archivos se migran a Supabase Storage en el siguiente paso. Las imágenes compartidas del juego (por ejemplo, escudos) siguen siendo recursos estáticos del sitio. Los historiales de jugador y de progreso ya no se recortan automáticamente a 30 entradas.

## 3. Migrar imágenes de cuentas

Configura estas variables localmente con los datos de Supabase y ejecuta el migrador mientras los archivos originales sigan disponibles:

```powershell
$env:SUPABASE_URL = "https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "TU_SERVICE_ROLE_KEY"
python migrate_images.py
```

El script crea el bucket público `player-images` si no existe, sube las imágenes de las cuentas y actualiza sus referencias en la base de datos. Si falta algún archivo, lo informa y conserva su referencia original. No elimina archivos locales.

## 4. Desplegar la API en Render

En Render, crea un Blueprint desde `render.yaml` y configura. El comando de inicio utiliza `django_project.wsgi:application`:

- `DATABASE_URL`: la cadena PostgreSQL de Supabase.
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: credenciales privadas para las imágenes.
- `SECRET_KEY` se genera automáticamente por Render.
El disco persistente de Render conserva archivos subidos localmente mientras se termina la migración de imágenes. El endpoint `/api/health` valida que la API pueda consultar la base.

La aplicación permite descargar un respaldo JSON por cuenta desde **Herramientas → Sincronización**. Incluye jugadores, técnicos, asignaciones, alineaciones, historiales, goleadores, versiones guardadas e imágenes de cuenta disponibles en el almacenamiento local o en el bucket configurado. No incluye credenciales de acceso. Al restaurarlo, reemplaza los datos de la cuenta actualmente autenticada; valida primero el archivo y conserva la cuenta y su contraseña. Las imágenes públicas externas o archivos que ya no existan se señalan como advertencia y conservan su referencia.

Desde la misma pantalla puedes guardar, comparar, restaurar o borrar versiones de tu equipo. Dentro de la pizarra de un técnico, **Laboratorio** compara las alineaciones guardadas y señala posiciones débiles con alternativas de la carpeta; **Archivo** exporta una alineación junto con todos los jugadores asignados a la carpeta del técnico y los datos particulares de sus cartas, para compartirla o importarla en otra cuenta. El PNG de la pizarra sigue disponible.

## 5. Desplegar la interfaz en Netlify

Conecta el repositorio a Netlify y configura la variable de entorno `FLASK_API_URL` con el origen HTTPS que Render asignó a la API, por ejemplo `https://efootball-manager-api.onrender.com`. Netlify construye la carpeta `dist` y enruta `/api/*` y `/imagenes/*` hacia Render.

El build de Netlify solo copia la interfaz, los recursos estáticos y las imágenes compartidas; no publica `efootball_data` ni `instance/database.db`. La variable `FLASK_API_URL` conserva su nombre histórico, pero debe apuntar al servidor Django de Render. Esos archivos ya están versionados en el repositorio, así que mantenlo privado mientras contenga datos de cuentas. Añadirlos a `.gitignore` no los elimina del historial de Git.

## 6. Verificación

Antes de retirar el servidor o los archivos antiguos, verifica el inicio de sesión con las cuentas existentes, los jugadores y técnicos, los historiales, las plantillas, los goleadores y sus imágenes. La base original, `efootball_data` y las imágenes locales se mantienen como respaldo; estos scripts no los borran.
