#!/usr/bin/env bash
# Every validation the repo has: backend tests and lint, frontend typecheck, lint, tests and build.
set -euo pipefail

cd "$(dirname "$0")/.."
unset PYTHONPATH

(cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/pytest -q)
(cd frontend && npm run -s typecheck && npm run -s lint && npm test --silent && npm run -s build)
