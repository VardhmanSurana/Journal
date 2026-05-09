"""
Obsidian plugin query block generators.
Produces fenced ```dataview``` and ```tracker``` code block strings.
"""
from src.config import config


# ---------------------------------------------------------------------------
# Tracker plugin blocks
# ---------------------------------------------------------------------------

def _tracker_net_pnl() -> str:
    folder = config.query_path("daily")
    return f"""```tracker
searchType: frontmatter
searchTarget: net_pnl
folder: {folder}
line:
  title: Net P&L per Trade
  yAxisLabel: USD
  lineColor: "#3498db"
  showPoint: true
  pointSize: 4
```"""


def _tracker_commission() -> str:
    folder = config.query_path("daily")
    return f"""```tracker
searchType: frontmatter
searchTarget: total_commission
folder: {folder}
line:
  title: Commission Paid per Trade
  yAxisLabel: USD
  lineColor: "#e67e22"
  showPoint: true
```"""


# ---------------------------------------------------------------------------
# Dataview query blocks
# ---------------------------------------------------------------------------

def _dv_all_trades() -> str:
    folder = config.query_path("trades")
    return f"""```dataview
TABLE WITHOUT ID
  "[[" + file.name + "|" + symbol + "]]" AS Trade,
  direction AS Dir,
  entry_price AS Entry,
  exit_price AS Exit,
  net_pnl AS "Net P&L",
  profit_after_tax AS "After Tax",
  hold_minutes AS "Min",
  total_commission AS Fee
FROM "{folder}"
SORT date DESC
```"""


def _dv_winners() -> str:
    folder = config.query_path("trades")
    return f"""```dataview
TABLE WITHOUT ID
  "[[" + file.name + "|" + symbol + "]]" AS Trade,
  date AS Date,
  net_pnl AS "Net P&L",
  profit_after_tax AS "After Tax"
FROM "{folder}"
WHERE is_winner = true
SORT net_pnl DESC
LIMIT 10
```"""


def _dv_losers() -> str:
    folder = config.query_path("trades")
    return f"""```dataview
TABLE WITHOUT ID
  "[[" + file.name + "|" + symbol + "]]" AS Trade,
  date AS Date,
  net_pnl AS "Net P&L"
FROM "{folder}"
WHERE is_winner = false
SORT net_pnl ASC
LIMIT 10
```"""


def _dv_by_symbol() -> str:
    folder = config.query_path("trades")
    return f"""```dataview
TABLE WITHOUT ID
  symbol AS Symbol,
  length(rows) AS Trades,
  round(sum(rows.net_pnl), 4) AS "Total Net P&L",
  round(sum(rows.gross_pnl), 4) AS "Total Gross P&L",
  round(sum(rows.total_commission), 6) AS "Total Fees"
FROM "{folder}"
GROUP BY symbol
SORT sum(rows.net_pnl) DESC
```"""


def _dv_by_direction() -> str:
    folder = config.query_path("trades")
    return f"""```dataview
TABLE WITHOUT ID
  direction AS Direction,
  length(rows) AS Trades,
  round(sum(rows.net_pnl), 4) AS "Total P&L",
  round(average(rows.net_pnl), 4) AS "Avg P&L"
FROM "{folder}"
GROUP BY direction
```"""


def _dv_this_month() -> str:
    folder = config.query_path("trades")
    return f"""```dataview
TABLE WITHOUT ID
  "[[" + file.name + "|" + symbol + "]]" AS Trade,
  direction AS Dir,
  net_pnl AS "Net P&L",
  profit_after_tax AS "After Tax",
  date AS Date
FROM "{folder}"
WHERE date >= date(today) - dur(30 days)
SORT date DESC
```"""
