"""
Delta Exchange API client.
Handles authentication (HMAC-SHA256), pagination, and retry/backoff.
Fetches: fills, order history, wallet balances.
"""
import hashlib
import hmac
import time
from typing import Any, Generator

import requests

from api.config import config

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_RETRY_STATUSES = {429, 500, 502, 503, 504}
_MAX_RETRIES = 3
_BACKOFF_BASE = 1.0  # seconds; doubles each attempt: 1 → 2 → 4


# ---------------------------------------------------------------------------
# Custom exception — wraps HTTPError without echoing auth headers
# ---------------------------------------------------------------------------

class DeltaAPIError(Exception):
    """Raised when the Delta Exchange API returns an unexpected HTTP status."""

    def __init__(self, status_code: int, url: str, message: str = "") -> None:
        self.status_code = status_code
        # Strip the URL to path only so no query params are included in traces
        safe_url = url.split("?")[0]
        super().__init__(f"Delta API error {status_code} at {safe_url}: {message}")


from datetime import datetime, timezone

def parse_delta_timestamp(raw_val: Any) -> datetime:
    """Standardized robust parser for Delta Exchange's dual timestamp formats.
    Handles Unix microsecond/millisecond integers, floats, and standard ISO-8601 strings.
    """
    if not raw_val:
        return datetime.now(timezone.utc)
    
    # 1. Handle integer or float timestamp
    try:
        val_str = str(raw_val).strip()
        if val_str.isdigit() or (val_str.startswith("-") and val_str[1:].isdigit()):
            ts = float(val_str)
        else:
            ts = float(raw_val)
            
        if ts > 1e14:  # Microseconds (e.g. 1678045806327000)
            return datetime.fromtimestamp(ts / 1_000_000, tz=timezone.utc)
        elif ts > 1e11:  # Milliseconds (e.g. 1678045806327)
            return datetime.fromtimestamp(ts / 1_000, tz=timezone.utc)
        else:  # Seconds
            return datetime.fromtimestamp(ts, tz=timezone.utc)
    except (ValueError, TypeError):
        pass

    # 2. Handle ISO-8601 format string
    try:
        iso_str = str(raw_val).strip()
        if iso_str.endswith("Z"):
            iso_str = iso_str[:-1] + "+00:00"
        return datetime.fromisoformat(iso_str)
    except Exception:
        return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def _sign(method: str, path: str, query: str, body: str, timestamp: str) -> str:
    """Generate HMAC-SHA256 signature as required by Delta Exchange."""
    message = method + timestamp + path
    if query:
        message += "?" + query
    message += body
    
    return hmac.new(
        config.READ_ONLY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()


def _headers(method: str, path: str, query: str = "", body: str = "") -> dict[str, str]:
    timestamp = str(int(time.time()))
    signature = _sign(method, path, query, body, timestamp)
    return {
        "Accept": "application/json",
        "api-key": config.READ_ONLY_KEY,
        "timestamp": timestamp,
        "signature": signature,
    }


# ---------------------------------------------------------------------------
# Core request — with retry/backoff (D5) and safe error wrapping (S1)
# ---------------------------------------------------------------------------

def _get(path: str, params: dict[str, Any] | None = None, public: bool = False) -> dict[str, Any]:
    """
    Make an authenticated (or public) GET request with exponential backoff.

    Retries on 429 (rate-limit) and transient 5xx errors up to _MAX_RETRIES times.
    Handles 401 timestamp drift by re-attempting once.
    Raises DeltaAPIError on persistent failure (S1: no auth headers in traces).
    """
    params = params or {}
    query = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{config.base_url}{path}"
    hdrs = {"Accept": "application/json"}
    if not public:
        hdrs.update(_headers("GET", f"/v2{path}", query))

    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            response = requests.get(url, params=params, headers=hdrs, timeout=15)

            # Handle Rate Limits (E)
            if response.status_code == 429 and attempt < _MAX_RETRIES:
                wait = float(response.headers.get("Retry-After", _BACKOFF_BASE * (2 ** attempt)))
                print(f"WARNING: Rate limited. Retrying in {wait}s...")
                time.sleep(wait)
                continue

            # Handle Timestamp Drift (F)
            if response.status_code == 401 and "timestamp" in response.text.lower() and attempt == 0:
                print("WARNING: Auth failed due to timestamp drift. Re-syncing clock and retrying...")
                hdrs.update(_headers("GET", f"/v2{path}", query))
                continue

            if response.status_code in _RETRY_STATUSES and attempt < _MAX_RETRIES:
                wait = _BACKOFF_BASE * (2 ** attempt)
                time.sleep(wait)
                last_exc = requests.HTTPError(response=response)
                continue

            if not response.ok:
                raise DeltaAPIError(
                    status_code=response.status_code,
                    url=url,
                    message=response.text[:200],
                )

            return response.json()

        except requests.ConnectionError as exc:
            last_exc = exc
            if attempt < _MAX_RETRIES:
                time.sleep(_BACKOFF_BASE * (2 ** attempt))
            continue

    raise DeltaAPIError(
        status_code=getattr(getattr(last_exc, "response", None), "status_code", 0),
        url=url,
        message=f"Request failed after {_MAX_RETRIES} retries",
    ) from last_exc


def _paginate(path: str, params: dict[str, Any] | None = None) -> Generator[dict, None, None]:
    """
    Yield all pages of results from a cursor-paginated endpoint.
    Delta uses `after` cursor in meta for next page.
    """
    params = params or {}
    params.setdefault("page_size", config.PAGE_LIMIT)

    while True:
        data = _get(path, params)
        results = data.get("result", [])
        if not results:
            break

        yield from results

        meta = data.get("meta", {})
        after_cursor = meta.get("after")
        if not after_cursor:
            break

        params["after"] = after_cursor


# ---------------------------------------------------------------------------
# Public fetch functions
# ---------------------------------------------------------------------------

def fetch_fills(after: str | None = None) -> list[dict]:
    """
    Fetch all fills (actual trade executions).
    Each fill has: price, side, size, commission, product_symbol, created_at.
    """
    params: dict[str, Any] = {}
    if after:
        params["after"] = after

    return list(_paginate("/fills", params))


def fetch_transactions(after: str | None = None, transaction_types: str | None = None) -> list[dict]:
    """
    Fetch wallet transaction history (funding, fees, rewards, etc).
    """
    params: dict[str, Any] = {}
    if after:
        params["after"] = after
    if transaction_types:
        params["transaction_types"] = transaction_types

    return list(_paginate("/wallet/transactions", params))


def fetch_order_history(after: str | None = None) -> list[dict]:
    """
    Fetch closed/cancelled orders.
    Each order has: limit_price, stop_price, paid_commission, state.
    """
    params: dict[str, Any] = {}
    if after:
        params["after"] = after

    return list(_paginate("/orders/history", params))


def fetch_wallet_balance() -> list[dict]:
    """
    Fetch current wallet balances.
    Returns: balance, available_balance, net_equity per asset.
    """
    data = _get("/wallet/balances")
    return data.get("result", [])


def fetch_positions(product_id: int | None = None, underlying_asset_symbol: str | None = None) -> list[dict]:
    """
    Fetch current open positions.
    Returns: size, entry_price, mark_price, unrealized_pnl, margin_used, leverage per product.
    """
    # If no parameters are provided, dynamically fetch for all common and traded assets
    # to avoid the mandatory parameter validation error from Delta Exchange API.
    if not product_id and not underlying_asset_symbol:
        assets = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "AVAX", "MATIC"]
        try:
            import sqlite3
            conn = sqlite3.connect("app.db")
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT symbol FROM trade")
            symbols = [row[0] for row in cursor.fetchall()]
            conn.close()
            for s in symbols:
                asset = s
                for suffix in ["USD", "-perpetual", "USDT"]:
                    if asset.endswith(suffix):
                        asset = asset[:-len(suffix)]
                if asset and asset not in assets:
                    assets.append(asset)
        except Exception:
            pass

        results = []
        for asset in assets:
            try:
                data = _get("/positions", {"underlying_asset_symbol": asset})
                res = data.get("result", [])
                if res:
                    results.extend(res)
            except Exception:
                continue
        return results

    params = {}
    if product_id:
        params["product_id"] = product_id
    if underlying_asset_symbol:
        params["underlying_asset_symbol"] = underlying_asset_symbol
    data = _get("/positions", params)
    return data.get("result", [])


