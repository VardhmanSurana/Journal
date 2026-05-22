# Delta Exchange API v2 Technical Reference

This document serves as an exhaustive technical guide for integrating with the **Delta Exchange v2 API** (specifically focusing on the India region standard `https://api.india.delta.exchange`, with equivalents for the global server `https://api.delta.exchange`). It covers request structures, HMAC-SHA256 signature calculations, rate limits, pagination mechanics, data representation rules, and endpoint specifications.

---

## 1. Protocol & General Specifications

| Component | Standard |
| :--- | :--- |
| **API Architecture** | REST HTTP (JSON payload structure) & WebSockets |
| **Request Content-Type** | `application/json` (Required for POST, PUT, DELETE requests) |
| **Response Format** | JSON (Envelope pattern) |
| **Base URL (India Region)** | `https://api.india.delta.exchange` |
| **Base URL (Global Region)** | `https://api.delta.exchange` |
| **BigDecimal Pricing** | Represented exclusively as **Strings** to prevent floating-point rounding errors |

---

## 2. Authentication & Message Signing

Delta Exchange uses a standard **HMAC-SHA256 signature** authentication pattern. All private/authenticated API queries require key-header payloads.

### Required HTTP Headers
*   `api-key`: Your generated 30-character read-only or trading API key string.
*   `signature`: Hex-encoded signature derived from the payload prehash string.
*   `timestamp`: Epoch timestamp (in seconds) corresponding to when the signature was created.
*   `User-Agent`: Mandatory identifier representing your client/library (e.g., `python-3.11` or `rest-client`). Missing headers trigger **HTTP 400 Bad Request** blocks at the CDN layer.

### Prehash String Formula
The prehash string is formed by raw string concatenation:
$$\text{Prehash} = \text{HTTP\_METHOD} + \text{Timestamp} + \text{Request\_Path} + \text{Query\_String} + \text{Request\_Body}$$

*   **HTTP\_METHOD**: Upper-case HTTP verb (e.g., `GET`, `POST`, `PUT`, `DELETE`).
*   **Timestamp**: The exact string value supplied in the `timestamp` header (must be current within a **5-second** grace window).
*   **Request\_Path**: The URI path (must include the api version, e.g., `/v2/orders`).
*   **Query\_String**: The query parameters including the leading `?` character (e.g., `?product_id=1&state=open`). Set to an empty string (`""`) if query parameters are absent.
*   **Request\_Body**: The exact stringified JSON body payload. Set to an empty string (`""`) for GET requests or empty POST requests.

---

### Signature Calculation Examples

#### Python Implementation
```python
import time
import hmac
import hashlib
import requests

def get_auth_headers(api_key: str, api_secret: str, method: str, path: str, query_string: str = "", payload: str = "") -> dict:
    # 1. Derive active epoch timestamp in seconds
    timestamp = str(int(time.time()))
    
    # 2. Build the prehash string
    prehash_string = method + timestamp + path + query_string + payload
    
    # 3. Compute HMAC-SHA256 hex signature
    secret_bytes = bytes(api_secret, 'utf-8')
    message_bytes = bytes(prehash_string, 'utf-8')
    signature = hmac.new(secret_bytes, message_bytes, hashlib.sha256).hexdigest()
    
    # 4. Return compliant headers
    return {
        'api-key': api_key,
        'timestamp': timestamp,
        'signature': signature,
        'User-Agent': 'python-rest-client',
        'Content-Type': 'application/json'
    }
```

#### Shell / OpenSSL Verification
```bash
# Example for: GET /v2/orders?product_id=1&state=open at Timestamp: 1542110948
echo -n "GET1542110948/v2/orders?product_id=1&state=open" | openssl dgst -sha256 -hmac "<API_SECRET_KEY>"
```

---

## 3. Rate Limits & Endpoint Weighting

Delta Exchange implements rate limit boundaries at two distinct levels to ensure system stability.

### A. REST API Account Quota
*   **Default Allowance**: **10,000 units** per rolling **5-minute window**.
*   **Throttling Context**: Authenticated requests are throttled per user ID; unauthenticated requests are limited per IP address.
*   **Rate Limit Exhaustion**: Responds with **HTTP 429 Too Many Requests**.
*   **Reset Header**: The `X-RATE-LIMIT-RESET` response header reports the number of milliseconds remaining until the current quota window resets.

#### Weight Deductions
Each endpoint is assigned a cost deduction value:
*   **Public Read Endpoints** (e.g., Tickers, OHLC): `1 unit`
*   **Get Open Orders / Get Balances**: `3 units`
*   **Place Order / Edit Order**: `5 units`
*   **Batch Order Operations**: `25 units`

### B. Matching Engine Performance Caps
*   **Cap**: Maximum **500 operations per second** for any single product (trading symbol).
*   *Note*: A batch order containing 50 individual orders represents 50 engine operations and will be throttled at this layer even if the account REST quota is fully compliant.

---

## 4. Standard Data Formats & Typings

### Timestamps
Returned as standard [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format with microsecond precision:
```text
2026-05-22T23:46:16.123456Z
```

### Big Decimals / Numbers
*   **Precision Safety**: High-precision parameters (e.g., `limit_price`, `stop_price`, `commission`, `realized_pnl`) are invariably returned and parsed as **Strings**. This guarantees no loss of decimal precision during JSON serialization.
*   **Integers**: Standard numbers like `product_id`, `size`, or `impact_size` are unquoted.

---

## 5. Core REST Endpoints Reference

### A. Products & Assets
#### `GET /v2/assets`
Lists all supported tokens and assets with deposit/withdrawal properties.

#### `GET /v2/products`
Lists all active derivatives, futures, and option contracts with symbols, strike prices, underlying asset, and multiplier fields.

#### `GET /v2/tickers`
Returns standard market tickers containing open interest, 24h volume, mark price, index price, and funding rates.

---

### B. Orders Management (Private)
#### `POST /v2/orders`
Placing orders requires structural body formats:
```json
{
  "product_id": 16,
  "size": 10,
  "side": "buy",
  "order_type": "limit_order",
  "limit_price": "85.25"
}
```

#### `GET /v2/orders` (Active Orders)
*   **Weight**: `3 units`
*   **Params**: `product_id` (optional), `state` (defaults to `open`).

#### `GET /v2/orders/history`
Retrieves closed, filled, and cancelled historical orders.

---

### C. Trade History & Journaling (Private)
#### `GET /v2/fills` (Critical for Journals)
Retrieves granular list fills. Used by synchronizers to reconcile trade legs.
*   **Query Parameters**:
    *   `product_id` (integer) - Limit search to symbol.
    *   `limit` (integer) - Maximum returned results (default: 100).
    *   `after` / `before` (string) - Cursor-based pagination markers.

```json
{
  "success": true,
  "data": [
    {
      "id": 87654321,
      "order_id": 987654321,
      "product_id": 16,
      "side": "sell",
      "price": "92.15",
      "size": 5,
      "fee": "0.02764",
      "commission": "0.02764",
      "created_at": "2026-05-22T18:28:38.123456Z"
    }
  ]
}
```

---

### D. Wallet & Balances (Private)
#### `GET /v2/wallet/balances`
Retrieves active wallets with total balance, available balance, and maintenance margin totals.

#### `GET /v2/wallet/transactions`
Retrieves comprehensive deposits, withdrawals, trading fee debits, funding rate cash flows, and rewards. This is vital to extract precise commissions and rebates.
