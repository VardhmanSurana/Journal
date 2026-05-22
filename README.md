# Delta Journal

Automated crypto trading journal for Delta Exchange users with full-stack web dashboard and Obsidian vault integration.

## Features

### 📊 Full-Stack Dashboard (React)
- **Real-time Overview** - Open positions, current equity curve, and latest market news.
- **Economics & Financials** - Dedicated analysis of **Fees Paid** (Commissions + GST), **Funding History**, and **Account Rewards**.
- **Trade History** - Complete journal with event-driven FIFO matching (aggregates partial fills) and detailed P&L breakdown for each partial exit.
- **Advanced Risk Metrics** - Sharpe Ratio, Sortino Ratio, Calmar Ratio, and Drawdown tracking.
- **System Maintenance** - Monitor data integrity via the **Data Quality Reconciler** and track **Auto-Sync Health**.
- **Indian Tax Compliance** - GST extraction, slab-rate tax calculations, and turnover tracking for audit thresholds.
- **Dynamic Currency** - Instantly toggle between USD and INR across all reports.

### 📝 Obsidian Integration (CLI)
- **Markdown Journaling** - Automatically generate detailed trade reports in your Obsidian vault.
- **Interactive Dashboards** - DataviewJS + Chart.js powered views with live currency switching.
- **AI Trading Coach** - Optional Gemini integration to analyze performance and provide actionable feedback.

### 🛡️ Security & Journal-First Philosophy
- **Read-Only by Design** - The application is architecturally restricted to read-only API interactions, ensuring zero risk of accidental trade execution or position modification.
- **HMAC-SHA256 Auth** - Secure interaction with Delta Exchange API.
- **Credential Protection** - Secrets are redacted in logs and never exposed in traces.

## Project Status

The project is currently optimized for **Institutional-Grade Journaling**.
- **Security Hardening:** Completed (Pivot to Read-Only keys, removal of active trading risk).
- **Functional UX:** Completed (Financial analytics, sync lifecycle tracking).
- **UI Redesign:** Completed (Spacious two-column trade details, standardized P&L styling).

See [docs/implementation_plan.md](docs/implementation_plan.md) for the roadmap.

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
| CLI / Sync | uv (Python), Bun (Frontend) |
| Integration | Obsidian, DataviewJS, Chart.js, Google Gemini |

## License

MIT
