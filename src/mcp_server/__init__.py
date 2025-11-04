"""FastAPI application providing an OpenAI-compatible chat completions endpoint backed by Ollama."""
from __future__ import annotations

import json
from collections.abc import Generator
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

import ollama
from mcp_server.tools import TOOLS, TOOL_FUNCTIONS

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
    """Handle chat completion requests with optional streaming and tool support."""

    if request.stream:
        return StreamingResponse(
            _stream_chat(request),
            media_type="text/event-stream",
        )

    messages = [message.model_dump() for message in request.messages]

    while True:
        try:
            response = ollama.chat(
                model=request.model,
                messages=messages,
                tools=TOOLS,
                stream=False,
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        assistant_message = response.get("message")
        if not isinstance(assistant_message, dict):
            raise HTTPException(status_code=502, detail="Niepoprawna odpowiedź od modelu")

        messages.append(assistant_message)
        tool_calls = assistant_message.get("tool_calls") or []

        if tool_calls:
            for tool_call in tool_calls:
                function_block = tool_call.get("function", {})
                tool_name = function_block.get("name")
                if not tool_name or tool_name not in TOOL_FUNCTIONS:
                    messages.append(
                        {
                            "role": "tool",
                            "content": f"❌ Błąd: nieznane narzędzie '{tool_name}'",
                            "name": tool_name or "unknown",
                        }
                    )
                    continue

                arguments: Any = function_block.get("arguments", {})
                if isinstance(arguments, str):
                    try:
                        arguments = json.loads(arguments)
                    except json.JSONDecodeError as exc:  # noqa: F841
                        messages.append(
                            {
                                "role": "tool",
                                "content": "❌ Błąd: niepoprawne argumenty narzędzia",
                                "name": tool_name,
                            }
                        )
                        continue

                if not isinstance(arguments, dict):
                    messages.append(
                        {
                            "role": "tool",
                            "content": "❌ Błąd: argumenty muszą być obiektem JSON",
                            "name": tool_name,
                        }
                    )
                    continue

                try:
                    result = TOOL_FUNCTIONS[tool_name](**arguments)
                except TypeError as exc:  # noqa: BLE001
                    result = f"❌ Błąd: niepoprawne argumenty ({exc})"
                messages.append(
                    {
                        "role": "tool",
                        "content": result,
                        "name": tool_name,
                    }
                )

            continue

        clean_message = {
            "role": assistant_message.get("role", "assistant"),
            "content": assistant_message.get("content", ""),
        }

        payload = ChatCompletionResponse(
            choices=[ChatCompletionChoice(message=Message(**clean_message))],
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
