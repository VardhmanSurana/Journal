"""
Delta Exchange WebSocket client for real-time data.
Subscribes to: positions, margins, user_trades (private), ticker (public).
Stores latest data in thread-safe dicts for REST endpoints to serve.
Eliminates need for frequent REST polling.
"""
import asyncio
import json
import time
import hashlib
import hmac
import threading
from typing import Any, Dict, List, Optional

from api.config import config

ws_data: Dict[str, Any] = {
    "positions": [],
    "margins": {},
    "user_trades": [],
    "tickers": {},
    "connected": False,
    "products": [],
    "last_update": None,
}
ws_lock = threading.Lock()

_WS_URL = "wss://ws.india.delta.exchange/v2"

_COMMON_SYMBOLS = ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "ADAUSD", "DOGEUSD", "AVAXUSD", "MATICUSD", "DOTUSD", "LINKUSD"]


def _sign(timestamp: str) -> str:
    message = timestamp
    return hmac.new(
        config.READ_ONLY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()


def get_data(key: str) -> Any:
    with ws_lock:
        return ws_data.get(key)


def is_connected() -> bool:
    with ws_lock:
        return ws_data.get("connected", False)


def get_positions() -> List[Dict]:
    return get_data("positions") or []


def get_tickers() -> Dict[str, Any]:
    return get_data("tickers") or {}


def get_margins() -> Dict:
    return get_data("margins") or {}


def get_products() -> List[Dict]:
    return get_data("products") or []


def _handle_message(data: Dict[str, Any]) -> None:
    channel = data.get("channel", "")
    msg_type = data.get("type", "")
    msg_data = data.get("data", [])

    with ws_lock:
        ws_data["last_update"] = time.time()

        if channel == "positions":
            if isinstance(msg_data, list):
                ws_data["positions"] = msg_data
            else:
                ws_data["positions"] = [msg_data]

        elif channel == "margins":
            if isinstance(msg_data, dict):
                ws_data["margins"] = msg_data

        elif channel == "user_trades":
            trades = msg_data if isinstance(msg_data, list) else [msg_data]
            ws_data["user_trades"].extend(trades)
            ws_data["user_trades"] = ws_data["user_trades"][-2000:]

        elif channel == "ticker":
            symbol = data.get("symbol", "")
            if isinstance(msg_data, dict):
                ws_data["tickers"][symbol] = msg_data

        elif channel == "product_updates":
            products = msg_data if isinstance(msg_data, list) else [msg_data]
            for p in products:
                sym = p.get("symbol", "")
                if sym:
                    existing = {x.get("symbol"): i for i, x in enumerate(ws_data["products"])}
                    if sym in existing:
                        ws_data["products"][existing[sym]] = p
                    else:
                        ws_data["products"].append(p)


async def connect() -> None:
    while True:
        try:
            async with asyncio.timeout(30):
                async with await __connect_ws() as ws:
                    with ws_lock:
                        ws_data["connected"] = True
                    print("WebSocket connected to Delta Exchange")

                    await __authenticate(ws)
                    await __subscribe(ws)

                    async for message in ws:
                        try:
                            data = json.loads(message)
                            _handle_message(data)
                        except json.JSONDecodeError:
                            continue

        except (asyncio.TimeoutError, Exception) as e:
            with ws_lock:
                ws_data["connected"] = False
            print(f"WebSocket disconnected: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)


async def __connect_ws():
    import websockets
    return websockets.connect(
        _WS_URL,
        ping_interval=30,
        ping_timeout=10,
        close_timeout=5,
    )


async def __authenticate(ws) -> None:
    timestamp = str(int(time.time()))
    signature = _sign(timestamp)
    auth_msg = {
        "type": "auth",
        "payload": {
            "api-key": config.READ_ONLY_KEY,
            "signature": signature,
            "timestamp": timestamp,
        },
    }
    await ws.send(json.dumps(auth_msg))
    resp = await asyncio.wait_for(ws.recv(), timeout=10)
    resp_data = json.loads(resp)
    if resp_data.get("type") == "error":
        print(f"WebSocket auth error: {resp_data}")


async def __subscribe(ws) -> None:
    private_channels = [
        {"name": "positions", "symbols": []},
        {"name": "margins", "symbols": []},
        {"name": "user_trades", "symbols": []},
    ]
    for channel in private_channels:
        await ws.send(json.dumps({
            "type": "subscribe",
            "payload": {"channels": [channel]},
        }))
        resp = await asyncio.wait_for(ws.recv(), timeout=5)

    await ws.send(json.dumps({
        "type": "subscribe",
        "payload": {
            "channels": [{"name": "ticker", "symbols": _COMMON_SYMBOLS}],
        },
    }))
    resp = await asyncio.wait_for(ws.recv(), timeout=5)

    await ws.send(json.dumps({
        "type": "subscribe",
        "payload": {
            "channels": [{"name": "product_updates", "symbols": []}],
        },
    }))
    resp = await asyncio.wait_for(ws.recv(), timeout=5)
