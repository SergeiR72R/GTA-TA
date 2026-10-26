#!/usr/bin/env sh
# Запуск игры через локальный веб-сервер (нужен Python 3).
cd "$(dirname "$0")"
PORT="${PORT:-8000}"
echo "ХАМСИН 3D: откройте в браузере http://localhost:$PORT  (Ctrl+C — остановить)"
if command -v xdg-open >/dev/null 2>&1; then (sleep 1 && xdg-open "http://localhost:$PORT") &
elif command -v open >/dev/null 2>&1; then (sleep 1 && open "http://localhost:$PORT") &
fi
if command -v python3 >/dev/null 2>&1; then exec python3 -m http.server "$PORT"
else exec python -m http.server "$PORT"
fi
