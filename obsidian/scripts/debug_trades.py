from src.client import fetch_fills
from src.models import match_trades, Fill
raw_fills = fetch_fills()
fills = [Fill.from_api(f) for f in raw_fills]
trades = match_trades(fills)
for t in trades:
    print(t.note_filename, t.symbol, t.entry_order_id, t.exit_order_id, t.entry_time)
