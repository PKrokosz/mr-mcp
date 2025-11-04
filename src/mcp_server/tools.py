"""Tool functions exposed to the MCP agent."""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any, Callable, Dict, List

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _within_project(path: Path) -> bool:
    """Return True if the provided path is inside the project root."""

    try:
        path.resolve().relative_to(PROJECT_ROOT)
    except ValueError:
        return False
    return True


TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Odczytuje zawartość pliku tekstowego.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Ścieżka do pliku w katalogu projektu.",
                    }
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Zapisuje tekst do pliku (tworzy lub nadpisuje).",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Ścieżka do pliku w katalogu projektu.",
                    },
                    "content": {
                        "type": "string",
                        "description": "Treść do zapisania w pliku.",
                    },
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "Listuje pliki i katalogi w podanej ścieżce.",
            "parameters": {
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Ścieżka katalogu w projekcie (domyślnie bieżący).",
                        "default": ".",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_shell_command",
            "description": "Wykonuje komendę powłoki z ograniczeniami bezpieczeństwa.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "Polecenie do wykonania (bezpieczne).",
                    }
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_in_files",
            "description": "Wyszukuje wzorzec regex w plikach katalogu.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "Wyrażenie regularne do wyszukania.",
                    },
                    "directory": {
                        "type": "string",
                        "description": "Ścieżka katalogu w projekcie (domyślnie bieżący).",
                        "default": ".",
                    },
                },
                "required": ["pattern"],
            },
        },
    },
]


def read_file(path: str) -> str:
    """Return the contents of a text file within the project."""

    target = PROJECT_ROOT / path
    if not _within_project(target):
        return "❌ Błąd: dostęp poza katalogiem projektu jest zabroniony"
    try:
        result = target.read_text(encoding="utf-8")
    except Exception as exc:  # noqa: BLE001
        result = f"❌ Błąd: {exc}"
    print(f"[TOOL] read_file → {result[:100]}")
    return result


def write_file(path: str, content: str) -> str:
    """Write text content to a file within the project."""

    target = PROJECT_ROOT / path
    if not _within_project(target):
        result = "❌ Błąd: dostęp poza katalogiem projektu jest zabroniony"
    else:
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
            result = "✅ Zapisano plik"
        except Exception as exc:  # noqa: BLE001
            result = f"❌ Błąd: {exc}"
    print(f"[TOOL] write_file → {result[:100]}")
    return result


def list_files(directory: str = ".") -> str:
    """List files and directories within a project directory."""

    target_dir = PROJECT_ROOT / directory
    if not _within_project(target_dir):
        result = "❌ Błąd: dostęp poza katalogiem projektu jest zabroniony"
    elif not target_dir.exists():
        result = "❌ Błąd: katalog nie istnieje"
    elif not target_dir.is_dir():
        result = "❌ Błąd: podana ścieżka nie jest katalogiem"
    else:
        entries = sorted(item.name for item in target_dir.iterdir())
        result = json.dumps(entries, ensure_ascii=False)
    print(f"[TOOL] list_files → {result[:100]}")
    return result


_FORBIDDEN_PATTERNS = [
    re.compile(r"rm\s+-rf", re.IGNORECASE),
    re.compile(r"sudo", re.IGNORECASE),
    re.compile(r":\(\)\{:\|:&\};:")
]


def run_shell_command(command: str) -> str:
    """Execute a shell command with simple security validation."""

    normalized = command.strip()
    if not normalized:
        result = "❌ Błąd: komenda nie może być pusta"
    elif any(pattern.search(normalized) for pattern in _FORBIDDEN_PATTERNS):
        result = "❌ Błąd: komenda zabroniona przez politykę bezpieczeństwa"
    else:
        try:
            completed = subprocess.run(  # noqa: S603
                normalized,
                shell=True,
                cwd=PROJECT_ROOT,
                check=False,
                capture_output=True,
                text=True,
            )
            stdout = completed.stdout.strip()
            stderr = completed.stderr.strip()
            result_parts = []
            if stdout:
                result_parts.append(stdout)
            if stderr:
                result_parts.append(f"[stderr]\n{stderr}")
            result = "\n".join(result_parts) or "(brak danych)"
        except Exception as exc:  # noqa: BLE001
            result = f"❌ Błąd: {exc}"
    print(f"[TOOL] run_shell_command → {result[:100]}")
    return result


def search_in_files(pattern: str, directory: str = ".") -> str:
    """Search for a regex pattern within project files."""

    target_dir = PROJECT_ROOT / directory
    if not _within_project(target_dir):
        result = "❌ Błąd: dostęp poza katalogiem projektu jest zabroniony"
        print(f"[TOOL] search_in_files → {result[:100]}")
        return result
    if not target_dir.exists():
        result = "❌ Błąd: katalog nie istnieje"
        print(f"[TOOL] search_in_files → {result[:100]}")
        return result

    matches: List[Dict[str, Any]] = []
    compiled_pattern = re.compile(pattern)
    for root, _, files in os.walk(target_dir):
        root_path = Path(root)
        for file_name in files:
            file_path = root_path / file_name
            if not _within_project(file_path):
                continue
            try:
                content = file_path.read_text(encoding="utf-8")
            except Exception:
                continue
            for line_no, line in enumerate(content.splitlines(), start=1):
                match = compiled_pattern.search(line)
                if match:
                    matches.append(
                        {
                            "file": str(file_path.relative_to(PROJECT_ROOT)),
                            "line": line_no,
                            "match": match.group(0),
                        }
                    )
    result = json.dumps(matches, ensure_ascii=False)
    print(f"[TOOL] search_in_files → {result[:100]}")
    return result


TOOL_FUNCTIONS: Dict[str, Callable[..., str]] = {
    "read_file": read_file,
    "write_file": write_file,
    "list_files": list_files,
    "run_shell_command": run_shell_command,
    "search_in_files": search_in_files,
}
