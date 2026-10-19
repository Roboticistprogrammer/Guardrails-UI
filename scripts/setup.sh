#!/usr/bin/env bash
# Install everything a fresh checkout needs. Safe to re-run.
set -euo pipefail

cd "$(dirname "$0")/.."
unset PYTHONPATH

python3 -m venv backend/.venv
backend/.venv/bin/pip install -q -r backend/requirements-dev.txt
(cd frontend && npm ci --silent)
