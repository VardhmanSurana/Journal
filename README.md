# Delta Journal

Automated crypto trading journal for Delta Exchange users with a highly secure full-stack web dashboard.

## Features

### 📊 Full-Stack Dashboard (React)
- **Real-time Overview** - Open positions, current equity curve, and latest market news.
- **Economics & Financials** - Dedicated analysis of **Fees Paid** (Commissions + GST), **Funding History**, and **Account Rewards**.
- **Trade History** - Complete journal with event-driven FIFO matching (aggregates partial fills) and detailed P&L breakdown for each partial exit.
- **Advanced Risk Metrics** - Sharpe Ratio, Sortino Ratio, Calmar Ratio, and Drawdown tracking.
- **System Maintenance** - Monitor data integrity via the **Data Quality Reconciler** and track **Auto-Sync Health**.
- **Indian Tax Compliance** - GST extraction, slab-rate tax calculations, and turnover tracking for audit thresholds.
- **Dynamic Currency** - Instantly toggle between USD and INR across all reports.

### 🛡️ Security & Concurrency Hardening
- **Read-Only by Design** - The application is architecturally restricted to read-only API interactions, ensuring zero risk of accidental trade execution or position modification.
- **AES-128 Field-Level Encryption** - Sensitive psychological data (trade notes, strategies, emotions, mistakes, daily reviews) are automatically encrypted on disk using robust PBKDF2 key derivation and Fernet ciphers.
- **High Concurrency Database** - Enabled SQLite Write-Ahead Logging (WAL) and 30-second connection busy timeouts across all synchronization and backend services to eliminate lock exceptions.
- **Programmatic Auto-Migrations** - Dynamic boot-time schema aligner that programmatically detects and updates SQLite tables to match active Python models without risk of data loss.
- **Credential Protection** - HMAC-SHA256 authenticated API queries, where secrets are strictly passed via headers and redacted in all stack traces and application logs.

## Project Status

The project is currently optimized for **Institutional-Grade Journaling**.
- **Security Hardening:** Completed (Field-level encryption, multi-reader WAL database, redaction).
- **Functional UX:** Completed (Financial analytics, sync lifecycle tracking, currency conversion).
- **UI Redesign:** Completed (Spacious two-column trade details, standardized P&L styling).

## Prerequisites

- **Node.js runtime**: [Bun](https://bun.sh) (v1.3+) recommended
- **Python**: v3.11+ with [uv](https://github.com/astral-sh/uv)
- **Delta Exchange**: **Read-Only** API keys from [delta.exchange](https://www.delta.exchange/app/account/api)

## Quick Start

### 1. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values (DELTA_API_KEY and DELTA_API_SECRET)
```

### 2. Run the App (Local)

```bash
# Start both frontend and backend
./start.sh
```

- **Backend API:** `http://localhost:8000`
- **Frontend Dashboard:** `http://localhost:5173`

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS 4, Lucide Icons |
| Backend | Python 3.11+, FastAPI, SQLModel (SQLite), Pydantic v2 |
| Security | cryptography (AES-128 Fernet, PBKDF2HMAC-SHA256) |
| CLI / Sync | uv (Python), Bun (Frontend) |
| Integration | Google Gemini (AI Trading Coach) |

## License

MIT
