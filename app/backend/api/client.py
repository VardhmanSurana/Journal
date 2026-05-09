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
        config.API_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()


def _headers(method: str, path: str, query: str = "", body: str = "") -> dict[str, str]:
    timestamp = str(int(time.time()))
    signature = _sign(method, path, query, body, timestamp)
    return {
        "Accept": "application/json",
        "api-key": config.API_KEY,
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


def fetch_positions(product_id: int | None = None) -> list[dict]:
    """
    Fetch current open positions.
    Returns: size, entry_price, mark_price, unrealized_pnl, margin_used, leverage per product.
    """
    params = {}
    if product_id:
        params["product_id"] = product_id
    data = _get("/positions", params)
    return data.get("result", [])


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
