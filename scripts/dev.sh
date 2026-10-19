#!/usr/bin/env bash
# Start the backend and the frontend dev server together.
# Usage: scripts/dev.sh [PORT]   (default 5173)
# The UI is served on PORT; the API runs on PORT+1000 and is proxied under /api.
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${1:-5173}"
API_PORT=$((PORT + 1000))

# ROS and other global Python paths must not leak into the venv.
unset PYTHONPATH

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

trap 'kill 0' EXIT

(cd backend && .venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port "$API_PORT") &
(cd frontend && API_PORT="$API_PORT" npx vite --host 127.0.0.1 --port "$PORT" --strictPort) &

wait
