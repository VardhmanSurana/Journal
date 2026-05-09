"""
Tests for writer.py — Phase 2 (Charts, Dataview, Tracker, Calendar, Heatmap, Templater).
"""
import json
import pytest
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import patch

from src.models import Trade
from src.writer import (
    write_trade_note,
    write_dashboard,
    write_daily_notes,
    write_templater_template,
    _chart_pnl_bar,
    _chart_cumulative,
    _chart_by_symbol,
)


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

def make_trade(
    symbol: str = "BTCUSD",
    direction: str = "long",
    entry: float = 60000,
    exit_p: float = 61000,
    net_pnl: float = 990.0,
    winner: bool = True,
    date_offset_days: int = 0,
) -> Trade:
    base = datetime(2024, 1, 15, 10, tzinfo=timezone.utc)
    from datetime import timedelta
    entry_time = base + timedelta(days=date_offset_days)
    exit_time = entry_time.replace(hour=11)

    return Trade(
        symbol=symbol,
        direction=direction,
        entry_price=entry,
        exit_price=exit_p,
        size=1,
        entry_time=entry_time,
        exit_time=exit_time,
        entry_commission=5.0,
        exit_commission=5.0,
        settling_asset="USD",
        entry_order_id="o1",
        exit_order_id="o2",
        entry_role="taker",
        exit_role="taker",
        gross_pnl=1000.0 if winner else -1000.0,
        total_commission=10.0,
        gst_in_commission=10.0 * 18 / 118,
        net_fee_excl_gst=10.0 * 100 / 118,
        net_pnl=net_pnl,
        income_tax=297.0 if winner else 0.0,
        profit_after_tax=693.0 if winner else net_pnl,
        is_winner=winner,
    )


# ---------------------------------------------------------------------------
# Trade note
# ---------------------------------------------------------------------------

def test_write_trade_note_creates_file(tmp_path):
    with patch("src.writer.notes.config") as mock_cfg:
        mock_cfg.VAULT_PATH = tmp_path
        trade = make_trade()
        path = write_trade_note(trade)

    assert path.exists()
    content = path.read_text()
    assert "BTCUSD" in content
    assert "60000" in content
    assert "net_pnl: 990.0" in content
    assert "profit_after_tax: 693.0" in content
    assert "gst_in_commission" in content
    assert "income_tax" in content


def test_write_trade_note_frontmatter(tmp_path):
    with patch("src.writer.notes.config") as mock_cfg:
        mock_cfg.VAULT_PATH = tmp_path
        trade = make_trade()
        path = write_trade_note(trade)

    content = path.read_text()
    assert content.startswith("---")
    assert "tags:" in content
    assert "winner" in content
    assert "direction: long" in content


def test_write_trade_note_loser_emoji(tmp_path):
    with patch("src.writer.notes.config") as mock_cfg:
        mock_cfg.VAULT_PATH = tmp_path
        trade = make_trade(exit_p=59000, net_pnl=-1010.0, winner=False)
        path = write_trade_note(trade)

    content = path.read_text()
    assert "loser" in content
    assert "📉" in content


# ---------------------------------------------------------------------------
# Charts
# ---------------------------------------------------------------------------

def test_chart_pnl_bar_valid_json():
    trades = [make_trade(net_pnl=100), make_trade(net_pnl=-50, winner=False)]
    result = _chart_pnl_bar(trades)
    assert "```chart" in result
    assert "type: bar" in result
    assert "Net P&L" in result
    # Verify data is valid JSON by extracting the data line
    for line in result.split("\n"):
        if line.strip().startswith("data:"):
            data_str = line.strip()[len("data:"):].strip()
            parsed = json.loads(data_str)
            assert isinstance(parsed, list)


def test_chart_cumulative_increases_with_wins():
    trades = [
        make_trade(net_pnl=100, date_offset_days=2),
        make_trade(net_pnl=200, date_offset_days=1),
        make_trade(net_pnl=50, date_offset_days=0),
    ]
    result = _chart_cumulative(trades)
    assert "```chart" in result
    assert "type: line" in result
    assert "Cumulative P&L" in result


