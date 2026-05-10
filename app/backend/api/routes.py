from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, text
from typing import List, Dict, Any, Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from api.database import get_session
from api.models import Trade, Fill, TradeEvent, DashboardSummary, APIFill, DailyReview, PriceAlert
from api.client import fetch_fills, fetch_wallet_balance, fetch_positions, fetch_tickers, fetch_news, fetch_rss_news
from api.config import config

router = APIRouter()


class TradeUpdateRequest(BaseModel):
    strategy: str | None = None
    emotion: str | None = None
    notes: str | None = None
    mistakes: str | None = None
    session: str | None = None
    discipline_score: int | None = Field(default=None, ge=0, le=10)
    confidence_score: int | None = Field(default=None, ge=0, le=10)
    pre_plan: str | None = None
    risk_pct: float | None = Field(default=None, ge=0)
    stop_loss: float | None = Field(default=None, ge=0)
    take_profit: float | None = Field(default=None, ge=0)


class SyncState(BaseModel):
    status: Literal["idle", "running", "success", "failed"] = "idle"
    last_sync_at: datetime | None = None
    last_success_at: datetime | None = None
    last_error: str | None = None
    new_fills_synced: int = 0


SYNC_STATE = SyncState()
OPS_EVENTS: list[dict[str, Any]] = []


def _emit_ops_event(event_type: str, severity: Literal["info", "warning", "critical"], message: str) -> None:
    OPS_EVENTS.insert(0, {
        "type": event_type,
        "severity": severity,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    del OPS_EVENTS[200:]


class DailyReviewRequest(BaseModel):
    date_str: str
    mood: str | None = None
    discipline_score: int | None = Field(default=None, ge=0, le=10)
    mistakes: str | None = None
    lessons: str | None = None


class PriceAlertRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=32)
    target_price: float = Field(gt=0)
    condition: Literal["ABOVE", "BELOW"]

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
    except Exception:
        SYNC_STATE.status = "failed"
        SYNC_STATE.last_error = "Sync failed due to upstream API or parsing error."
        _emit_ops_event("sync_failed", "critical", SYNC_STATE.last_error)
        raise
    
    # Check for large P&L trades to trigger webhooks
    if config.WEBHOOK_URL:
        import requests
        newly_closed_trades = session.exec(
            select(Trade).where(Trade.is_open == False).order_by(Trade.exit_time.desc())
        ).all()
        
        for t in newly_closed_trades[:new_fills_count]: # Rough check for new ones
            if abs(t.net_profit) >= config.PNL_ALERT_THRESHOLD:
                try:
                    msg = f"🚀 Large P&L Detected! {t.symbol} {t.direction.upper()}: ${t.net_profit:.2f}"
                    requests.post(config.WEBHOOK_URL, json={"text": msg}, timeout=5)
                except Exception as e:
                    print(f"Webhook failed: {e}")

    SYNC_STATE.status = "success"
    SYNC_STATE.last_success_at = datetime.now(timezone.utc)
    SYNC_STATE.new_fills_synced = new_fills_count
    _emit_ops_event("sync_success", "info", f"Sync completed with {new_fills_count} new fills.")
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


@router.get("/positions")
def get_positions():
    """Get current open positions with unrealized P&L."""
    from api.client import fetch_positions, fetch_tickers
    
    # Try common underlying assets
    common_assets = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "MATIC", "AVAX"]
    all_positions = []
    
    for asset in common_assets:
        try:
            positions = fetch_positions(asset)
            if positions:
                all_positions.extend(positions)
        except Exception:
            continue
    
    # Get tickers for all symbols
    try:
        tickers = {t.get("symbol"): t for t in fetch_tickers(",".join(common_assets))}
    except Exception:
        tickers = {}
    
    result = []
    for pos in all_positions:
        symbol = pos.get("product_symbol", "")
        ticker = tickers.get(symbol, {})
        
        result.append({
            "symbol": symbol,
            "size": pos.get("size", 0),
            "entry_price": pos.get("entry_price", 0),
            "mark_price": ticker.get("mark_price", pos.get("mark_price", 0)),
            "unrealized_pnl": pos.get("unrealized_pnl", 0),
            "margin_used": pos.get("margin_used", 0),
            "leverage": pos.get("leverage", 0),
            "side": pos.get("side", ""),
            "liq_price": pos.get("liq_price", 0),
        })
    
    return result


