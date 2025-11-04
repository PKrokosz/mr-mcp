"""FastAPI application providing an OpenAI-compatible chat completions endpoint backed by Ollama."""
from collections.abc import Generator
from typing import Any, Dict, List

import json

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

import ollama

app = FastAPI(title="MCP – lokalny OpenAI-klon")


class Message(BaseModel):
    """Represents a single chat message."""

    role: str
    content: str


class ChatRequest(BaseModel):
    """Schema describing the payload expected by the chat completions endpoint."""

    model: str = Field(default="llama3.2:3b")
    messages: List[Message]
    stream: bool = Field(default=False)


class ChatCompletionChoice(BaseModel):
    """Structure for a single completion choice."""

    message: Message


class ChatCompletionResponse(BaseModel):
    """Non-streaming chat completion response."""

    choices: List[ChatCompletionChoice]
    model: str


@app.post("/v1/chat/completions")
async def chat_completion(request: ChatRequest) -> Any:
    """Handle chat completion requests with optional streaming."""

    if request.stream:
        return StreamingResponse(
            _stream_chat(request),
            media_type="text/event-stream",
        )

    try:
        response = ollama.chat(
            model=request.model,
            messages=[message.model_dump() for message in request.messages],
            stream=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    payload = ChatCompletionResponse(
        choices=[
            ChatCompletionChoice(
                message=Message(**response["message"])  # type: ignore[arg-type]
            )
        ],
        model=request.model,
    )

    return JSONResponse(content=payload.model_dump())


def _stream_chat(request: ChatRequest) -> Generator[str, None, None]:
    """Yield Server Sent Events for streaming chat completions."""

    def _event(payload: Dict[str, Any]) -> str:
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

    try:
        stream = ollama.chat(
            model=request.model,
            messages=[message.model_dump() for message in request.messages],
            stream=True,
        )
    except Exception as exc:  # noqa: BLE001
        yield _event({"error": str(exc)})
        yield "data: [DONE]\n\n"
        return

    for chunk in stream:
        if "message" in chunk and chunk["message"]:
            yield _event(
                {
                    "choices": [
                        {
                            "delta": chunk["message"],
                            "finish_reason": chunk.get("done_reason"),
                        }
                    ]
                }
            )
        if chunk.get("done"):
            break

    yield "data: [DONE]\n\n"


__all__ = ["app", "chat_completion"]
