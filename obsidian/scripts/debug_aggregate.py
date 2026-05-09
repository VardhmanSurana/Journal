from src.client import fetch_fills
from src.models import Fill

raw_fills = fetch_fills()
fills = [Fill.from_api(f) for f in raw_fills]

aggregated = {}
for f in fills:
    if f.order_id in aggregated:
        agg = aggregated[f.order_id]
        agg.size += f.size
        agg.commission += f.commission
        agg.notional += f.notional
        agg.price = agg.notional / agg.size  # Average weighted price
    else:
        aggregated[f.order_id] = f

print(f"Total aggregated fills: {len(aggregated)}")
for agg in aggregated.values():
    print(agg.order_id, agg.side, agg.size, agg.price)