@router.get("/risk")
def get_risk_metrics(session: Session = Depends(get_session)):
    """Get comprehensive risk metrics."""
    trades = session.exec(select(Trade).where(Trade.is_open == False).order_by(Trade.exit_time.asc())).all()
    positions_data = fetch_positions()
    wallet_data = fetch_wallet_balance()
    tickers = fetch_tickers()
    
    if not trades:
        return {
            "sharpe_ratio": 0,
            "sortino_ratio": 0,
            "calmar_ratio": 0,
            "win_loss_streak": 0,
            "max_consecutive_wins": 0,
            "max_consecutive_losses": 0,
            "win_loss_distribution": [],
            "portfolio_exposure": [],
            "margin_utilization": 0,
            "total_equity": 0,
        }
    
    # Calculate equity for risk-free rate (assume 5% annual)
    returns = [t.net_profit for t in trades]
    avg_return = sum(returns) / len(returns) if returns else 0
    std_dev = (sum((r - avg_return) ** 2 for r in returns) / len(returns)) ** 0.5 if returns else 1
    
    # Sharpe Ratio (annualized, 252 trading days)
    risk_free_rate = 0.05 / 252
    sharpe_ratio = ((avg_return - risk_free_rate) / std_dev * (252 ** 0.5)) if std_dev > 0 else 0
    
    # Sortino Ratio (downside deviation only)
    negative_returns = [r for r in returns if r < 0]
    downside_dev = (sum(r ** 2 for r in negative_returns) / len(returns)) ** 0.5 if negative_returns else 1
    sortino_ratio = ((avg_return - risk_free_rate) / downside_dev * (252 ** 0.5)) if downside_dev > 0 else 0
    
    # Calmar Ratio (max drawdown / annual return)
    cumulative = 0
    peak = 0
    max_dd = 0
    for r in returns:
        cumulative += r
        if cumulative > peak:
            peak = cumulative
        dd = peak - cumulative
        if dd > max_dd:
            max_dd = dd
    
    annual_return = avg_return * 252
    calmar_ratio = annual_return / max_dd if max_dd > 0 else 0
    
    # Win/Loss Streaks
    max_wins = 0
    max_losses = 0
    current_wins = 0
    current_losses = 0
    for t in trades:
        if t.is_winner:
            current_wins += 1
            current_losses = 0
            if current_wins > max_wins:
                max_wins = current_wins
        else:
            current_losses += 1
            current_wins = 0
            if current_losses > max_losses:
                max_losses = current_losses
    
    # Win/Loss Distribution (histogram buckets)
    buckets = [
        {"range": "<-$500", "count": 0},
        {"range": "-$500 to -$100", "count": 0},
        {"range": "-$100 to $0", "count": 0},
        {"range": "$0 to $100", "count": 0},
        {"range": "$100 to $500", "count": 0},
        {"range": ">$500", "count": 0},
    ]
    for t in trades:
        pnl = t.net_profit
        if pnl < -500:
            buckets[0]["count"] += 1
        elif pnl < -100:
            buckets[1]["count"] += 1
        elif pnl < 0:
            buckets[2]["count"] += 1
        elif pnl < 100:
            buckets[3]["count"] += 1
        elif pnl < 500:
            buckets[4]["count"] += 1
        else:
            buckets[5]["count"] += 1
    
    # Portfolio exposure by symbol
    exposure = {}
    for pos in positions_data:
        symbol = pos.get("product_symbol", "UNKNOWN")
        size = abs(pos.get("size", 0))
        notional = pos.get("notional", 0)
        exposure[symbol] = exposure.get(symbol, 0) + notional
    
    # Margin utilization
    total_equity = sum(float(w.get("balance", 0)) for w in wallet_data)
    total_margin = sum(float(p.get("margin_used", 0)) for p in positions_data)
    margin_util = (total_margin / total_equity * 100) if total_equity > 0 else 0
    
    return {
        "sharpe_ratio": round(sharpe_ratio, 2),
        "sortino_ratio": round(sortino_ratio, 2),
        "calmar_ratio": round(calmar_ratio, 2),
        "max_drawdown": round(max_dd, 2),
        "annual_return_pct": round(annual_return / total_equity * 100 if total_equity else 0, 2),
        "win_loss_streak": current_wins if current_wins > current_losses else -current_losses,
        "max_consecutive_wins": max_wins,
        "max_consecutive_losses": max_losses,
        "win_loss_distribution": buckets,
        "portfolio_exposure": [{"symbol": k, "notional": round(v, 2)} for k, v in exposure.items()],
        "margin_utilization": round(margin_util, 2),
        "total_equity": round(total_equity, 2),
    }


