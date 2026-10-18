import os
import subprocess
import sys
from pathlib import Path

from start import INSTANCE, LOG_PATH, ROOT, install_local_dependencies


DESKTOP_FILE_NAME = "efootball-manager-local.desktop"


def escape_exec_argument(argument):
    escaped = argument.replace("%", "%%")
    for character in ("\\", '"', "`", "$"):
        escaped = escaped.replace(character, "\\" + character)
    return f'"{escaped}"'


def desktop_entry_content(python):
    command = " ".join(
        escape_exec_argument(str(argument))
        for argument in (python, ROOT / "start.py")
    )
    return (
        "[Desktop Entry]\n"
        "Version=1.0\n"
        "Type=Application\n"
        "Name=eFootball Manager\n"
        "Comment=Administrador local de eFootball\n"
        f"Exec={command}\n"
        f"TryExec={escape_exec_argument(str(python))}\n"
        "Terminal=false\n"
        "Categories=Game;Utility;\n"
    )


def applications_directory():
    data_home = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    if not data_home.is_absolute():
        data_home = Path.home() / ".local" / "share"
    return data_home / "applications"


def install():
    if sys.platform != "linux":
        raise RuntimeError("Este instalador es solo para Linux.")
    if sys.version_info < (3, 10):
        raise RuntimeError("Se necesita Python 3.10 o posterior.")

    print("Preparando la aplicación. La primera instalación necesita Internet...")
    INSTANCE.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as log:
        log.write("\nInstalando acceso de Ubuntu...\n")
        python = install_local_dependencies(log)

    applications = applications_directory()
    applications.mkdir(parents=True, exist_ok=True)
    desktop_file = applications / DESKTOP_FILE_NAME
    temporary_file = desktop_file.with_suffix(".desktop.tmp")
    temporary_file.write_text(desktop_entry_content(python), encoding="utf-8")
    temporary_file.chmod(0o755)
    temporary_file.replace(desktop_file)
    return desktop_file


def main():
    try:
        desktop_file = install()
    except (OSError, subprocess.CalledProcessError, RuntimeError) as error:
        print(f"No se pudo instalar el acceso de Ubuntu: {error}", file=sys.stderr)
        print(f"Revisa el registro: {LOG_PATH}", file=sys.stderr)
        if "ensurepip" in str(error) or "venv" in str(error):
            print(
                "Si falta el soporte de entornos virtuales, instala "
                "python3-venv con: sudo apt install python3-venv",
                file=sys.stderr,
            )
        return 1

    print("Instalación lista. Pulsa Super y busca «eFootball Manager».")
    print(f"Acceso creado en: {desktop_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
