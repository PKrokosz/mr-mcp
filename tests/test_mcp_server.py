"""Unit tests for the MCP-compatible FastAPI server."""
from typing import Any, Dict, Iterator

import json

import pytest
from fastapi.testclient import TestClient

import mcp_server
from mcp_server import tools as tool_module


@pytest.fixture()
def client() -> Iterator[TestClient]:
    """Provide a TestClient instance for the FastAPI app."""

    with TestClient(mcp_server.app) as test_client:
        yield test_client


def test_chat_completion_non_streaming(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    """Ensure the endpoint formats non-streaming responses correctly."""

    def fake_chat(*, model: str, messages: Any, stream: bool, tools: Any = None) -> Dict[str, Any]:  # type: ignore[override]
        assert model == "llama3.2:3b"
        assert stream is False
        assert messages[0]["content"] == "Hello"
        assert tools == tool_module.TOOLS
        return {"message": {"role": "assistant", "content": "Hi there"}}

    monkeypatch.setattr(mcp_server.ollama, "chat", fake_chat)

    response = client.post(
        "/v1/chat/completions",
        json={
            "messages": [{"role": "user", "content": "Hello"}],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["model"] == "llama3.2:3b"
    assert payload["choices"][0]["message"]["content"] == "Hi there"


def test_chat_completion_streaming(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    """Validate Server-Sent Events are emitted for streaming responses."""

    def fake_stream_chat(*, model: str, messages: Any, stream: bool):  # type: ignore[override]
        assert stream is True
        assert model == "llama3.2:3b"
        assert messages[0]["content"] == "Stream please"

        yield {"message": {"role": "assistant", "content": "Hel"}}
        yield {
            "message": {"role": "assistant", "content": "lo"},
            "done": True,
            "done_reason": "stop",
        }

    monkeypatch.setattr(mcp_server.ollama, "chat", fake_stream_chat)

    with client.stream(
        "POST",
        "/v1/chat/completions",
        json={
            "messages": [{"role": "user", "content": "Stream please"}],
            "stream": True,
        },
    ) as response:
        chunks = list(response.iter_text())

    assert response.status_code == 200
    stream_body = "".join(chunks)
    assert "\"delta\": {\"role\": \"assistant\", \"content\": \"Hel\"}" in stream_body
    assert stream_body.strip().endswith("data: [DONE]")



def test_chat_completion_tool_call(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    """Ensure tool calls are executed and fed back to the model."""

    call_state = {"step": 0}

    def fake_chat(*, model: str, messages: Any, stream: bool, tools: Any = None) -> Dict[str, Any]:  # type: ignore[override]
        assert stream is False
        assert model == "llama3.2:3b"
        if call_state["step"] == 0:
            call_state["step"] += 1
            assert tools == tool_module.TOOLS
            assert messages[-1]["role"] == "user"
            return {
                "message": {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [
                        {
                            "function": {
                                "name": "read_file",
                                "arguments": json.dumps({"path": "README.md"}),
                            }
                        }
                    ],
                }
            }
        assert messages[-1]["role"] == "tool"
        return {"message": {"role": "assistant", "content": "Finished"}}

    monkeypatch.setattr(mcp_server.ollama, "chat", fake_chat)

    monkeypatch.setitem(tool_module.TOOL_FUNCTIONS, "read_file", lambda **kwargs: "file contents")

    response = client.post(
        "/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "Use a tool"}]},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["choices"][0]["message"]["content"] == "Finished"