@router.get("/tax/export")
def export_tax_report(session: Session = Depends(get_session)):
    """Export tax report as CSV for CA/audit."""
    import csv
    import io
    
    trades = session.exec(select(Trade).where(Trade.is_open == False).order_by(Trade.exit_time.asc())).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Symbol", "Entry Date", "Exit Date", "Direction", "Size",
        "Entry Price", "Exit Price", "Gross P&L", "Fees", "GST",
        "Net P&L", "Income Tax", "After Tax P&L", "Holding Days",
        "Strategy", "Result"
    ])
    
    total_turnover = 0
    total_gross_pnl = 0
    total_tax = 0
    
    for t in trades:
        entry_date = t.entry_time.strftime("%Y-%m-%d") if t.entry_time else ""
        exit_date = t.exit_time.strftime("%Y-%m-%d") if t.exit_time else ""
        holding_days = round((t.exit_time - t.entry_time).total_seconds() / 86400, 1) if t.exit_time and t.entry_time else 0
        
        turnover = abs(t.gross_profit) if t.gross_profit else 0
        total_turnover += turnover
        total_gross_pnl += t.gross_profit or 0
        total_tax += t.after_tax_profit - t.net_profit if t.after_tax_profit else 0
        
        writer.writerow([
            t.symbol, entry_date, exit_date, t.direction, t.size,
            round(t.avg_entry, 4), round(t.avg_exit, 4),
            round(t.gross_profit or 0, 2), round(t.fees or 0, 2), round(t.gst or 0, 2),
            round(t.net_profit or 0, 2), round((t.after_tax_profit - t.net_profit), 2) if t.after_tax_profit else 0,
            round(t.after_tax_profit or 0, 2), holding_days,
            t.strategy or "", t.result or ""
        ])
    
    # Summary rows
    writer.writerow([])
    writer.writerow(["SUMMARY"])
    writer.writerow(["Total Trades", len(trades)])
    writer.writerow(["Total Turnover (for Audit)", round(total_turnover, 2)])
    writer.writerow(["Gross P&L", round(total_gross_pnl, 2)])
    writer.writerow(["Total Estimated Tax", round(total_tax, 2)])
    
    csv_content = output.getvalue()
    return {"csv": csv_content, "filename": f"tax_report_{datetime.now().strftime('%Y%m%d')}.csv"}


@router.get("/tax/summary")
def get_tax_summary(session: Session = Depends(get_session)):
    """Get annual tax summary for compliance."""
    trades = session.exec(select(Trade).where(Trade.is_open == False).order_by(Trade.exit_time.asc())).all()
    
    # Group by year
    by_year = {}
    for t in trades:
        if t.exit_time:
            year = t.exit_time.year
            if year not in by_year:
                by_year[year] = {"trades": 0, "turnover": 0, "gross_pnl": 0, "fees": 0, "tax": 0, "after_tax": 0, "net_profit": 0}
            
            by_year[year]["trades"] += 1
            by_year[year]["turnover"] += abs(t.gross_profit) if t.gross_profit else 0
            by_year[year]["gross_pnl"] += t.gross_profit or 0
            by_year[year]["fees"] += t.fees or 0
            by_year[year]["net_profit"] += t.net_profit or 0
            tax = (t.after_tax_profit - t.net_profit) if t.after_tax_profit else 0
            by_year[year]["tax"] += tax
            by_year[year]["after_tax"] += t.after_tax_profit or 0
    
    # Check for audit threshold (₹10Cr = 10,00,00,000 INR)
    audit_threshold = 10000000  # 10Cr INR in USD (approx)
    
    result = []
    accumulated_loss = 0
    for year in sorted(by_year.keys()):
        data = by_year[year]
        
        # Loss carry-forward logic:
        # Current year taxable profit can be reduced by accumulated losses from previous 4 years
        taxable_pnl = max(0, data["net_profit"] - accumulated_loss)
        
        # Update accumulated loss for next year
        if data["net_profit"] < 0:
            accumulated_loss += abs(data["net_profit"])
        else:
            accumulated_loss = max(0, accumulated_loss - data["net_profit"])

        result.append({
            "year": year,
            "trades": data["trades"],
            "turnover": round(data["turnover"], 2),
            "gross_pnl": round(data["gross_pnl"], 2),
            "total_fees": round(data["fees"], 2),
            "estimated_tax": round(data["tax"], 2),
            "profit_after_tax": round(data["after_tax"], 2),
            "audit_required": data["turnover"] >= audit_threshold,
            "losses_carried_forward": round(accumulated_loss, 2)
        })
    
    return result


