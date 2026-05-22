from datetime import datetime, timezone
from typing import Dict, Any, Literal
from pydantic import BaseModel
from sqlmodel import Session, select, text
from api.models import Trade, Fill, TradeEvent, APIFill, Transaction
from api.client import fetch_fills, fetch_transactions
from api.config import config

class SyncState(BaseModel):
    status: Literal["idle", "running", "success", "failed"] = "idle"
    last_sync_at: datetime | None = None
    last_success_at: datetime | None = None
    last_error: str | None = None
    new_fills_synced: int = 0

SYNC_STATE = SyncState()

import threading

# Global lock to prevent race conditions between manual saves and background syncs
DB_LOCK = threading.Lock()

def reconstruct_trades_from_db(session: Session):
    """
    Non-destructive Trade Reconstruction.
    Calculates trades in memory and merges them into the database.
    """
    with DB_LOCK:
        # 1. Fetch all fills and existing trades
        fills = session.exec(select(Fill).order_by(Fill.timestamp.asc())).all()
        existing_trades = {
            f"{t.symbol}_{int(t.entry_time.timestamp())}": t 
            for t in session.exec(select(Trade)).all()
        }
        
        open_positions: Dict[str, Dict[str, Any]] = {}
        processed_trades = []

        for fill in fills:
            symbol = fill.symbol
            pos = open_positions.get(symbol)

            if not pos:
                # NEW TRADE
                direction = "long" if fill.side == "buy" else "short"
                new_trade = Trade(
                    symbol=symbol,
                    direction=direction,
                    entry_time=fill.timestamp,
                    avg_entry=fill.price,
                    size=fill.size,
                    entry_notional=fill.notional,
                    fees=fill.fee,
                    is_open=True
                )
                
                open_positions[symbol] = {
                    'trade': new_trade,
                    'current_size': fill.size,
                    'current_notional': fill.notional,
                    'realized_gross_pnl': 0.0,
                    'fills': [fill]
                }
            else:
                # EXISTING TRADE
                trade: Trade = pos['trade']
                current_size = pos['current_size']
                current_notional = pos['current_notional']
                fill_direction = "long" if fill.side == "buy" else "short"
                
                trade.fees += fill.fee
                pos['fills'].append(fill)

                if fill_direction == trade.direction:
                    # SCALE IN
                    new_size = current_size + fill.size
                    trade.avg_entry = ((trade.avg_entry * current_size) + (fill.price * fill.size)) / new_size
                    trade.entry_notional += fill.notional
                    trade.size = max(trade.size, new_size)
                    pos['current_size'] = new_size
                    pos['current_notional'] += fill.notional
                else:
                    # EXIT
                    avg_entry_notional_per_unit = current_notional / current_size
                    chunk_gross_pnl = (fill.notional - (avg_entry_notional_per_unit * fill.size)) if trade.direction == "long" else \
                                    ((avg_entry_notional_per_unit * fill.size) - fill.notional)
                    
                    pos['realized_gross_pnl'] += chunk_gross_pnl
                    trade.exit_notional += fill.notional
                    
                    new_size = current_size - fill.size
                    pos['current_notional'] = avg_entry_notional_per_unit * new_size
                    pos['current_size'] = new_size
                    
                    total_closed = trade.size - current_size + fill.size
                    if total_closed > 0:
                        trade.avg_exit = ((trade.avg_exit * (total_closed - fill.size)) + (fill.price * fill.size)) / total_closed
                    
                    if new_size <= 0.000001:
                        trade.is_open = False
                        trade.exit_time = fill.timestamp
                        trade.gross_profit = pos['realized_gross_pnl']
                        trade.net_profit = trade.gross_profit - trade.fees
                        trade.is_winner = trade.net_profit > 0
                        trade.result = "WIN" if trade.is_winner else ("LOSS" if trade.net_profit < 0 else "BREAKEVEN")
                        trade.holding_minutes = (trade.exit_time - trade.entry_time).total_seconds() / 60
                        
                        processed_trades.append((trade, pos['fills']))
                        del open_positions[symbol]

        # Add remaining open positions to processed
        for pos in open_positions.values():
            processed_trades.append((pos['trade'], pos['fills']))

        # 2. MERGE into Database
        updated_count = 0
        new_count = 0
        for calc_trade, trade_fills in processed_trades:
            ts = int(calc_trade.entry_time.timestamp())
            key = f"{calc_trade.symbol}_{ts}"
            db_trade = existing_trades.get(key)
            
            if db_trade:
                # Update only financial fields, PRESERVE metadata
                db_trade.exit_time = calc_trade.exit_time
                db_trade.avg_entry = calc_trade.avg_entry
                db_trade.avg_exit = calc_trade.avg_exit
                db_trade.size = calc_trade.size
                db_trade.gross_profit = calc_trade.gross_profit
                db_trade.fees = calc_trade.fees
                db_trade.net_profit = calc_trade.net_profit
                db_trade.is_winner = calc_trade.is_winner
                db_trade.result = calc_trade.result
                db_trade.is_open = calc_trade.is_open
                db_trade.holding_minutes = calc_trade.holding_minutes
                session.add(db_trade)
                target_trade = db_trade
                updated_count += 1
            else:
                # New trade
                session.add(calc_trade)
                session.flush()
                target_trade = calc_trade
                new_count += 1
            
            # Update fills to point to this trade
            for f in trade_fills:
                f.trade_id = target_trade.id
                session.add(f)

        print(f"DEBUG: Sync complete. Updated {updated_count} existing trades, Inserted {new_count} new trades.")
        session.commit()

