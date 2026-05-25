import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

def parse_delta_copy_paste(raw_text: str) -> List[Dict[str, Any]]:
    """
    Parses a copy-pasted block of text from Delta Exchange's Order History table.
    Supports multi-line, space-separated, and single-line copy-pastes.
    Filters out cancelled/empty orders.
    
    Returns a list of dicts representing parsed fills:
    [
        {
            "timestamp": datetime,
            "symbol": str,
            "side": str,  # "buy" | "sell"
            "price": float,
            "size": float,
            "fee": float,
            "notional": float,
            "order_id": str,
            "exchange_id": str
        },
        ...
    ]
    """
    if not raw_text or not raw_text.strip():
        return []
        
    # Delta date format regex: e.g. "2026-05-14 23:3" or "2026-05-14 23:03"
    pattern = r"(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{1,2})"
    
    # Split text into chunks using matches as boundaries
    matches = list(re.finditer(pattern, raw_text))
    if not matches:
        return []
        
    records = []
    for i in range(len(matches)):
        start = matches[i].start()
        end = matches[i+1].start() if i + 1 < len(matches) else len(raw_text)
        chunk = raw_text[start:end].strip()
        records.append(chunk)
        
    parsed_orders = []
    for rec in records:
        tokens = rec.split()
        if len(tokens) < 10:
            continue
            
        # e.g., ["2026-05-14", "23:3", "ETHUSD", "2", "sell", "2.000000000000", "2301.8", "2187.05", "46.036", "0.02444512", "0", "0", "market_order", "closed", "1316974108"]
        date_str = tokens[0]
        time_str = tokens[1]
        
        # Parse time safely
        try:
            h, m = time_str.split(':')
            time_str_clean = f"{int(h):02d}:{int(m):02d}:00"
            dt_str = f"{date_str} {time_str_clean}"
            naive_dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
            # Assume IST timezone (+5:30) and convert to UTC
            dt_utc = naive_dt - timedelta(hours=5, minutes=30)
            dt_utc = dt_utc.replace(tzinfo=timezone.utc)
        except Exception:
            # Fallback to UTC now
            dt_utc = datetime.now(timezone.utc)
            
        symbol = tokens[2].upper()
        
        # Side is buy or sell
        side_idx = -1
        for idx, t in enumerate(tokens):
            if t.lower() in ["buy", "sell"]:
                side_idx = idx
                break
                
        if side_idx == -1:
            continue
            
        side = tokens[side_idx].lower()
        filled_qty_str = tokens[side_idx + 1]
        
        # Check if filled quantity is 0 or fraction like "0.000/3.000"
        try:
            if "/" in filled_qty_str:
                filled_qty = float(filled_qty_str.split('/')[0])
            else:
                filled_qty = float(filled_qty_str)
        except ValueError:
            continue
            
        if filled_qty <= 0:
            # Skip cancelled/empty orders
            continue
            
        try:
            price = float(tokens[side_idx + 2])
        except ValueError:
            continue
            
        # Parse fields from the end of the list
        # Order of columns at the end:
        # tokens[-1]: order_id (big integer)
        # tokens[-2]: state (closed/cancelled)
        # tokens[-3]: order_type (market_order/limit_order)
        # tokens[-4]: pnl (realized)
        # tokens[-5]: pnl (realized) (or some duplicate/alternate field)
        # tokens[-6]: fee / commission
        # tokens[-7]: notional value / value in USD
        
        try:
            order_id = tokens[-1]
            notional = abs(float(tokens[-7]))
            fee = float(tokens[-6])
        except (IndexError, ValueError):
            # Fallback calculation if columns are shifted or missing
            notional = abs(price * filled_qty)
            fee = 0.0
            order_id = f"cp_{int(dt_utc.timestamp())}"
            
        parsed_orders.append({
            "timestamp": dt_utc,
            "symbol": symbol,
            "side": side,
            "price": price,
            "size": filled_qty,
            "fee": fee,
            "notional": notional,
            "order_id": order_id,
            "exchange_id": f"copy_paste_{order_id}"
        })
        
    return parsed_orders