@router.put("/trades/{trade_id}")
def update_trade(trade_id: int, updates: TradeUpdateRequest, session: Session = Depends(get_session)):
    """Update trade with journal details (strategy, emotion, notes, etc)."""
    trade = session.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    updates_dict = updates.model_dump(exclude_unset=True)
    for field_name, field_value in updates_dict.items():
        setattr(trade, field_name, field_value)
    
    # Calculate actual risk % if stop loss is set
    if trade.stop_loss and trade.avg_entry and trade.size:
        try:
            risk_per_unit = abs(trade.avg_entry - trade.stop_loss)
            total_risk_amount = risk_per_unit * trade.size
            
            # Fetch total equity for % calculation
            wallet = fetch_wallet_balance()
            total_equity = sum(float(w.get("balance", 0)) for w in wallet)
            
            if total_equity > 0:
                trade.actual_risk_pct = round((total_risk_amount / total_equity) * 100, 2)
        except (TypeError, ValueError):
            trade.actual_risk_pct = 0.0

    session.add(trade)
    session.commit()
    session.refresh(trade)
    
    return {"status": "success", "trade_id": trade_id}


@router.get("/health/connection")
def get_connection_health():
    now = datetime.now(timezone.utc)
    last_success = SYNC_STATE.last_success_at
    stale_seconds = int((now - last_success).total_seconds()) if last_success else None
    is_stale = stale_seconds is None or stale_seconds > 120
    return {
        "api_status": "ok",
        "sync_status": SYNC_STATE.status,
        "last_sync_at": SYNC_STATE.last_sync_at,
        "last_success_at": SYNC_STATE.last_success_at,
        "new_fills_synced": SYNC_STATE.new_fills_synced,
        "last_error": SYNC_STATE.last_error,
        "is_stale": is_stale,
        "stale_after_seconds": 120,
        "stale_seconds": stale_seconds,
        "safety": {
            "api_key_configured": bool(config.API_KEY),
            "api_secret_configured": bool(config.API_SECRET),
            "webhook_configured": bool(config.WEBHOOK_URL),
            "deadman_switch_configured": str(
                __import__("os").getenv("DEADMAN_SWITCH_ENABLED", "false")
            ).lower() == "true",
        },
    }


@router.get("/health/checklist")
def get_security_checklist():
    checks = [
        {
            "key": "api_key_configured",
            "ok": bool(config.API_KEY),
            "message": "Delta API key configured",
            "severity": "critical",
        },
        {
            "key": "api_secret_configured",
            "ok": bool(config.API_SECRET),
            "message": "Delta API secret configured",
            "severity": "critical",
        },
        {
            "key": "webhook_configured",
            "ok": bool(config.WEBHOOK_URL),
            "message": "Webhook configured for risk alerts",
            "severity": "medium",
        },
        {
            "key": "deadman_switch_configured",
            "ok": str(__import__("os").getenv("DEADMAN_SWITCH_ENABLED", "false")).lower() == "true",
            "message": "Deadman switch is enabled",
            "severity": "high",
        },
    ]
    blocking_issues = [c for c in checks if c["severity"] == "critical" and not c["ok"]]
    return {
        "overall_status": "blocked" if blocking_issues else "ok",
        "blocking_issues": len(blocking_issues),
        "checks": checks,
        "generated_at": datetime.now(timezone.utc),
    }


@router.get("/alerts/ops")
def get_operational_alerts(limit: int = 50):
    safe_limit = max(1, min(limit, 200))
    return {"events": OPS_EVENTS[:safe_limit], "total": len(OPS_EVENTS)}


