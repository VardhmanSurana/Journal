from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, text
from typing import List, Dict, Any
from api.database import get_session
from api.models import Trade, Fill, TradeEvent, DashboardSummary, APIFill
from api.client import fetch_fills, fetch_wallet_balance
from api.config import config

router = APIRouter()

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
            
            is_increase = (trade.direction == "long" and fill.side == "buy") or (trade.direction == "short" and fill.side == "sell")
            fill.trade_id = trade.id
            trade.fees += fill.fee
            
            if is_increase:
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
                # avg_notional_per_unit of the entry side
                avg_entry_notional_per_unit = current_notional / current_size
                
                # gross pnl for this specific exit chunk
                if trade.direction == "long":
                    chunk_gross_pnl = fill.notional - (avg_entry_notional_per_unit * fill.size)
                else:
                    chunk_gross_pnl = (avg_entry_notional_per_unit * fill.size) - fill.notional
                
                pos['realized_gross_pnl'] += chunk_gross_pnl
                trade.exit_notional += fill.notional
                
                new_size = current_size - fill.size
                # Proportionally reduce current notional for the remaining size
                pos['current_notional'] = avg_entry_notional_per_unit * new_size
                pos['current_size'] = new_size
                
                # Update avg exit price
                total_closed_so_far = trade.size - current_size
                new_total_closed = total_closed_so_far + fill.size
                if new_total_closed > 0:
                    trade.avg_exit = ((trade.avg_exit * total_closed_so_far) + (fill.price * fill.size)) / new_total_closed
                
                if new_size <= 0.000001:
                    # FULL EXIT
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

@router.post("/sync")
def sync_trades(session: Session = Depends(get_session)):
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
                notional=af.notional, # <--- Save Notional
                timestamp=af.timestamp,
                order_id=af.order_id
            )
            session.add(fill)
            new_fills_count += 1
            
    session.commit()
    reconstruct_trades_from_db(session)
    return {"status": "success", "new_fills_synced": new_fills_count}

@router.get("/trades")
def get_trades(session: Session = Depends(get_session)):
    # Return closed trades for the frontend
    return session.exec(select(Trade).where(Trade.is_open == False).order_by(Trade.exit_time.desc())).all()

@router.get("/summary", response_model=DashboardSummary)
def get_summary(session: Session = Depends(get_session)):
    trades = session.exec(select(Trade).where(Trade.is_open == False).order_by(Trade.exit_time.asc())).all()
    
    wallet_raw = fetch_wallet_balance()
    wallet_data = []
    for w in wallet_raw:
        balance = float(w.get("balance", 0))
        if balance > 0:
            wallet_data.append({
                "asset": w.get("asset_symbol"),
                "balance": balance,
                "available": float(w.get("available_balance", 0))
            })
            
    if not trades:
        return DashboardSummary(
            total_trades=0, winners=0, losers=0, win_rate=0,
            total_net_pnl=0, total_commission=0, total_profit_after_tax=0,
            best_trade=0, worst_trade=0, avg_win=0, avg_loss=0,
            profit_factor=0, expectancy=0, max_drawdown=0, total_turnover=0,
            cumulative_pnl=[], pnl_by_symbol=[], wallet=wallet_data
        )
    
    winners = [t for t in trades if t.is_winner]
    losers = [t for t in trades if not t.is_winner]
    net_pnls = [t.net_profit for t in trades]
    
    avg_win = sum(t.net_profit for t in winners) / len(winners) if winners else 0
    avg_loss = sum(t.net_profit for t in losers) / len(losers) if losers else 0
    
    gross_profit = sum(t.net_profit for t in winners)
    gross_loss = abs(sum(t.net_profit for t in losers))
    profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else float('inf')
    
    win_prob = len(winners) / len(trades)
    loss_prob = 1 - win_prob
    expectancy = (win_prob * avg_win) + (loss_prob * avg_loss)
    # Daily P&L and Cumulative P&L
    cumulative = 0
    peak = 0
    max_dd = 0
    cumulative_data = []
    daily_pnl_map = {}

    for t in trades:
        date_str = t.exit_time.strftime("%Y-%m-%d")
        daily_pnl_map[date_str] = daily_pnl_map.get(date_str, 0) + t.net_profit

        cumulative += t.net_profit
        cumulative_data.append({"date": date_str, "value": round(cumulative, 2)})
        if cumulative > peak:
            peak = cumulative
        dd = peak - cumulative
        if dd > max_dd:
            max_dd = dd

    daily_pnl_data = [{"date": k, "value": round(v, 2)} for k, v in daily_pnl_map.items()]


    symbol_map = {}
    for t in trades:
        symbol_map[t.symbol] = symbol_map.get(t.symbol, 0) + t.net_profit
    pnl_by_symbol = [{"symbol": k, "value": round(v, 2)} for k, v in symbol_map.items()]

    return DashboardSummary(
        total_trades=len(trades),
        winners=len(winners),
        losers=len(trades) - len(winners),
        win_rate=round(len(winners) / len(trades) * 100, 2),
        total_net_pnl=round(sum(net_pnls), 4),
        total_commission=round(sum(t.fees for t in trades), 4),
        total_profit_after_tax=round(sum(t.after_tax_profit for t in trades), 4),
        best_trade=max(net_pnls) if net_pnls else 0,
        worst_trade=min(net_pnls) if net_pnls else 0,
        avg_win=round(avg_win, 4),
        avg_loss=round(avg_loss, 4),
        profit_factor=profit_factor if profit_factor != float('inf') else 999,
        expectancy=round(expectancy, 4),
        max_drawdown=round(max_dd, 4),
        total_turnover=0, # Simplified for MVP
        cumulative_pnl=cumulative_data,
        daily_pnl=daily_pnl_data,
        pnl_by_symbol=pnl_by_symbol,
        wallet=wallet_data
    )
