"""
Individual trade note and daily summary note writers.
Outputs Obsidian-flavored Markdown with YAML frontmatter compatible with:
  - Dataview, Calendar, Heatmap Calendar, Tracker
"""
from collections import defaultdict
from pathlib import Path

from src.models import Trade
from src.config import config
from src.writer._helpers import _ensure, _trades_dir, _daily_dir, _pnl_emoji


def write_trade_note(trade: Trade) -> Path:
    """Write a single trade as an Obsidian markdown note."""
    output_path = _trades_dir() / trade.note_filename

    frontmatter = f"""---
symbol: {trade.symbol}
date: {trade.date_str}
direction: {trade.direction}
entry_price: {trade.entry_price}
exit_price: {trade.exit_price}
size: {trade.size}
entry_time: "{trade.entry_time.strftime('%Y-%m-%d %H:%M:%S UTC')}"
exit_time: "{trade.exit_time.strftime('%Y-%m-%d %H:%M:%S UTC')}"
hold_minutes: {trade.hold_duration_minutes}
entry_order: {trade.entry_order_id}
exit_order: {trade.exit_order_id}
entry_role: {trade.entry_role}
exit_role: {trade.exit_role}
entry_commission: {round(trade.entry_commission, 6)}
exit_commission: {round(trade.exit_commission, 6)}
total_commission: {round(trade.total_commission, 6)}
gst_in_commission: {round(trade.gst_in_commission, 6)}
net_fee_excl_gst: {round(trade.net_fee_excl_gst, 6)}
entry_notional: {round(trade.entry_notional, 6)}
exit_notional: {round(trade.exit_notional, 6)}
gross_pnl: {round(trade.gross_pnl, 4)}
net_pnl: {round(trade.net_pnl, 4)}
income_tax: {round(trade.income_tax, 4)}
profit_after_tax: {round(trade.profit_after_tax, 4)}
settling_asset: {trade.settling_asset}
is_winner: {str(trade.is_winner).lower()}
tags: [trade, {trade.symbol.lower()}, {trade.direction}, {"winner" if trade.is_winner else "loser"}]
---
"""

    pnl_icon = _pnl_emoji(trade.net_pnl)

    body = f"""# {pnl_icon} {trade.symbol} — {trade.direction.upper()} — {trade.date_str}

## Overview

| Field | Value |
|---|---|
| **Symbol** | `{trade.symbol}` |
| **Direction** | {trade.direction.upper()} |
| **Size** | {trade.size} contracts |
| **Settling Asset** | {trade.settling_asset} |
| **Hold Time** | {trade.hold_duration_minutes} minutes |

## Entry

| Field | Value |
|---|---|
| **Entry Price** | `{trade.entry_price}` |
| **Time** | {trade.entry_time.strftime('%Y-%m-%d %H:%M:%S UTC')} |
| **Order ID** | `{trade.entry_order_id}` |
| **Role** | {trade.entry_role} |
| **Commission** | `{round(trade.entry_commission, 6)}` {trade.settling_asset} |

## Exit

| Field | Value |
|---|---|
| **Exit Price** | `{trade.exit_price}` |
| **Time** | {trade.exit_time.strftime('%Y-%m-%d %H:%M:%S UTC')} |
| **Order ID** | `{trade.exit_order_id}` |
| **Role** | {trade.exit_role} |
| **Commission** | `{round(trade.exit_commission, 6)}` {trade.settling_asset} |

## P&L Breakdown

| Metric | Value |
|---|---|
| **Gross P&L** | `{round(trade.gross_pnl, 4)}` {trade.settling_asset} |
| **Base Fee** | `{round(trade.net_fee_excl_gst, 6)}` {trade.settling_asset} |
| **GST on Fee (18%)** | `{round(trade.gst_in_commission, 6)}` {trade.settling_asset} |
| **Total Commission** | `{round(trade.total_commission, 6)}` {trade.settling_asset} |
| **Net P&L** | **`{round(trade.net_pnl, 4)}`** {trade.settling_asset} {pnl_icon} |
| **Income Tax (slab)** | `{round(trade.income_tax, 4)}` {trade.settling_asset} |
| **Profit After Tax** | **`{round(trade.profit_after_tax, 4)}`** {trade.settling_asset} |

> ⚠️ Tax = speculative business income at your slab rate. Losses carry forward 4 yrs.

## Notes

> _Add your analysis, screenshots, and review here._

---
"""

    output_path.write_text(frontmatter + body, encoding="utf-8")
    return output_path