def run_sync(session: Session):
    SYNC_STATE.status = "running"
    SYNC_STATE.last_sync_at = datetime.now(timezone.utc)
    SYNC_STATE.last_error = None
    try:
        raw_fills = fetch_fills()
        api_fills = [APIFill(**f) for f in raw_fills]
        
        new_fills_count = 0
        for af in api_fills:
            existing = session.exec(select(Fill).where(Fill.exchange_fill_id == af.id)).first()
            if not existing:
                fill = Fill(
                    exchange_fill_id=af.id,
                    symbol=af.symbol,
                    side=af.side,
                    price=af.price,
                    size=af.size,
                    fee=af.commission,
                    notional=af.notional,
                    timestamp=af.timestamp,
                    order_id=af.order_id
                )
                session.add(fill)
                new_fills_count += 1
                
        session.commit()
        
        # 2. Fetch Wallet Transactions (Funding, Fees, etc)
        try:
            raw_txs = fetch_transactions()
            new_tx_count = 0
            for rt in raw_txs:
                tx_id = str(rt.get("uuid") or rt.get("id") or "")
                if not tx_id:
                    continue
                existing = session.exec(select(Transaction).where(Transaction.exchange_transaction_id == tx_id)).first()
                if not existing:
                    # Delta returns ISO strings
                    ts_str = rt.get("created_at")
                    if isinstance(ts_str, str):
                        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    else:
                        ts = datetime.now(timezone.utc)
                    
                    import json
                    tx = Transaction(
                        exchange_transaction_id=tx_id,
                        asset_id=int(rt.get("asset_id", 0)),
                        asset_symbol=rt.get("asset_symbol", "USD"),
                        amount=float(rt.get("amount", 0)),
                        type=rt.get("transaction_type") or rt.get("type") or "unknown",
                        timestamp=ts,
                        method=rt.get("method", ""),
                        meta_data=json.dumps(rt.get("meta_data", {}))
                    )
                    session.add(tx)
                    new_tx_count += 1
            session.commit()
            print(f"DEBUG: Synced {new_tx_count} new wallet transactions.")
        except Exception as tx_err:
            print(f"WARNING: Wallet transaction sync failed: {tx_err}")

        reconstruct_trades_from_db(session)
        
        # Check for large P&L trades to trigger webhooks
        if config.WEBHOOK_URL and new_fills_count > 0:
            import requests
            newly_closed_trades = session.exec(
                select(Trade).where(Trade.is_open == False).order_by(Trade.exit_time.desc())
            ).all()
            
            for t in newly_closed_trades[:new_fills_count]:
                if abs(t.net_profit) >= config.PNL_ALERT_THRESHOLD:
                    try:
                        msg = f"🚀 Large P&L Detected! {t.symbol} {t.direction.upper()}: ${t.net_profit:.2f}"
                        requests.post(config.WEBHOOK_URL, json={"text": msg}, timeout=5)
                    except Exception as e:
                        print(f"Webhook failed: {e}")

        SYNC_STATE.status = "success"
        SYNC_STATE.last_success_at = datetime.now(timezone.utc)
        SYNC_STATE.new_fills_synced = new_fills_count
        return new_fills_count
    except Exception as e:
        SYNC_STATE.status = "failed"
        SYNC_STATE.last_error = f"Sync failed: {str(e)}"
        session.rollback()
        raise
