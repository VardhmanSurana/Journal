import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from src.models import Trade

DB_PATH = Path(__file__).parent.parent / "journal.db"

# ---------------------------------------------------------------------------
# New columns added in v2 of the schema.
# Applied with try/except so existing databases are migrated non-destructively.
# ---------------------------------------------------------------------------
_MIGRATION_COLUMNS: list[tuple[str, str]] = [
    ("gst_in_commission",  "REAL DEFAULT 0"),
    ("net_fee_excl_gst",   "REAL DEFAULT 0"),
    ("income_tax",         "REAL DEFAULT 0"),
    ("profit_after_tax",   "REAL DEFAULT 0"),
    ("entry_notional",     "REAL DEFAULT 0"),
    ("exit_notional",      "REAL DEFAULT 0"),
    ("entry_role",         "TEXT DEFAULT ''"),
    ("exit_role",          "TEXT DEFAULT ''"),
    ("settling_asset",     "TEXT DEFAULT ''"),
]


def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                id               TEXT PRIMARY KEY,
                symbol           TEXT,
                direction        TEXT,
                entry_time       TEXT,
                exit_time        TEXT,
                entry_price      REAL,
                exit_price       REAL,
                size             REAL,
                gross_pnl        REAL,
                net_pnl          REAL,
                total_commission REAL,
                gst_in_commission  REAL DEFAULT 0,
                net_fee_excl_gst   REAL DEFAULT 0,
                income_tax         REAL DEFAULT 0,
                profit_after_tax   REAL DEFAULT 0,
                entry_notional     REAL DEFAULT 0,
                exit_notional      REAL DEFAULT 0,
                entry_role         TEXT DEFAULT '',
                exit_role          TEXT DEFAULT '',
                settling_asset     TEXT DEFAULT ''
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS sync_logs (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                sync_time        TEXT,
                trades_processed INTEGER
            )
        """)

        # Non-destructive migration for pre-existing databases
        for col, col_type in _MIGRATION_COLUMNS:
            try:
                conn.execute(f"ALTER TABLE trades ADD COLUMN {col} {col_type}")
            except sqlite3.OperationalError:
                pass  # Column already exists — safe to ignore

        conn.commit()


def save_trades(trades: List[Trade]) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        for t in trades:
            trade_id = f"{t.entry_order_id}_{t.exit_order_id}_{t.size}"
            conn.execute(
                """
                INSERT OR REPLACE INTO trades (
                    id, symbol, direction,
                    entry_time, exit_time,
                    entry_price, exit_price, size,
                    gross_pnl, net_pnl, total_commission,
                    gst_in_commission, net_fee_excl_gst,
                    income_tax, profit_after_tax,
                    entry_notional, exit_notional,
                    entry_role, exit_role, settling_asset
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    trade_id, t.symbol, t.direction,
                    t.entry_time.isoformat(),
                    t.exit_time.isoformat() if t.exit_time else None,
                    t.entry_price, t.exit_price, t.size,
                    t.gross_pnl, t.net_pnl, t.total_commission,
                    t.gst_in_commission, t.net_fee_excl_gst,
                    t.income_tax, t.profit_after_tax,
                    t.entry_notional, t.exit_notional,
                    t.entry_role, t.exit_role, t.settling_asset,
                ),
            )

        conn.execute(
            "INSERT INTO sync_logs (sync_time, trades_processed) VALUES (?, ?)",
            (datetime.now(tz=timezone.utc).isoformat(), len(trades)),
        )
        conn.commit()


def clear_db() -> None:
    """Purge all trade history and sync logs (used by --reset flag)."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM trades")
        conn.execute("DELETE FROM sync_logs")
        conn.commit()
