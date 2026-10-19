import pytest
from fastapi.testclient import TestClient
from nemoguardrails import RailsConfig

from app.main import app
from app.rails import REFUSAL, load_config_dict


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("GUARDRAILS_MODE", "mock")
    with TestClient(app) as c:
        yield c


def test_health_reports_mode(client):
    assert client.get("/api/health").json() == {"status": "ok", "mode": "mock"}


def test_off_topic_message_is_blocked(client):
    res = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Which party should I vote for next election?"}]},
    )
    assert res.json() == {"content": REFUSAL, "blocked": True}


def test_on_topic_message_passes(client):
    res = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "How do I cancel my subscription?"}]},
    )
    assert res.json()["blocked"] is False


def test_empty_conversation_is_rejected(client):
    assert client.post("/api/chat", json={"messages": []}).status_code == 422


def test_unknown_mode_fails_startup(monkeypatch):
    monkeypatch.setenv("GUARDRAILS_MODE", "nope")
    with pytest.raises(ValueError):
        with TestClient(app):
            pass


def test_local_mode_points_topic_control_at_nim():
    models = {m["type"]: m for m in load_config_dict("local", "http://nim:8123/v1")["models"]}
    assert models["topic_control"]["parameters"]["base_url"] == "http://nim:8123/v1"
    assert "parameters" not in models["main"]


def test_hosted_mode_uses_config_unchanged():
    config = load_config_dict("hosted")
    assert all("parameters" not in m for m in config["models"])
    assert config["prompts"][0]["task"] == "topic_safety_check_input $model=topic_control"


@pytest.mark.parametrize("mode", ["hosted", "local"])
def test_config_is_valid_for_nemoguardrails(mode):
    RailsConfig.from_content(config=load_config_dict(mode))
