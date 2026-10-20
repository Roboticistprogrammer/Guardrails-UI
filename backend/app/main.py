from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, Request
from pydantic import BaseModel, Field

from app.rails import check_nim_ready, create_rails, load_topic_policy, topic_control_url


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.rails = create_rails()
    yield


app = FastAPI(title="Guardrails UI", lifespan=lifespan)


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=50)


class ChatResponse(BaseModel):
    content: str
    blocked: bool


class PolicyResponse(BaseModel):
    content: str


class ConnectionResponse(BaseModel):
    mode: str
    topic_control_url: str | None
    nim_ready: bool | None


@app.get("/api/health")
async def health(request: Request) -> dict[str, str]:
    return {"status": "ok", "mode": request.app.state.rails.mode}


@app.get("/api/connection")
async def connection(request: Request) -> ConnectionResponse:
    mode = request.app.state.rails.mode
    if mode != "local":
        return ConnectionResponse(mode=mode, topic_control_url=None, nim_ready=None)
    url = topic_control_url()
    return ConnectionResponse(mode=mode, topic_control_url=url, nim_ready=await check_nim_ready(url))


@app.post("/api/chat")
async def chat(body: ChatRequest, request: Request) -> ChatResponse:
    result = await request.app.state.rails.chat([m.model_dump() for m in body.messages])
    return ChatResponse(content=result.content, blocked=result.blocked)


@app.get("/api/policy")
def policy() -> PolicyResponse:
    return PolicyResponse(content=load_topic_policy())
