"""
Chart.js plugin blocks for the Obsidian Charts plugin.
Each function returns a fenced ```chart``` code block string.
"""
import json
from collections import defaultdict

from src.models import Trade


def _chart_pnl_bar(trades: list[Trade], n: int = 20) -> str:
    """Bar chart of last N trades net P&L — green/red per result."""
    recent = list(reversed(trades[:n]))  # chronological order
    labels = json.dumps([f"{t.symbol} {t.date_str}" for t in recent])
    data = json.dumps([round(t.net_pnl, 4) for t in recent])
    colors = json.dumps(["#2ecc71" if t.is_winner else "#e74c3c" for t in recent])

    return f"""```chart
type: bar
labels: {labels}
series:
  - title: Net P&L
    data: {data}
    backgroundColor: {colors}
tension: 0.2
width: 100%
labelColors: false
fill: false
beginAtZero: true
```"""


def _chart_cumulative(trades: list[Trade]) -> str:
    """Line chart of cumulative net P&L over time."""
    chronological = list(reversed(trades))
    labels = json.dumps([t.date_str for t in chronological])
    cumulative = []
    running = 0.0
    for t in chronological:
        running += t.net_pnl
        cumulative.append(round(running, 4))

    return f"""```chart
type: line
labels: {labels}
series:
  - title: Cumulative P&L
    data: {json.dumps(cumulative)}
    backgroundColor: "rgba(52, 152, 219, 0.2)"
    borderColor: "#3498db"
    fill: true
tension: 0.3
width: 100%
beginAtZero: false
```"""


def _chart_by_symbol(trades: list[Trade]) -> str:
    """Bar chart of total net P&L grouped by symbol."""
    by_symbol: dict[str, float] = defaultdict(float)
    for t in trades:
        by_symbol[t.symbol] += t.net_pnl

    symbols = list(by_symbol.keys())
    values = [round(by_symbol[s], 4) for s in symbols]
    colors = ["#2ecc71" if v >= 0 else "#e74c3c" for v in values]

    return f"""```chart
type: bar
labels: {json.dumps(symbols)}
series:
  - title: Net P&L by Symbol
    data: {json.dumps(values)}
    backgroundColor: {json.dumps(colors)}
width: 100%
beginAtZero: true
```"""


def _chart_win_loss_pie(summary: dict) -> str:
    """Pie chart of winners vs losers."""
    return f"""```chart
type: pie
labels: ["Winners", "Losers"]
series:
  - title: Win/Loss
    data: [{summary["winners"]}, {summary["losers"]}]
    backgroundColor: ["#2ecc71", "#e74c3c"]
width: 60%
```"""
