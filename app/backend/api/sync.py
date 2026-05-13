from datetime import datetime, timezone
from typing import Dict, Any, Literal
from pydantic import BaseModel
from sqlmodel import Session, select, text
from api.models import Trade, Fill, TradeEvent, APIFill
from api.client import fetch_fills
from api.config import config

class SyncState(BaseModel):
    status: Literal["idle", "running", "success", "failed"] = "idle"
    last_sync_at: datetime | None = None
    last_success_at: datetime | None = None
    last_error: str | None = None
    new_fills_synced: int = 0

SYNC_STATE = SyncState()

def reconstruct_trades_from_db(session: Session):
    """Event-driven Trade Reconstruction Engine using Notional Values."""
    session.exec(text("DELETE FROM trade_events"))
    session.exec(text("DELETE FROM trades"))
    session.commit()

    fills = session.exec(select(Fill).order_by(Fill.timestamp.asc())).all()
    open_positions: Dict[str, Dict[str, Any]] = {}

    for fill in fills:
        symbol = fill.symbol
        pos = open_positions.get(symbol)

        if not pos:
            # 1. NEW TRADE
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
            session.add(new_trade)
            session.flush()

            fill.trade_id = new_trade.id
            session.add(TradeEvent(
                trade_id=new_trade.id,
                event_type="ENTRY",
                timestamp=fill.timestamp,
                price=fill.price,
                size=fill.size,
                notional=fill.notional
            ))

            open_positions[symbol] = {
                'trade': new_trade,
                'current_size': fill.size,
                'current_notional': fill.notional,
                'realized_gross_pnl': 0.0
            }
        else:
            # 2. EXISTING TRADE
            trade: Trade = pos['trade']
            current_size = pos['current_size']
            current_notional = pos['current_notional']

            # Check if this fill is on the same side or opposite side
            fill_direction = "long" if fill.side == "buy" else "short"
            trade.fees += fill.fee

            if fill_direction == trade.direction:
                # SCALE IN
                new_size = current_size + fill.size
                new_notional = current_notional + fill.notional
                
                trade.avg_entry = ((trade.avg_entry * current_size) + (fill.price * fill.size)) / new_size
                trade.entry_notional += fill.notional
                trade.size = max(trade.size, new_size)
                
                pos['current_size'] = new_size
                pos['current_notional'] = new_notional
                
                session.add(TradeEvent(
                    trade_id=trade.id,
                    event_type="SCALE_IN",
                    timestamp=fill.timestamp,
                    price=fill.price,
                    size=fill.size,
                    notional=fill.notional
                ))
            else:
                # EXIT (Partial or Full)
                avg_entry_notional_per_unit = current_notional / current_size
                
                if trade.direction == "long":
                    chunk_gross_pnl = fill.notional - (avg_entry_notional_per_unit * fill.size)
                else:
                    chunk_gross_pnl = (avg_entry_notional_per_unit * fill.size) - fill.notional
                
                pos['realized_gross_pnl'] += chunk_gross_pnl
                trade.exit_notional += fill.notional
                
                new_size = current_size - fill.size
                pos['current_notional'] = avg_entry_notional_per_unit * new_size
                pos['current_size'] = new_size
                
                total_closed_so_far = trade.size - current_size
                new_total_closed = total_closed_so_far + fill.size
                if new_total_closed > 0:
                    trade.avg_exit = ((trade.avg_exit * total_closed_so_far) + (fill.price * fill.size)) / new_total_closed
                
                if new_size <= 0.000001:
                    trade.is_open = False
                    trade.exit_time = fill.timestamp
                    trade.gross_profit = pos['realized_gross_pnl']
                    trade.gst = trade.fees * (18 / 118)
                    trade.net_fee = trade.fees - trade.gst
                    trade.net_profit = trade.gross_profit - trade.fees
                    
                    if trade.net_profit > 0:
                        trade.after_tax_profit = trade.net_profit * (1 - config.INCOME_TAX_SLAB)
                        trade.result = "WIN"
                        trade.is_winner = True
                    else:
                        trade.after_tax_profit = trade.net_profit
                        trade.result = "LOSS" if trade.net_profit < 0 else "BREAKEVEN"
                        trade.is_winner = False
                    
                    trade.holding_minutes = (trade.exit_time - trade.entry_time).total_seconds() / 60
                    del open_positions[symbol]
                    event_type = "FULL_EXIT"
                else:
                    event_type = "PARTIAL_EXIT"
                
                session.add(TradeEvent(
                    trade_id=trade.id,
                    event_type=event_type,
                    timestamp=fill.timestamp,
                    price=fill.price,
                    size=fill.size,
                    notional=fill.notional
                ))
    
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
