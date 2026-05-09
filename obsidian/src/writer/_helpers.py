"""Shared helpers for the writer subpackage."""
from pathlib import Path
from src.config import config  # re-exported so sub-modules import from here


def _ensure(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def _trades_dir() -> Path:
    return _ensure(config.VAULT_PATH / "trades")


def _daily_dir() -> Path:
    return _ensure(config.VAULT_PATH / "daily")


def _pnl_emoji(value: float) -> str:
    if value > 0:
        return "📈"
    if value < 0:
        return "📉"
    return "⚪"
