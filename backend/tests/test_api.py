import httpx
import pytest
import yaml
from fastapi.testclient import TestClient
from nemoguardrails import RailsConfig

from app import rails
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


def test_policy_returns_topic_control_prompt(client):
    prompts = yaml.safe_load((rails.CONFIG_DIR / "prompts.yml").read_text())["prompts"]
    expected = next(
        p["content"] for p in prompts if p["task"] == "topic_safety_check_input $model=topic_control"
    )
    res = client.get("/api/policy")
    assert res.status_code == 200
    assert res.json() == {"content": expected}


def test_policy_is_read_only(client):
    assert client.post("/api/policy").status_code == 405


def test_policy_is_empty_without_topic_control_prompt(client, monkeypatch, tmp_path):
    (tmp_path / "prompts.yml").write_text("prompts:\n  - task: other\n    content: Not the policy.\n")
    monkeypatch.setattr(rails, "CONFIG_DIR", tmp_path)
    res = client.get("/api/policy")
    assert res.status_code == 200
    assert res.json() == {"content": ""}


@pytest.fixture
def nim(client, monkeypatch):
    """Local mode with the NIM's HTTP layer stubbed; set `respond` to control the answer."""
    monkeypatch.setattr(client.app.state.rails, "mode", "local")
    monkeypatch.setenv("TOPIC_CONTROL_URL", "http://nim.test:8123/v1")
    stub = {"respond": lambda request: httpx.Response(200), "requests": []}

    def handler(request):
        stub["requests"].append(request)
        return stub["respond"](request)

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs)
    )
    return stub


def test_connection_in_mock_mode_skips_nim(client):
    res = client.get("/api/connection")
    assert res.status_code == 200
    assert res.json() == {"mode": "mock", "topic_control_url": None, "nim_ready": None}


def test_connection_in_hosted_mode_skips_nim(client, nim, monkeypatch):
    monkeypatch.setattr(client.app.state.rails, "mode", "hosted")
    res = client.get("/api/connection")
    assert res.json() == {"mode": "hosted", "topic_control_url": None, "nim_ready": None}
    assert nim["requests"] == []


def test_connection_reports_ready_nim(client, nim):
    res = client.get("/api/connection")
    assert res.status_code == 200
    assert res.json() == {"mode": "local", "topic_control_url": "http://nim.test:8123/v1", "nim_ready": True}


def test_connection_reports_nim_not_ready(client, nim):
    nim["respond"] = lambda request: httpx.Response(503)
    res = client.get("/api/connection")
    assert res.status_code == 200
    assert res.json() == {"mode": "local", "topic_control_url": "http://nim.test:8123/v1", "nim_ready": False}


def test_connection_reports_unreachable_nim(client, nim):
    def refuse(request):
        raise httpx.ConnectError("Connection refused", request=request)

    nim["respond"] = refuse
    res = client.get("/api/connection")
    assert res.status_code == 200
    assert res.json()["nim_ready"] is False


@pytest.mark.parametrize("url", ["http://nim.test:8123/v1", "http://nim.test:8123/v1/"])
def test_connection_probes_health_ready(client, nim, monkeypatch, url):
    monkeypatch.setenv("TOPIC_CONTROL_URL", url)
    assert client.get("/api/connection").json()["topic_control_url"] == url
    assert [(r.method, str(r.url)) for r in nim["requests"]] == [
        ("GET", "http://nim.test:8123/v1/health/ready")
    ]


def test_connection_is_read_only(client):
    assert client.post("/api/connection").status_code == 405
