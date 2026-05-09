"""
src.writer — Obsidian markdown writer package.

Public API (backward-compatible with old monolithic writer.py):
  write_trade_note(trade)           → Path
  write_daily_notes(trades)         → list[Path]
  write_dashboard(trades, balance)  → Path
  write_templater_template()        → Path

  # Chart helpers re-exported for tests
  _chart_pnl_bar(trades, n)         → str
  _chart_cumulative(trades)         → str
  _chart_by_symbol(trades)          → str
"""
# Re-export config at the package level so patch("src.writer.config") in tests
# resolves to the same object as src.config.config.
from src.config import config  # noqa: F401  (needed for test patching)

from src.writer.notes import write_trade_note, write_daily_notes
from src.writer.dashboard import write_dashboard
from src.writer.templates import write_templater_template

# Re-export chart helpers so existing tests that import directly from src.writer still pass
from src.writer.charts import _chart_pnl_bar, _chart_cumulative, _chart_by_symbol

__all__ = [
    "config",
    "write_trade_note",
    "write_daily_notes",
    "write_dashboard",
    "write_templater_template",
    "_chart_pnl_bar",
    "_chart_cumulative",
    "_chart_by_symbol",
]
