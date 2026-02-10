#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -x ".venv/bin/python" ]]; then
  echo "Creating backend virtualenv at backend/.venv"
  python3 -m venv .venv
fi

if ! .venv/bin/python -c "import TTS" >/dev/null 2>&1; then
  echo "Installing backend dependencies into backend/.venv"
  .venv/bin/python -m pip install -r requirements.txt
fi

exec .venv/bin/python -m uvicorn app.main:app --reload --port 8000
