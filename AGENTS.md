# Memory

## Project Overview

**Delta Journal** is a secure, automated crypto trading journal for Delta Exchange users featuring a premium React-based dashboard and a robust FastAPI-backed local API service.

**Key Components:**
- **FIFO Trade Matching Engine**: Event-driven engine inside `app/backend/api/sync.py` that aggregates partial fills and tracks matches using an open stack algorithm.
- **Vibrant React Frontend**: Sleek dashboard featuring real-time statistics, responsive visual equity curves, and robust interactive parameters.
- **Advanced Concurrency & WAL Database**: Multi-reader/multi-writer local SQLite (`app.db`) utilizing Write-Ahead Logging and 30-second timeouts.
- **AES-128 Field-Level Encryption**: Centralized Fernet key-derivation engine in `app/backend/api/encryption.py` that secures psychological notes, lessons, strategies, and emotions on-disk.
- **Indian Tax Compliance**: Programmatically calculates slab-rate speculative tax rates, tracks turnover thresholds for ₹10Cr audits, and extracts embedded GST.
- **Programmatic Auto-Migrations**: Dynamically inspects active database tables at boot-up and executes non-destructive column alignments to match active Pydantic/SQLModel structures.

**Architecture:**
```
Delta Exchange API ──> Sync Loop (api/sync.py) ──> SQLite DB (app.db) <── FastAPI (api/routes.py) <── React SPA (Vite)
```

**Main Runner:** `start.sh` - Starts FastAPI backend, background sync daemon, and Vite dev server simultaneously.

## Build and Test Commands

**Package Manager:** `uv` (Python Backend), `bun` (React Frontend)

```bash
# Install all backend dependencies
cd app/backend
uv sync

# Run backend unit tests with local path resolution
PYTHONPATH=. uv run pytest tests/ -v

# Start full-stack services locally
./start.sh
```

**Project Configuration:** `app/backend/pyproject.toml`
- Python ≥3.11 required
- Key Dependencies: `fastapi`, `sqlmodel`, `cryptography`, `pytest`

## Code Style Guidelines

- **Variable Names**: Use descriptive, meaningful names (e.g., `gross_pnl`, `fifo_stack`, `matched_trades`)
- **Follow Existing Patterns**: Match the style in `app/backend/api/` subpackage
- **Type Hints**: Explicitly type functions and models (e.g. `raw_val: Any -> datetime`)
- **Error Handling**: Redact API authentication tokens and secrets from failed requests and logs via the custom `DeltaAPIError`.

## Security Considerations

- **Read-Only by Design**: The application only uses read-only exchange credentials; active trading options are completely excluded.
- **API Credential Handling**: Keys and secrets are strictly sent as custom HTTP headers (`api-key`, `signature`, `timestamp`), never in URLs.
- **On-Disk Encryption**: All sensitive psychological observations are stored in AES-128 ciphertext using `cryptography.fernet`.
- **Local Storage**: All operations are stored in the local SQLite file `app.db`; no external cloud syncer is used.
- **Database Busy Fail-safes**: Connect and SQLite engines are set with a high `30.0` timeout, preventing locks.

## Architecture Notes

**FIFO Trade Matching (`app/backend/api/sync.py`):**
- Partial fills are aggregated by transaction ID and side.
- Main queue dynamically aggregates contract volume, scaling positions in/out, and matching entries to exits chronologically.

**Tax Compliance:**
- Speculative Income (derivatives/futures) is taxed based on personal tax slabs, not flat VDA transfer tax.
- Indian GST is extracted as `commission * (18 / 118)` for financial accountability.
