"""Topic-control rails in three modes: mock (offline), hosted (build.nvidia.com) and local (NIM on :8123)."""

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import yaml

CONFIG_DIR = Path(__file__).resolve().parent.parent / "guardrails_config"
MODES = ("mock", "hosted", "local")
DEFAULT_LOCAL_URL = "http://localhost:8123/v1"
REFUSAL = "I'm sorry, I can't respond to that."

# Stand-in for the topic-control model in mock mode: the sensitive topics the
# default prompts.yml tells the model to refuse.
MOCK_OFF_TOPIC = re.compile(
    r"\b(politic\w*|election\w*|vote|voting|party|religio\w*|god|church)\b",
    re.IGNORECASE,
)


@dataclass
class ChatResult:
    content: str
    blocked: bool


class Rails(Protocol):
    mode: str

    async def chat(self, messages: list[dict[str, str]]) -> ChatResult: ...


class MockRails:
    mode = "mock"

    async def chat(self, messages: list[dict[str, str]]) -> ChatResult:
        last = messages[-1]["content"]
        if MOCK_OFF_TOPIC.search(last):
            return ChatResult(content=REFUSAL, blocked=True)
        return ChatResult(content=f"[mock] On topic. You said: {last}", blocked=False)


def load_config_dict(mode: str, local_url: str = DEFAULT_LOCAL_URL) -> dict:
    """config.yml and prompts.yml merged; in local mode topic_control points at the local NIM."""
    config = yaml.safe_load((CONFIG_DIR / "config.yml").read_text())
    config.update(yaml.safe_load((CONFIG_DIR / "prompts.yml").read_text()))
    if mode == "local":
        for model in config["models"]:
            if model["type"] == "topic_control":
                model["parameters"] = {"base_url": local_url}
    return config


def load_topic_policy() -> str:
    """The topic-control prompt's content from prompts.yml, or "" if there is none."""
    prompts = yaml.safe_load((CONFIG_DIR / "prompts.yml").read_text()).get("prompts", [])
    for prompt in prompts:
        if prompt.get("task") == "topic_safety_check_input $model=topic_control":
            return prompt["content"]
    return ""


class NemoRails:
    def __init__(self, mode: str, local_url: str = DEFAULT_LOCAL_URL):
        from nemoguardrails import LLMRails, RailsConfig

        self.mode = mode
        self._rails = LLMRails(RailsConfig.from_content(config=load_config_dict(mode, local_url)))

    async def chat(self, messages: list[dict[str, str]]) -> ChatResult:
        response = await self._rails.generate_async(
            messages=messages, options={"log": {"activated_rails": True}}
        )
        blocked = any(rail.type == "input" and rail.stop for rail in response.log.activated_rails)
        return ChatResult(content=response.response[-1]["content"], blocked=blocked)


def create_rails() -> Rails:
    mode = os.environ.get("GUARDRAILS_MODE", "mock")
    if mode not in MODES:
        raise ValueError(f"GUARDRAILS_MODE must be one of {MODES}, got {mode!r}")
    if mode == "mock":
        return MockRails()
    return NemoRails(mode, os.environ.get("TOPIC_CONTROL_URL", DEFAULT_LOCAL_URL))
