"""Load agent prompts from Markdown files."""

from pathlib import Path


def load_prompt(path: Path | str) -> str:
    """Lê um arquivo de prompt e devolve o conteúdo sem espaços nas bordas."""
    return Path(path).read_text(encoding='utf-8').strip()
