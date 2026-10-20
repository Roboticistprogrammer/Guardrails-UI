# DroneX Guardrails

A DroneX-branded UI for testing and tuning [NeMo Guardrails topic control](https://docs.nvidia.com/nemo/guardrails/get-started/tutorials/nemoguard-topiccontrol-deployment)
with Llama 3.1 NemoGuard 8B TopicControl.

## Quick start

```bash
scripts/setup.sh
scripts/dev.sh          # http://127.0.0.1:5173, mock mode
```

Mock mode needs no API key or GPU. To use real models, copy `.env.example` to
`.env` and set `GUARDRAILS_MODE` and `NVIDIA_API_KEY`.

## Running the TopicControl NIM locally

Needs an NGC API key, Docker, the NVIDIA Container Toolkit and a supported GPU.

```bash
export NGC_API_KEY=...
export LOCAL_NIM_CACHE=~/.cache/llama-nemotron-topic-guard
mkdir -p "$LOCAL_NIM_CACHE" && chmod 700 "$LOCAL_NIM_CACHE"

docker run -d --name llama-nemotron-topic-guard \
  --gpus=all --runtime=nvidia --shm-size=64GB \
  -e NGC_API_KEY -u "$(id -u)" \
  -v "$LOCAL_NIM_CACHE:/opt/nim/.cache/" \
  -p 127.0.0.1:8123:8000 \
  nvcr.io/nim/nvidia/llama-3.1-nemoguard-8b-topic-control:1.10.1

curl http://localhost:8123/v1/health/ready
```

Then set `GUARDRAILS_MODE=local` in `.env`.

The tutorial's local `config.yml` sets both `model` and
`parameters.model_name`, which nemoguardrails 0.24 rejects. This app sets only
`parameters.base_url` (see `backend/app/rails.py`).

See `CLAUDE.md` for the layout, commands and conventions.