@router.get("/sync/reconcile")
def reconcile_sync(session: Session = Depends(get_session)):
    raw_fills = fetch_fills()
    api_fill_ids = {str(item.get("id")) for item in raw_fills if item.get("id")}
    db_fills = session.exec(select(Fill)).all()
    db_fill_ids = {fill.exchange_fill_id for fill in db_fills}

    missing_in_db = sorted(list(api_fill_ids - db_fill_ids))
    missing_in_api = sorted(list(db_fill_ids - api_fill_ids))
    duplicate_count = len(db_fill_ids) != len(db_fills)

    status: Literal["ok", "warning", "critical"] = "ok"
    if missing_in_db:
        status = "critical"
    elif missing_in_api or duplicate_count:
        status = "warning"

    result = {
        "status": status,
        "api_fill_count": len(api_fill_ids),
        "db_fill_count": len(db_fill_ids),
        "db_row_count": len(db_fills),
        "missing_in_db_count": len(missing_in_db),
        "missing_in_api_count": len(missing_in_api),
        "duplicate_rows_detected": duplicate_count,
        "missing_in_db_sample": missing_in_db[:25],
        "missing_in_api_sample": missing_in_api[:25],
        "generated_at": datetime.now(timezone.utc),
    }
    if status != "ok":
        _emit_ops_event("reconcile_warning", "warning" if status == "warning" else "critical", "Reconciliation detected fill discrepancies.")
    return result


# === Daily Reviews CRUD ===

@router.get("/reviews")
def get_daily_reviews(session: Session = Depends(get_session)):
    """Get all daily reviews."""
    reviews = session.exec(select(DailyReview).order_by(DailyReview.date_str.desc())).all()
    return [
        {
            "id": r.id,
            "date_str": r.date_str,
            "mood": r.mood,
            "discipline_score": r.discipline_score,
            "mistakes": r.mistakes,
            "lessons": r.lessons
        }
        for r in reviews
    ]


@router.post("/reviews")
def create_daily_review(review: DailyReviewRequest, session: Session = Depends(get_session)):
    """Create or update daily review."""
    existing = session.exec(
        select(DailyReview).where(DailyReview.date_str == review.date_str)
    ).first()
    
    if existing:
        payload = review.model_dump(exclude_unset=True)
        existing.mood = payload.get("mood", existing.mood)
        existing.discipline_score = payload.get("discipline_score", existing.discipline_score)
        existing.mistakes = payload.get("mistakes", existing.mistakes)
        existing.lessons = payload.get("lessons", existing.lessons)
        session.add(existing)
        session.commit()
        return {"status": "updated", "id": existing.id}
    else:
        new_review = DailyReview(
            date_str=review.date_str,
            mood=review.mood,
            discipline_score=review.discipline_score,
            mistakes=review.mistakes or "",
            lessons=review.lessons or ""
        )
        session.add(new_review)
        session.commit()
        return {"status": "created", "id": new_review.id}


@router.delete("/reviews/{review_id}")
def delete_daily_review(review_id: int, session: Session = Depends(get_session)):
    """Delete daily review."""
    review = session.get(DailyReview, review_id)
    if review:
        session.delete(review)
        session.commit()
    return {"status": "deleted"}


# === Alerts & Notifications ===

class AlertSettings(BaseModel):
    pnl_threshold: float = 100.0
    drawdown_threshold: float = 5.0
    sync_interval_minutes: int = 60


@router.get("/alerts/settings")
def get_alert_settings():
    """Get alert configuration."""
    return {
        "pnl_threshold": 100.0,
        "drawdown_threshold": 5.0,
        "sync_interval_minutes": 60,
        "last_alert_time": None
    }


@router.get("/alerts")
def get_alerts(session: Session = Depends(get_session)):
    return session.exec(select(PriceAlert).order_by(PriceAlert.created_at.desc())).all()

@router.post("/alerts")
def create_alert(alert: PriceAlertRequest, session: Session = Depends(get_session)):
    new_alert = PriceAlert(
        symbol=alert.symbol.upper(),
        target_price=alert.target_price,
        condition=alert.condition,
        is_active=True,
    )
    session.add(new_alert)
    session.commit()
    session.refresh(new_alert)
    return new_alert

