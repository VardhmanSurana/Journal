"""
Templater trade template writer.
Generates a manually-fillable trade entry template for the Obsidian Templater plugin.
"""
from pathlib import Path
from src.config import config
from src.writer._helpers import _ensure


def write_templater_template() -> Path:
    """
    Write the Templater trade template (one-time).
    Used for manually logging trades not captured by the API
    (e.g., paper trades, futures on another exchange).
    """
    template_dir = _ensure(config.VAULT_PATH / "_templates")
    output_path = template_dir / "trade.md"

    content = """---
symbol: <% tp.system.prompt("Symbol (e.g. BTCUSD)") %>
date: <% tp.date.now("YYYY-MM-DD") %>
direction: <% tp.system.suggester(["long", "short"], ["long", "short"]) %>
entry_price: <% tp.system.prompt("Entry Price") %>
exit_price: <% tp.system.prompt("Exit Price") %>
size: <% tp.system.prompt("Size (contracts)") %>
entry_time: "<% tp.date.now("YYYY-MM-DD HH:mm:ss") %> UTC"
exit_time: "<% tp.date.now("YYYY-MM-DD HH:mm:ss") %> UTC"
hold_minutes: 0
entry_order: manual
exit_order: manual
entry_role: taker
exit_role: taker
entry_commission: 0
exit_commission: 0
total_commission: 0
gross_pnl: 0
net_pnl: 0
income_tax: 0
profit_after_tax: 0
settling_asset: USD
is_winner: false
tags: [trade, manual]
---

# ⚪ <% tp.frontmatter["symbol"] %> — <% tp.frontmatter["direction"] %> — <% tp.date.now("YYYY-MM-DD") %>

> ⚠️ This is a manually entered trade. Fill in the P&L fields below.

## Overview

| Field | Value |
|---|---|
| **Symbol** | `<% tp.frontmatter["symbol"] %>` |
| **Direction** | `<% tp.frontmatter["direction"] %>` |
| **Size** | `<% tp.frontmatter["size"] %>` contracts |

## Entry

| Field | Value |
|---|---|
| **Entry Price** | `<% tp.frontmatter["entry_price"] %>` |
| **Commission** | `` |

## Exit

| Field | Value |
|---|---|
| **Exit Price** | `<% tp.frontmatter["exit_price"] %>` |
| **Commission** | `` |

## P&L Breakdown

| Metric | Value |
|---|---|
| **Gross P&L** | `` |
| **Commission** | `` |
| **Net P&L** | `` |
| **Income Tax (slab)** | `` |
| **Profit After Tax** | `` |

## Notes

> _Add your analysis here._
"""

    output_path.write_text(content, encoding="utf-8")
    return output_path
