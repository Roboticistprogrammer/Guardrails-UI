# Guardrails UI

A DroneX-branded web UI for NVIDIA NeMo Guardrails topic control with the
Llama 3.1 NemoGuard 8B TopicControl model. The backend wraps `nemoguardrails`;
the frontend is where people test and tune the topic rail.

## Layout

```
backend/                     FastAPI + nemoguardrails (Python 3.12)
  app/main.py                HTTP API, all routes under /api
  app/rails.py               the rails in three modes: mock, hosted, local
  guardrails_config/         NeMo Guardrails config.yml + prompts.yml (the topic policy;
                             GET /api/policy serves the topic-control prompt read-only)
  tests/                     pytest
frontend/                    React 19 + TypeScript + Vite
  src/theme.css              maps brand tokens to light/dark; global element styles
  src/theme.ts               stored light/dark choice; applied before render
  src/samplePrompts.ts       example prompts and expected outcomes for the runner
  src/components/            shared components (Logo.tsx, ChatPlayground.tsx, ThemeToggle.tsx, SamplePromptRunner.tsx, PolicyViewer.tsx, ConnectionPanel.tsx)
brand/                       DroneX brand: tokens.css, logo masks, BRAND.md
scripts/                     setup.sh, dev.sh, check.sh
factory/                     software factory backlog and dashboard (see below)
```

## Setup (fresh checkout or worktree)

```bash
scripts/setup.sh
```

Creates `backend/.venv` and installs backend and frontend dependencies.

## Dev server

```bash
scripts/dev.sh <PORT>
```

UI on `http://127.0.0.1:<PORT>`, API on `<PORT>+1000`, proxied by Vite under
`/api`. Default port 5173. Runs until stopped, so start it in the background.
The app is ready when `curl -sf http://127.0.0.1:<PORT>/api/health` succeeds.

## Validation

```bash
scripts/check.sh
```

Runs everything. The individual commands:

| Area | Command (from that folder) |
| --- | --- |
| backend lint | `.venv/bin/ruff check .` and `.venv/bin/ruff format --check .` |
| backend tests | `.venv/bin/pytest -q` |
| frontend types | `npm run typecheck` |
| frontend lint | `npm run lint` (oxlint) |
| frontend tests | `npm test` (Vitest + Testing Library, jsdom) |
| frontend build | `npm run build` |

**Always `unset PYTHONPATH` before running Python here.** This machine exports
a ROS path that leaks into the venv. The scripts already do it.

## Model modes

Set by `GUARDRAILS_MODE` (from the environment or `.env`; see `.env.example`):

- `mock` (default): no network, no keys. A keyword check stands in for the
  topic-control model, and on-topic replies are `[mock] ...` echoes. All tests
  and all factory agents use mock mode. Never require a key or a GPU to test.
  The sample prompts in `frontend/src/samplePrompts.ts` are chosen so that all
  pass in mock mode, so keep them in step with `MOCK_OFF_TOPIC`.
- `hosted`: both models on build.nvidia.com. Needs `NVIDIA_API_KEY`.
- `local`: topic control from the local NIM container at `TOPIC_CONTROL_URL`
  (default `http://localhost:8123/v1`); the main model stays hosted.

`GET /api/connection` reports the mode and, in local mode only, the
`TOPIC_CONTROL_URL` and whether the NIM answers `/v1/health/ready` with 200.
The connection panel in the UI shows it.

Never commit `.env` or any key. Don't call real NVIDIA endpoints from tests.

## Conventions

- **Brand:** any UI change follows `brand/BRAND.md`. Use only the semantic CSS
  variables from `src/theme.css` and the token scales from `brand/tokens.css`;
  no hard-coded colours, sizes or fonts. Every screen works in light and dark
  and at 360 px wide. The header switch sets `data-theme` on `<html>` and
  stores it in `localStorage` (`guardrails-ui-theme`).
- **Frontend:** function components and hooks, no UI library. Co-locate a
  component's CSS as `Name.css` next to `Name.tsx`. Single quotes, no
  semicolons (match existing files). Every user-visible state (loading, empty,
  error) gets a test in a `*.test.tsx` beside the component.
- **Backend:** routes in `app/main.py` with Pydantic request/response models
  and input limits. Rail logic stays in `app/rails.py` behind the `Rails`
  protocol, so mock mode keeps working. Every route gets a test.
- **Topic policy:** `backend/guardrails_config/` is product policy. Change it
  only when the task is explicitly about the policy.
- Keep comments sparse, as in the existing files.

## Software factory

`/factory <feature>` runs a feature through spec → build → four reviews →
approve, each job in its own worktree at `../Guardrails_UI-factory/<job-id>/`.
Queue features in `factory/backlog.md` and run `/factory next`. Watch progress
with `cd factory && python3 -m http.server` and open `dashboard.html`.
