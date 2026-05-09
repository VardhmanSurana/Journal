from src.client import fetch_fills
fills = fetch_fills()
for f in fills:
    if str(f.get('order_id')) in ["1298326953", "1298430894"]:
        print(f['id'], f['order_id'], f['side'], f['size'], f['price'])
