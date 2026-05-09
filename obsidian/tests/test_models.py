"""
Tests for models.py — P&L calculations and trade matching.
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import patch

from src.models import Fill, Trade, match_trades, build_summary


def make_fill(
    id: int,
    symbol: str,
    side: str,
    price: float,
    size: float,
    commission: float = 0.5,
    order_id: str = "order1",
    created_at: str = "2024-01-15T10:00:00+00:00",
    role: str = "taker",
    notional: float = 0.0,
) -> Fill:
    return Fill(
        id=id,
        symbol=symbol,
        side=side,
        price=price,
        size=size,
        commission=commission,
        role=role,
        order_id=order_id,
        created_at=created_at,
        settling_asset="USD",
        fill_type="normal",
        notional=notional,
    )


# ---------------------------------------------------------------------------
# Fill.timestamp tests
# ---------------------------------------------------------------------------

def test_fill_timestamp_iso():
    f = make_fill(1, "BTCUSD", "buy", 60000, 1, created_at="2024-01-15T10:00:00+00:00")
    assert f.timestamp.year == 2024
    assert f.timestamp.month == 1


def test_fill_timestamp_microseconds():
    # 1705312800000000 µs = 2024-01-15 10:00:00 UTC
    f = make_fill(1, "BTCUSD", "buy", 60000, 1, created_at="1705312800000000")
    assert f.timestamp.year == 2024


# ---------------------------------------------------------------------------
# Trade.calculate — long trade
# ---------------------------------------------------------------------------

def test_long_trade_profit():
    with patch("src.models.config") as mock_cfg:
        mock_cfg.INCOME_TAX_SLAB = 0.30

        # Simulate XAUTUSD: 1 contract = 0.001 oz
        # entry notional = 1 contract × 60000 × 0.001 = 60
        # exit notional  = 1 contract × 61000 × 0.001 = 61
        t = Trade(
            symbol="BTCUSD",
            direction="long",
            entry_price=60000,
            exit_price=61000,
            size=1,
            entry_time=datetime(2024, 1, 15, 10, tzinfo=timezone.utc),
            exit_time=datetime(2024, 1, 15, 11, tzinfo=timezone.utc),
            entry_commission=5.0,
            exit_commission=5.0,
            settling_asset="USD",
            entry_order_id="o1",
            exit_order_id="o2",
            entry_role="taker",
            exit_role="taker",
            entry_notional=60.0,
            exit_notional=61.0,
        )
        t.calculate()

    assert t.gross_pnl == 1.0          # 61 - 60
    assert t.total_commission == 10.0
    assert t.net_pnl == -9.0           # 1.0 - 10.0 (fee > gross profit)
    assert t.income_tax == 0.0         # loss, no tax
    assert t.gst_in_commission == pytest.approx(10.0 * 18 / 118)
    assert t.is_winner is False


def test_long_trade_loss():
    with patch("src.models.config") as mock_cfg:
        mock_cfg.INCOME_TAX_SLAB = 0.30

        t = Trade(
            symbol="BTCUSD",
            direction="long",
            entry_price=60000,
            exit_price=59000,
            size=1,
            entry_time=datetime(2024, 1, 15, 10, tzinfo=timezone.utc),
            exit_time=datetime(2024, 1, 15, 11, tzinfo=timezone.utc),
            entry_commission=5.0,
            exit_commission=5.0,
            settling_asset="USD",
            entry_order_id="o1",
            exit_order_id="o2",
            entry_role="taker",
            exit_role="taker",
            entry_notional=600.0,   # 1 contract × 60000 × 0.01
            exit_notional=590.0,    # 1 contract × 59000 × 0.01
        )
        t.calculate()

    assert t.gross_pnl == -10.0        # 590 - 600
    assert t.net_pnl == -20.0          # -10 - 10 commission
    assert t.income_tax == 0.0
    assert t.is_winner is False


def test_short_trade_profit():
    with patch("src.models.config") as mock_cfg:
        mock_cfg.INCOME_TAX_SLAB = 0.30

        t = Trade(
            symbol="ETHUSD",
            direction="short",
            entry_price=3000,
            exit_price=2800,
            size=3,
            entry_time=datetime(2024, 1, 15, 10, tzinfo=timezone.utc),
            exit_time=datetime(2024, 1, 15, 11, tzinfo=timezone.utc),
            entry_commission=1.0,
            exit_commission=1.0,
            settling_asset="USD",
            entry_order_id="o3",
            exit_order_id="o4",
            entry_role="maker",
            exit_role="maker",
            entry_notional=90.0,   # 3 × 3000 × 0.01
            exit_notional=84.0,    # 3 × 2800 × 0.01
        )
        t.calculate()

    assert t.gross_pnl == 6.0     # 90 - 84 (short: entry - exit)
    assert t.net_pnl == 4.0       # 6 - 2 commission
    assert t.income_tax == pytest.approx(1.2)
    assert t.is_winner is True


# ---------------------------------------------------------------------------
# match_trades
# ---------------------------------------------------------------------------

def test_match_long_round_trip():
    fills = [
        make_fill(1, "BTCUSD", "buy",  60000, 1, order_id="open1",  created_at="2024-01-15T10:00:00+00:00"),
        make_fill(2, "BTCUSD", "sell", 61000, 1, order_id="close1", created_at="2024-01-15T11:00:00+00:00"),
    ]
    trades = match_trades(fills)
    assert len(trades) == 1
    assert trades[0].direction == "long"
    assert trades[0].entry_price == 60000
    assert trades[0].exit_price == 61000


def test_match_short_round_trip():
    fills = [
        make_fill(1, "ETHUSD", "sell", 3000, 1, order_id="open2",  created_at="2024-01-15T10:00:00+00:00"),
        make_fill(2, "ETHUSD", "buy",  2800, 1, order_id="close2", created_at="2024-01-15T11:00:00+00:00"),
    ]
    trades = match_trades(fills)
    assert len(trades) == 1
    assert trades[0].direction == "short"


def test_unmatched_open_not_included():
    """A fill without a closing fill should not appear as a trade."""
    fills = [
        make_fill(1, "BTCUSD", "buy", 60000, 1, order_id="open3", created_at="2024-01-15T10:00:00+00:00"),
    ]
    trades = match_trades(fills)
    assert len(trades) == 0


def test_multiple_symbols():
    fills = [
        make_fill(1, "BTCUSD", "buy",  60000, 1, order_id="b1", created_at="2024-01-15T10:00:00+00:00"),
        make_fill(2, "BTCUSD", "sell", 61000, 1, order_id="b2", created_at="2024-01-15T11:00:00+00:00"),
        make_fill(3, "ETHUSD", "buy",  3000,  2, order_id="e1", created_at="2024-01-15T10:00:00+00:00"),
        make_fill(4, "ETHUSD", "sell", 3100,  2, order_id="e2", created_at="2024-01-15T11:00:00+00:00"),
    ]
    trades = match_trades(fills)
    assert len(trades) == 2
    symbols = {t.symbol for t in trades}
    assert symbols == {"BTCUSD", "ETHUSD"}


# ---------------------------------------------------------------------------
# build_summary
# ---------------------------------------------------------------------------

def test_build_summary_empty():
    assert build_summary([]) == {}


def test_build_summary_win_rate():
    with patch("src.models.config") as mock_cfg:
        mock_cfg.INCOME_TAX_SLAB = 0.30

        fills = [
            # Winning trade: BTCUSD long, notional 60→61 → gross +1.0
            make_fill(1, "BTCUSD", "buy",  60000, 1, commission=0, order_id="w1", created_at="2024-01-15T10:00:00+00:00", notional=60.0),
            make_fill(2, "BTCUSD", "sell", 61000, 1, commission=0, order_id="w2", created_at="2024-01-15T11:00:00+00:00", notional=61.0),
            # Losing trade: ETHUSD long, notional 30→29 → gross -1.0
            make_fill(3, "ETHUSD", "buy",  3000, 1, commission=0, order_id="l1", created_at="2024-01-16T10:00:00+00:00", notional=30.0),
            make_fill(4, "ETHUSD", "sell", 2900, 1, commission=0, order_id="l2", created_at="2024-01-16T11:00:00+00:00", notional=29.0),
        ]
        trades = match_trades(fills)
        for t in trades:
            t.calculate()

        summary = build_summary(trades)

    assert summary["total_trades"] == 2
    assert summary["winners"] == 1
    assert summary["losers"] == 1
    assert summary["win_rate"] == 50.0
