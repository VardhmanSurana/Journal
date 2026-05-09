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

from src.config import config

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

def _headers(method: str, path: str, query: str = "", body: str = "", key: str = None, secret: str = None) -> dict[str, str]:
    timestamp = str(int(time.time()))
    api_key = key or config.API_KEY
    api_secret = secret or config.API_SECRET
    
    message = method + timestamp + path
    if query:
        message += "?" + query
    message += body
    
    signature = hmac.new(
        api_secret.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    return {
        "Accept": "application/json",
        "api-key": api_key,
        "timestamp": timestamp,
        "signature": signature,
    }


# ---------------------------------------------------------------------------
# Core request — with retry/backoff (D5) and safe error wrapping (S1)
# ---------------------------------------------------------------------------

def _get(path: str, params: dict[str, Any] | None = None, public: bool = False, key: str = None, secret: str = None) -> dict[str, Any]:
    """
    Make an authenticated (or public) GET request with exponential backoff.
    """
    params = params or {}
    query = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{config.base_url}{path}"
    hdrs = {"Accept": "application/json"}
    if not public:
        hdrs.update(_headers("GET", f"/v2{path}", query, "", key, secret))

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


def _paginate(path: str, params: dict[str, Any] | None = None, key: str = None, secret: str = None) -> Generator[dict, None, None]:
    """
    Yield all pages of results from a cursor-paginated endpoint.
    Delta uses `after` cursor in meta for next page.
    """
    params = params or {}
    params.setdefault("page_size", config.PAGE_LIMIT)

    while True:
        data = _get(path, params, key=key, secret=secret)
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

def fetch_fills(after: str | None = None, key: str = None, secret: str = None) -> list[dict]:
    """
    Fetch all fills (actual trade executions).
    """
    params: dict[str, Any] = {}
    if after:
        params["after"] = after

    return list(_paginate("/fills", params, key=key, secret=secret))


def fetch_order_history(after: str | None = None, key: str = None, secret: str = None) -> list[dict]:
    """
    Fetch closed/cancelled orders.
    """
    params: dict[str, Any] = {}
    if after:
        params["after"] = after

    return list(_paginate("/orders/history", params, key=key, secret=secret))


def fetch_wallet_balance(key: str = None, secret: str = None) -> list[dict]:
    """
    Fetch current wallet balances.
    """
    data = _get("/wallet/balances", key=key, secret=secret)
    return data.get("result", [])


def fetch_wallet_transactions(after: str | None = None, key: str = None, secret: str = None) -> list[dict]:
    """
    Fetch wallet transaction history (deposits, withdrawals, funding, etc.).
    """
    params: dict[str, Any] = {}
    if after:
        params["after"] = after

    return list(_paginate("/wallet/transactions", params, key=key, secret=secret))