@router.delete("/alerts/{alert_id}")
def delete_alert(alert_id: int, session: Session = Depends(get_session)):
    alert = session.get(PriceAlert, alert_id)
    if alert:
        session.delete(alert)
        session.commit()
    return {"status": "deleted"}

@router.post("/alerts/check")
def check_alerts(session: Session = Depends(get_session)):
    """Check if any alert thresholds are triggered."""
    trades = session.exec(select(Trade).where(Trade.is_open == False).order_by(Trade.exit_time.desc())).all()
    positions = fetch_positions()
    active_alerts = session.exec(select(PriceAlert).where(PriceAlert.is_active == True)).all()
    
    alerts_triggered = []
    
    # 1. Check Price Alerts (Live Tickers)
    if active_alerts:
        symbols = list(set([a.symbol for a in active_alerts]))
        try:
            tickers = {t.get("symbol"): t for t in fetch_tickers(",".join(symbols))}
            for alert in active_alerts:
                ticker = tickers.get(alert.symbol)
                if not ticker: continue
                
                mark_price = float(ticker.get("mark_price", 0))
                triggered = False
                if alert.condition == "ABOVE" and mark_price >= alert.target_price:
                    triggered = True
                elif alert.condition == "BELOW" and mark_price <= alert.target_price:
                    triggered = True
                
                if triggered:
                    alert.is_active = False
                    alert.triggered_at = datetime.now(timezone.utc)
                    session.add(alert)
                    
                    msg = f"🔔 ALERT: {alert.symbol} is {alert.condition} {alert.target_price}! Current: {mark_price}"
                    alerts_triggered.append({"type": "price_alert", "message": msg})
                    
                    if config.WEBHOOK_URL:
                        import requests
                        try:
                            requests.post(config.WEBHOOK_URL, json={"text": msg}, timeout=5)
                        except Exception:
                            pass
        except Exception as e:
            print(f"Price alert check failed: {e}")
    
    # 2. Check latest trade P&L
    if trades:
        latest = trades[0]
        if abs(latest.net_profit) >= config.PNL_ALERT_THRESHOLD:
            alerts_triggered.append({
                "type": "large_pnl",
                "message": f"Large {'profit' if latest.net_profit > 0 else 'loss'}: ${latest.net_profit:.2f}",
                "severity": "high" if abs(latest.net_profit) >= 500 else "medium"
            })
    
    # 3. Check open positions
    for pos in positions:
        pnl = pos.get("unrealized_pnl", 0)
        if abs(pnl) >= 200:
            alerts_triggered.append({
                "type": "position_pnl",
                "message": f"{pos.get('product_symbol')} unrealized P&L: ${pnl:.2f}",
                "severity": "high" if abs(pnl) >= 500 else "medium"
            })
    
    session.commit()
    return {"alerts": alerts_triggered, "checked_at": datetime.now().isoformat()}


# === Sync with background ===

@router.get("/news")
def get_market_news(categories: str = "BTC,ETH,Trading"):
    """Aggregate market news from CryptoCompare and direct RSS feeds."""
    import time
    
    # 1. Primary Source: CryptoCompare
    cc_news = fetch_news(categories)
    formatted_news = []
    
    for item in cc_news:
        formatted_news.append({
            "id": item.get("id"),
            "source": item.get("source_info", {}).get("name", "Unknown"),
            "title": item.get("title"),
            "url": item.get("url"),
            "time": item.get("published_on"),
            "body": item.get("body", "")[:200] + "...",
            "image": item.get("imageurl"),
            "type": "ARTICLE"
        })
        
    # 2. Secondary Source: RSS (Fallback/Extra)
    rss_news = fetch_rss_news()
    for item in rss_news:
        # Convert published_parsed to unix timestamp if possible
        ts = int(time.time())
        if item["published_on"]:
            ts = int(time.mktime(item["published_on"]))
            
        formatted_news.append({
            "id": item["id"],
            "source": item["source"],
            "title": item["title"],
            "url": item["url"],
            "time": ts,
            "body": item["body"],
            "image": item["imageurl"],
            "type": "RSS"
        })
        
    # Sort by time descending
    formatted_news.sort(key=lambda x: x["time"], reverse=True)
    
    return formatted_news[:25] # Return top 25 latest items