def fetch_ohlc(symbol: str, resolution: str = "1h", start: int = 0, end: int = 0) -> list[dict]:
    """
    Fetch historical OHLC candles for a product symbol.
    Resolution options: 1m, 5m, 15m, 30m, 1h, 4h, 6h, 1d
    Returns list of candles: {timestamp, open, high, low, close, volume}
    """
    params: dict[str, Any] = {
        "symbol": symbol,
        "resolution": resolution,
        "start": start,
        "end": end,
    }
    data = _get("/history/candles", params, public=True)
    result = data.get("result", [])
    for c in result:
        c["timestamp"] = c.pop("time")
    return result


def fetch_products(contract_types: str = "") -> list[dict]:
    """
    Fetch available products/trading pairs.
    """
    params = {}
    if contract_types:
        params["contract_types"] = contract_types
    data = _get("/products", params)
    return data.get("result", [])


def fetch_tickers(underlying_asset_symbols: str = "") -> list[dict]:
    """
    Fetch live tickers for products.
    """
    params = {}
    if underlying_asset_symbols:
        params["underlying_asset_symbols"] = underlying_asset_symbols
    data = _get("/tickers", params)
    return data.get("result", [])


# ---------------------------------------------------------------------------
# News & External Data
# ---------------------------------------------------------------------------

