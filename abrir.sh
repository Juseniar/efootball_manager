#!/bin/sh

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1

if ! command -v python3 >/dev/null 2>&1; then
    MESSAGE="Instala Python 3 y vuelve a abrir este archivo."
    if command -v zenity >/dev/null 2>&1; then
        zenity --error --title="eFootball Manager" --text="$MESSAGE"
    elif command -v xmessage >/dev/null 2>&1; then
        xmessage -center "$MESSAGE"
    else
        printf '%s\n' "$MESSAGE" >&2
    fi
    exit 1
fi

exec python3 "$ROOT/start.py"
