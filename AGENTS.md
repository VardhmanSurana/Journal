# Memory

## Project Overview

**Delta Journal** is an automated crypto trading journal for Delta Exchange users that generates interactive reports in Obsidian Vault.

**Key Components:**
- **FIFO Trade Matching Engine**: Aggregates partial fills and matches opening/closing positions using a stack-based approach
- **Obsidian Integration**: Generates DataviewJS + Chart.js powered dashboards with dynamic USD/INR currency toggle
- **AI Trading Coach**: Gemini integration for performance analysis and actionable insights
- **Indian Tax Compliance**: Tracks turnover for ₹10Cr audit threshold, calculates slab-rate tax (not 30% flat VDA rate)
- **Local SQLite Storage**: Trade history stored in `journal.db`, API keys sent via HTTP headers only

**Architecture:**
```
Delta Exchange API → client.py → models.py (FIFO matching) → db.py → writer/ → Obsidian Vault
```

**Main Entry Point:** `main.py` - CLI with `--dry-run`, `--limit N`, and `--reset` flags

## Build and Test Commands

**Package Manager:** `uv` (Astral's fast Python tool)

```bash
# Install dependencies
uv sync

# Run the application
uv run main.py

# Run with options
uv run main.py --dry-run      # Preview without writing files
uv run main.py --limit 100    # Fetch only latest 100 fills
uv run main.py --reset        # Wipe database and fresh sync

# Run tests
uv run pytest tests/ -v

# Run specific test file
uv run pytest tests/test_models.py -v
uv run pytest tests/test_writer.py -v
```

**Project Configuration:** `pyproject.toml`
- Python ≥3.11 required
- Dependencies: `google-auth`, `python-dotenv`, `requests`, `rich`
- Dev dependencies: `pytest`, `pytest-mock`

## Code Style Guidelines

- **Variable Names**: Use descriptive, meaningful names (e.g., `gross_pnl`, `fifo_stack`, `matched_trades`)
- **Follow Existing Patterns**: Match the style in `src/models.py` and `src/writer/` subpackage
- **Extract Complex Conditions**: Break complex boolean logic into named variables for clarity
- **Type Hints**: Use Python type hints where appropriate (follow existing codebase patterns)
- **Docstrings**: Document complex business logic (e.g., FIFO matching, tax calculations)
- **Error Handling**: Use custom exceptions like `DeltaAPIError` with sanitized error messages

## Testing Instructions

**Test Framework:** pytest with pytest-mock

```bash
# Run all tests
uv run pytest tests/ -v

# Run specific test modules
uv run pytest tests/test_models.py -v    # Trade matching and FIFO engine
uv run pytest tests/test_writer.py -v     # Markdown output generation
uv run pytest tests/test_connection.py -v # API connectivity
```

**Testing Patterns:**
- Mock `src.writer.<module>.config` when testing writer subpackage (not global config)
- Tests cover: trade matching logic, P&L calculations, markdown output generation
- Database migrations tested via `init_db` in `src/db.py`

**Adding New Tests:**
When testing writer modules, patch the specific submodule's config reference:
```python
# Correct: patch the submodule's imported config
mocker.patch('src.writer.dashboard.config')

# Incorrect: don't patch a global config object
```

## Security Considerations

**API Credential Handling:**
- API keys passed strictly as HTTP Headers (`x-goog-api-key`, `x-delta-*`), never in query strings or bodies
- This prevents credential leakage in proxy logs and server access logs

**Error Sanitization:**
- `DeltaAPIError` automatically strips authentication headers and query-string keys from stack traces
- Failed request traces never expose `api_key`, `secret`, or `Authorization` headers

**Local-Only Storage:**
- Trade history stored in local SQLite (`journal.db`) - no cloud sync of trading data
- Environment variables in `.env` file (never commit this file)

**Rate Limiting & Resilience:**
- Exponential backoff for 429 and 5xx errors in `src/client.py`
- Prevents account lockout during large sync operations

**Configuration Security:**
- `.env.example` provided as template - users copy to `.env` and fill credentials
- No hardcoded secrets in source code
- Database path and vault path configurable via environment variables

## Architecture Notes

**FIFO Trade Matching (`src/models.py`):**
- Partial fills aggregated by `order_id` before matching
- Stack-based approach: opening fills accumulate, closing fills consume from stack
- Handles scaling in/out gracefully

**Tax Compliance (India-focused):**
- Crypto futures = Speculative Business Income (slab rate taxation)
- Turnover calculated using `abs(gross_pnl)` for ₹10Cr audit threshold
- 18% GST extracted from `commission` field in Delta API

**Obsidian Dynamic Rendering (`src/writer/`):**
- DataviewJS + Chart.js for live equity curves
- MutationObserver-based currency toggle (USD ↔ INR)
- Dashboard survives Dataview plugin re-renders

## Common Workflows

**First-time Setup:**
```bash
cp .env.example .env
# Edit .env with your API keys
uv sync
uv run main.py
```

**Daily Sync:**
```bash
uv run main.py
```

**Reset and Resync (if data issues):**
```bash
uv run main.py --reset
```

**Preview Changes (dry run):**
```bash
uv run main.py --dry-run
```

**Database Migrations:**
- Automatic non-destructive `ALTER TABLE` on initialization
- Add new columns to `_MIGRATION_COLUMNS` in `src/db.py` for backward compatibility