def fetch_news(categories: str = "BTC,ETH,Trading") -> list[dict]:
    """
    Fetch latest crypto news from CryptoCompare (institutional-grade aggregation).
    """
    url = "https://min-api.cryptocompare.com/data/v2/news/"
    params = {
        "lang": "EN",
        "categories": categories,
        "api_key": config.CRYPTOCOMPARE_API_KEY
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.ok:
            return response.json().get("Data", [])
    except Exception as e:
        print(f"CryptoCompare News fetch failed: {e}")
    
    return []


def fetch_rss_news() -> list[dict]:
    """
    Fetch and parse direct RSS feeds from major crypto outlets.
    This is the most stable and free method (no API key required).
    """
    import feedparser
    
    feeds = [
        "https://cointelegraph.com/rss",
        "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "https://thedefiant.io/feed"
    ]
    
    all_entries = []
    for url in feeds:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:5]: # Top 5 from each
                all_entries.append({
                    "id": entry.get("id", entry.get("link")),
                    "source": feed.feed.get("title", "Unknown"),
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "published_on": entry.get("published_parsed", None), # We'll format this in routes
                    "body": entry.get("summary", "")[:200] + "...",
                    "imageurl": entry.get("media_content", [{}])[0].get("url", "") if entry.get("media_content") else ""
                })
        except Exception as e:
            print(f"RSS fetch failed for {url}: {e}")
            
    return all_entries


COINGECKO_IDS = {
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana",
    "XRP": "ripple", "ADA": "cardano", "DOGE": "dogecoin",
    "AVAX": "avalanche-2", "DOT": "polkadot", "LINK": "chainlink",
    "MATIC": "matic-network", "ATOM": "cosmos", "UNI": "uniswap",
    "PEPE": "pepe", "SHIB": "shiba-inu", "ARB": "arbitrum",
    "OP": "optimism", "APT": "aptos", "SUI": "sui",
}


def fetch_benchmark(symbol: str, start_ts: int) -> list[dict]:
    coin_id = COINGECKO_IDS.get(symbol.upper(), symbol.lower())
    end_ts = int(time.time())
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart/range"
    params = {"vs_currency": "usd", "from": start_ts, "to": end_ts}
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    prices = data.get("prices", [])
    if not prices:
        return []
    base_price = prices[0][1]
    return [{"date": __timestamp_to_date(ts // 1000), "value": round((p / base_price - 1) * 100, 2)}
            for ts, p in prices]


def __timestamp_to_date(ts: int) -> str:
    from datetime import datetime, timezone
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