def write_daily_notes(trades: list[Trade]) -> list[Path]:
    """
    Write one daily summary note per trading day.
    Compatible with: Calendar plugin (dot per day) + Heatmap Calendar (pnl intensity).
    File format: daily/YYYY-MM-DD.md
    """
    by_date: dict[str, list[Trade]] = defaultdict(list)
    for t in trades:
        by_date[t.date_str].append(t)

    written: list[Path] = []

    for day_str, day_trades in sorted(by_date.items()):
        day_net = sum(t.net_pnl for t in day_trades)
        day_gross = sum(t.gross_pnl for t in day_trades)
        day_tax = sum(t.income_tax for t in day_trades)
        day_after_tax = sum(t.profit_after_tax for t in day_trades)
        day_commission = sum(t.total_commission for t in day_trades)
        day_winners = sum(1 for t in day_trades if t.is_winner)
        day_losers = len(day_trades) - day_winners
        icon = _pnl_emoji(day_net)

        trade_rows = ""
        for t in sorted(day_trades, key=lambda x: x.entry_time):
            trade_rows += (
                f"| [[trades/{t.note_filename}|{t.symbol}]] | "
                f"{t.direction.upper()} | `{t.entry_price}` | `{t.exit_price}` | "
                f"`{round(t.net_pnl, 4)}` | {_pnl_emoji(t.net_pnl)} |\n"
            )

        profit_val = round(day_net, 4) if day_net >= 0 else ""
        loss_val = round(abs(day_net), 4) if day_net < 0 else ""

        status = "Profit" if day_net >= 0 else "Loss"
        summary_text = f"{day_winners}W / {day_losers}L | Net: {round(day_net, 2)} USD"

        frontmatter = f"""---
date: {day_str}
pnl: {round(day_net, 4)}
status: {status}
summary: "{summary_text}"
profit: {profit_val}
loss: {loss_val}
gross_pnl: {round(day_gross, 4)}
net_pnl: {round(day_net, 4)}
profit_after_tax: {round(day_after_tax, 4)}
income_tax: {round(day_tax, 4)}
trades: {len(day_trades)}
winners: {day_winners}
losers: {day_losers}
tags: [daily, trading]
---
"""

        body = f"""# {icon} Daily Review — {day_str}

## Summary

| Metric | Value |
|---|---|
| Total Trades | **{len(day_trades)}** |
| Winners | 📈 {day_winners} |
| Losers | 📉 {day_losers} |
| Gross P&L | `{round(day_gross, 4)}` |
| Base Fee (ex-GST) | `{round(day_commission * (100/118), 6)}` |
| GST on Fees (18%) | `{round(day_commission * (18/118), 6)}` |
| Total Commission | `{round(day_commission, 4)}` |
| **Net P&L** | **`{round(day_net, 4)}`** {icon} |
| Income Tax (slab) | `{round(day_tax, 4)}` |
| **After Tax** | **`{round(day_after_tax, 4)}`** |

## Trades

| Symbol | Dir | Entry | Exit | Net P&L | |
|---|---|---|---|---|---|
{trade_rows}
## 📓 Trade Journal & Reflection

> Use this space to record your mindset, execution notes, and lessons learned for the day.

- **Mindset:** 
- **Execution:** 
- **Lessons:** 

---
"""

        output_path = _daily_dir() / f"{day_str}.md"
        output_path.write_text(frontmatter + body, encoding="utf-8")
        written.append(output_path)

    return written
