# Delta Journal Developer Guide

> Internal architecture, trade matching mechanics, and contribution guidelines for the Delta Journal project.

## Core Files & Project Structure

- `main.py`: Main entry point and CLI orchestration.
- `src/client.py`: API interactions (Delta and Gemini) with exponential backoff and custom error boundaries (`DeltaAPIError`).
- `src/models.py`: Core domain logic (Data structures for `Fill` and `Trade`, plus the trade-matching FIFO engine).
- `src/db.py`: Local SQLite database management (`journal.db`) and migration logic.
- `src/writer/`: Markdown and dashboard generation (Sub-packaged for maintainability).
- `tests/`: Pytest suite covering all trade matching, calculations, and markdown output generation.

## Key Concepts & Architecture

### 1. FIFO Trade Matching (`src/models.py`)
The system queries raw fills from Delta Exchange, but these must be converted into discrete "Trades" (Entry + Exit).
- **Aggregation**: Partial fills of the same order are deeply copied and aggregated by `order_id` to prevent split trades.
- **Matching Engine**: We group fills by symbol and use a First-In-First-Out (FIFO) open stack. Opening fills accumulate, and closing fills dynamically consume them. This gracefully handles scaling in and scaling out of positions.

### 2. Tax & Compliance Logic
Delta Exchange India (crypto derivatives) falls under Speculative Business Income, meaning:
- Profits are taxed at the user's standard income tax slab rate (not the 30% flat VDA rate).
- Turnover is calculated using `abs(gross_pnl)` (pre-fee). This is crucial for determining if the user surpasses the ₹10Cr audit threshold.
- The Delta API embeds an 18% GST inside the `commission` field, which we extract and display for precise accounting.

### 3. Obsidian Dynamic Rendering (`src/writer/`)
Rather than producing a static dashboard, we generate a Markdown file leveraging standard Obsidian plugins:
- **Dataview/Tracker**: For rendering tables and generic SVG charts.
- **DataviewJS + Chart.js**: We inject a raw Javascript block capable of mounting a `Chart.js` canvas for a live equity curve.
- **Mutation-Observer Currency Toggle**: The dashboard includes a Javascript-based currency toggle (USD ↔ INR). It uses a DOM `MutationObserver` to watch for plugin re-renders (like Dataview asynchronous tables) and safely wrap `$123.45` values in spans for dynamic real-time conversion.

### 4. API Security & Resilience
- **Auth Hardening**: API keys are passed strictly as HTTP Headers (e.g. `x-goog-api-key`), mitigating the risk of credential leakage in proxy logs.
- **Error Handling**: The custom `DeltaAPIError` automatically intercepts failing requests and strips sensitive authentication headers or query-string keys before dumping stack traces.
- **Rate-Limiting**: The `_get()` client employs exponential backoff handling (`429` and `5xx` errors) to ensure reliable syncs on large trading accounts.

## Testing Setup

We use `pytest` for unit testing the matching engine and markdown writers.

```bash
# Run the entire test suite
uv run pytest tests/ -v

# Run a specific file
uv run pytest tests/test_models.py -v
```

### Adding New Tests
When adding features to the Obsidian `writer` subpackage, note that tests often mock `src.writer.<module>.config`. Make sure to patch the specific submodule's configuration reference (e.g. `src.writer.dashboard.config`) rather than a global `config` object.

## Database Migrations
The SQLite schema automatically applies non-destructive `ALTER TABLE` queries upon initialization (see `init_db` in `src/db.py`). If you need to add a new column, add it to the `_MIGRATION_COLUMNS` array to ensure backward compatibility for existing users.
