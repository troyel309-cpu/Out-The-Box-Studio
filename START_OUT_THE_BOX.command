#!/bin/bash
set -u

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR" || exit 1
LOG_FILE="$APP_DIR/out-the-box-startup.log"
PORT="${PORT:-3000}"

clear
printf '\nOUT THE BOX STUDIO — ONE-CLICK START\n'
printf '===================================\n\n'

fail() {
  echo
  echo "STARTUP STOPPED: $1"
  echo "A log was saved here:"
  echo "$LOG_FILE"
  echo
  read -r -p "Press Return to close..."
  exit 1
}

: > "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "Project: $APP_DIR"

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js was not found. Install Node.js 20 or newer, then run this file again."
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Node.js 20 or newer is required. Your version is $(node -v)."
fi

echo "Node: $(node -v)"

if [ ! -f package.json ] || [ ! -f server.js ]; then
  fail "The project files are incomplete. Keep this launcher inside the Out the Box Studio folder."
fi

# Stop only an old server already using this app port.
OLD_PID="$(lsof -ti tcp:"$PORT" 2>/dev/null | head -n 1 || true)"
if [ -n "$OLD_PID" ]; then
  echo "Closing the old local server on port $PORT..."
  kill "$OLD_PID" 2>/dev/null || true
  sleep 1
fi

# This project currently has no external runtime dependencies, but npm install
# validates package metadata and keeps future upgrades safe.
echo "Checking project setup..."
npm install --no-audit --no-fund || fail "npm install failed."

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo
  echo "Paste your NEW OpenAI API key. It will only live in this Terminal window."
  read -r -s -p "OpenAI API key: " OPENAI_API_KEY
  echo
  [ -n "$OPENAI_API_KEY" ] || fail "No API key was entered."
  export OPENAI_API_KEY
fi

export PORT

echo
echo "Starting Out the Box Studio..."
echo "Keep this Terminal window open while you use the studio."
echo

node server.js >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!

READY=0
for _ in {1..20}; do
  if curl -fsS "http://127.0.0.1:$PORT" >/dev/null 2>&1; then
    READY=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  sleep 0.5
done

if [ "$READY" -ne 1 ]; then
  wait "$SERVER_PID" 2>/dev/null || true
  fail "The server did not become ready."
fi

echo "Studio is ready: http://127.0.0.1:$PORT"
open "http://127.0.0.1:$PORT/?v=$(date +%s)" >/dev/null 2>&1 || true

wait "$SERVER_PID"
