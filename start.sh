#!/usr/bin/env bash
# Launch the full stack: Hindsight memory server + FastAPI backend.
# Usage: ./start.sh            (backend + hindsight)
#        ./start.sh --all      (also runs the Next.js frontend)
set -euo pipefail

cd "$(dirname "$0")"

# ---- load .env ------------------------------------------------------------
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "WARNING: no .env found — copy .env.example to .env first."
fi

: "${XAI_API_KEY:?Set XAI_API_KEY in .env}"
: "${HINDSIGHT_URL:=http://localhost:8888}"
: "${GROK_MODEL:=grok-4-fast}"

# ---- python venv ----------------------------------------------------------
if [ ! -d .venv ]; then
  echo ">>> Creating virtualenv..."
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt

# ---- Hindsight (memory server) --------------------------------------------
HINDSIGHT_PID=""
start_hindsight() {
  if curl -fss "${HINDSIGHT_URL}/health" >/dev/null 2>&1; then
    echo ">>> Hindsight already running at ${HINDSIGHT_URL}"
    return
  fi
  echo ">>> Starting Hindsight at ${HINDSIGHT_URL} (LLM: Grok ${GROK_MODEL})"
  HINDSIGHT_API_LLM_PROVIDER=openai \
  HINDSIGHT_API_LLM_BASE_URL=https://api.x.ai/v1 \
  HINDSIGHT_API_LLM_API_KEY="${XAI_API_KEY}" \
  HINDSIGHT_API_LLM_MODEL="${GROK_MODEL}" \
  hindsight-api &
  HINDSIGHT_PID=$!

  echo -n ">>> Waiting for Hindsight"
  for _ in $(seq 1 60); do
    if curl -fss "${HINDSIGHT_URL}/health" >/dev/null 2>&1; then
      echo " ready."
      return
    fi
    echo -n "."
    sleep 2
  done
  echo " WARNING: Hindsight not ready yet — it may still be downloading models."
}

# ---- backend ----------------------------------------------------------------
mkdir -p data
start_hindsight
echo ">>> Starting FastAPI backend on :${BACKEND_PORT:-8000}"
uvicorn backend.main:app --host "${BACKEND_HOST:-0.0.0.0}" --port "${BACKEND_PORT:-8000}" &
BACKEND_PID=$!

cleanup() {
  echo; echo ">>> Shutting down..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  if [ -n "$HINDSIGHT_PID" ]; then
    kill "$HINDSIGHT_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# ---- frontend (optional) ----------------------------------------------------
if [ "${1:-}" = "--all" ]; then
  echo ">>> Starting Next.js frontend on :3000"
  (cd frontend && npm install --silent && npm run dev) &
  FRONTEND_PID=$!
fi

echo
echo "==============================================================="
echo "  Hindsight :8888   Backend :${BACKEND_PORT:-8000}   Frontend :3000"
echo "  Chat UI  -> http://localhost:3000"
echo "  API docs -> http://localhost:${BACKEND_PORT:-8000}/docs"
echo "==============================================================="
wait
