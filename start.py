import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import venv
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parent
INSTANCE = ROOT / "instance"
VENV = ROOT / ".venv"
LOCAL_REQUIREMENTS = ROOT / "requirements-local.txt"
LOG_PATH = INSTANCE / "launcher.log"
SERVER_LOG_PATH = INSTANCE / "server.log"
PORT = 5000
PORT_SEARCH_ATTEMPTS = 20


def app_url(port):
    return f"http://127.0.0.1:{port}"


def venv_python():
    if os.name == "nt":
        return VENV / "Scripts" / "python.exe"
    return VENV / "bin" / "python"


def install_local_dependencies(log):
    python = venv_python()
    if not python.exists():
        venv.EnvBuilder(with_pip=True).create(VENV)

    check = subprocess.run(
        [str(python), "-c", "import django, flask, flask_sqlalchemy"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if check.returncode:
        subprocess.run(
            [
                str(python),
                "-m",
                "pip",
                "install",
                "--disable-pip-version-check",
                "-r",
                str(LOCAL_REQUIREMENTS),
            ],
            cwd=ROOT,
            stdout=log,
            stderr=subprocess.STDOUT,
            check=True,
        )
    return python


def server_ready(port):
    try:
        with urllib.request.urlopen(f"{app_url(port)}/api/health", timeout=1) as response:
            return (
                response.status == 200
                and response.headers.get("X-Application-Framework") == "Django"
            )
    except (urllib.error.HTTPError, urllib.error.URLError):
        return False


def port_available(port):
    with socket.socket() as server_socket:
        return server_socket.connect_ex(("127.0.0.1", port)) != 0


def find_available_port():
    for port in range(PORT, PORT + PORT_SEARCH_ATTEMPTS):
        if server_ready(port):
            return port, False
        if port_available(port):
            return port, True
    raise RuntimeError(
        f"No hay puertos disponibles entre {PORT} y "
        f"{PORT + PORT_SEARCH_ATTEMPTS - 1}."
    )


def start_server(python, server_log, port):

    environment = os.environ.copy()
    environment["EFOOTBALL_PORT"] = str(port)
    command = [
        str(python),
        str(ROOT / "manage.py"),
        "runserver",
        "--noreload",
        f"127.0.0.1:{port}",
    ]
    options = {
        "cwd": ROOT,
        "env": environment,
        "stdin": subprocess.DEVNULL,
        "stdout": server_log,
        "stderr": subprocess.STDOUT,
    }
    if os.name == "nt":
        options["creationflags"] = subprocess.CREATE_NO_WINDOW
    else:
        options["start_new_session"] = True
    return subprocess.Popen(command, **options)


def show_error(message):
    details = f"{message}\n\nRegistro de inicio: {LOG_PATH}"
    if os.name == "nt":
        import ctypes

        ctypes.windll.user32.MessageBoxW(None, details, "eFootball Manager", 0x10)
        return

    if shutil.which("zenity") and subprocess.run(
        ["zenity", "--error", "--title=eFootball Manager", f"--text={details}"],
        check=False,
    ).returncode == 0:
        return
    if shutil.which("xmessage") and subprocess.run(
        ["xmessage", "-center", details], check=False
    ).returncode == 0:
        return

    print(details, file=sys.stderr)


def main():
    INSTANCE.mkdir(parents=True, exist_ok=True)
    try:
        with LOG_PATH.open("a", encoding="utf-8") as log:
            log.write("\nPreparando eFootball Manager...\n")
            python = install_local_dependencies(log)
            port, should_start = find_available_port()
            url = app_url(port)
            log.write(f"Abriendo la aplicación en {url}\n")

            if should_start:
                with SERVER_LOG_PATH.open("a", encoding="utf-8") as server_log:
                    process = start_server(python, server_log, port)
                    if process is not None:
                        try:
                            for _ in range(120):
                                if process.poll() is not None:
                                    raise RuntimeError(
                                        "El servidor se cerró durante el inicio. "
                                        f"Revisa {SERVER_LOG_PATH}."
                                    )
                                if server_ready(port):
                                    break
                                time.sleep(0.25)
                            else:
                                raise TimeoutError(
                                    "La aplicación tardó demasiado en iniciar. "
                                    f"Revisa {SERVER_LOG_PATH}."
                                )
                        except (RuntimeError, TimeoutError):
                            process.terminate()
                            process.wait(timeout=5)
                            raise

        if not webbrowser.open(url):
            raise RuntimeError(
                f"No se pudo abrir el navegador automáticamente. "
                f"Abre esta dirección: {url}"
            )
    except (
        OSError,
        subprocess.CalledProcessError,
        TimeoutError,
        RuntimeError,
    ) as error:
        with LOG_PATH.open("a", encoding="utf-8") as log:
            log.write(f"Error: {error}\n")
        show_error(str(error))


if __name__ == "__main__":
    main()
