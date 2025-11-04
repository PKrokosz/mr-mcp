"""Unit tests for tool functions exposed to the MCP agent."""

import json
from pathlib import Path
from typing import Iterator

import pytest

from mcp_server import tools


@pytest.fixture()
def isolated_project(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Provide a temporary project root for tool operations."""

    monkeypatch.setattr(tools, "PROJECT_ROOT", tmp_path)
    yield tmp_path


def test_read_file(isolated_project: Path) -> None:
    """read_file should return file contents for files inside the project root."""

    target = isolated_project / "sample.txt"
    target.write_text("hello", encoding="utf-8")

    assert tools.read_file("sample.txt") == "hello"


def test_write_file(isolated_project: Path) -> None:
    """write_file should create files within the project root."""

    result = tools.write_file("folder/output.txt", "content")
    assert "✅" in result
    created = isolated_project / "folder" / "output.txt"

    assert created.exists()
    assert created.read_text(encoding="utf-8") == "content"


def test_list_files(isolated_project: Path) -> None:
    """list_files should list files inside the provided directory."""

    (isolated_project / "a.txt").write_text("A", encoding="utf-8")
    (isolated_project / "b").mkdir()

    listing = json.loads(tools.list_files())
    assert set(listing) == {"a.txt", "b"}


def test_run_shell_command_safe(isolated_project: Path) -> None:
    """run_shell_command should execute benign commands."""

    result = tools.run_shell_command("echo test")
    assert "test" in result


def test_run_shell_command_blocked(isolated_project: Path) -> None:
    """run_shell_command should reject dangerous commands."""

    result = tools.run_shell_command("rm -rf /")
    assert "❌" in result


def test_search_in_files(isolated_project: Path) -> None:
    """search_in_files should return matches as JSON."""

    file_path = isolated_project / "notes.txt"
    file_path.write_text("TODO: finish tests", encoding="utf-8")

    matches = json.loads(tools.search_in_files(r"TODO"))
    assert matches == [
        {
            "file": "notes.txt",
            "line": 1,
            "match": "TODO",
        }
    ]
