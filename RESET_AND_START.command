#!/bin/bash
set -u
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR" || exit 1
PORT="${PORT:-3000}"
clear
echo "OUT THE BOX STUDIO — RESET AND START"
echo "===================================="
echo
OLD_PIDS="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
if [ -n "$OLD_PIDS" ]; then
  echo "$OLD_PIDS" | xargs kill 2>/dev/null || true
fi
rm -rf node_modules
rm -f out-the-box-startup.log
chmod +x "$APP_DIR/START_OUT_THE_BOX.command"
echo "Reset complete. Starting clean..."
sleep 1
exec "$APP_DIR/START_OUT_THE_BOX.command"