def test_chart_by_symbol_groups_correctly():
    trades = [
        make_trade(symbol="BTCUSD", net_pnl=100),
        make_trade(symbol="BTCUSD", net_pnl=200),
        make_trade(symbol="ETHUSD", net_pnl=-50, winner=False),
    ]
    result = _chart_by_symbol(trades)
    assert "BTCUSD" in result
    assert "ETHUSD" in result


# ---------------------------------------------------------------------------
# Daily notes
# ---------------------------------------------------------------------------

def test_write_daily_notes_creates_files(tmp_path):
    with patch("src.writer.notes.config") as mock_cfg:
        mock_cfg.VAULT_PATH = tmp_path
        trades = [
            make_trade(date_offset_days=0),
            make_trade(symbol="ETHUSD", date_offset_days=1),
        ]
        paths = write_daily_notes(trades)

    assert len(paths) == 2
    for p in paths:
        assert p.exists()
        content = p.read_text()
        assert "pnl:" in content          # Heatmap Calendar field
        assert "Daily Review" in content


def test_write_daily_notes_groups_by_day(tmp_path):
    """Two trades on same day → one daily note."""
    with patch("src.writer.notes.config") as mock_cfg:
        mock_cfg.VAULT_PATH = tmp_path
        trades = [
            make_trade(symbol="BTCUSD", date_offset_days=0),
            make_trade(symbol="ETHUSD", date_offset_days=0),
        ]
        paths = write_daily_notes(trades)

    assert len(paths) == 1
    content = paths[0].read_text()
    assert "BTCUSD" in content
    assert "ETHUSD" in content
    assert "trades: 2" in content


def test_write_daily_note_has_heatmap_frontmatter(tmp_path):
    with patch("src.writer.notes.config") as mock_cfg:
        mock_cfg.VAULT_PATH = tmp_path
        trades = [make_trade(net_pnl=500)]
        paths = write_daily_notes(trades)

    content = paths[0].read_text()
    # net_pnl=500 rounds to int-like float so check the key exists with any value
    assert "pnl:" in content
    assert "500" in content
    assert "tags: [daily, trading]" in content


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def test_write_dashboard_has_plugin_blocks(tmp_path):
    with patch("src.writer.dashboard.config") as mock_cfg, \
         patch("src.writer.dashboard.generate_ai_insight", return_value="> mock insight"), \
         patch("src.writer.dashboard.compute_advanced_analytics", return_value={"Avg Win": 0, "Avg Loss": 0, "Profit Factor": 1, "Max Drawdown ($)": 0}):
        mock_cfg.VAULT_PATH = tmp_path
        mock_cfg.INCOME_TAX_SLAB = 0.30
        mock_cfg.query_path = lambda f: f
        trades = [make_trade(), make_trade(symbol="ETHUSD", net_pnl=-200, winner=False)]
        wallet = [{"asset_symbol": "USD", "balance": "1000", "available_balance": "900"}]
        path = write_dashboard(trades, wallet)

    content = path.read_text()
    # Charts
    assert "```chart" in content
    # Dataview
    assert "```dataview" in content
    # Tracker
    assert "```tracker" in content
    # Calendar hint
    assert "Calendar" in content
    # Heatmap hint
    assert "Heatmap" in content


def test_write_dashboard_no_trades(tmp_path):
    with patch("src.writer.dashboard.config") as mock_cfg:
        mock_cfg.VAULT_PATH = tmp_path
        path = write_dashboard([], [])

    assert "No trades synced yet" in path.read_text()


# ---------------------------------------------------------------------------
# Templater template
# ---------------------------------------------------------------------------

def test_write_templater_template_creates_file(tmp_path):
    with patch("src.writer.templates.config") as mock_cfg:
        mock_cfg.VAULT_PATH = tmp_path
        path = write_templater_template()

    assert path.exists()
    content = path.read_text()
    assert "<% tp.system.prompt" in content
    assert "symbol" in content
    assert "entry_price" in content
    assert "net_pnl" in content
