# Delta Journal

Automated crypto trading journal for Delta Exchange users with full-stack web dashboard and Obsidian vault integration.

## Project Structure

```
.
├── .env.example          # Environment configuration template
├── start.sh              # Start both frontend & backend
├── README.md             # This file
│
├── app/                  # Full-stack web application
│   ├── frontend/         # React + TypeScript dashboard
│   │   ├── src/
│   │   │   ├── pages/    # Dashboard, Analytics, Tax, etc.
│   │   │   ├── components/  # Sidebar, Charts, Modals
│   │   │   ├── hooks/    # useCurrency, useTheme
│   │   │   └── config/   # API configuration
│   │   └── package.json
│   │
│   └── backend/          # FastAPI REST API
│       ├── api/          # Routes, Models, Client
│       ├── main.py       # API entry point
│       └── pyproject.toml
│
└── obsidian/             # Original Obsidian vault sync (optional)
    ├── src/              # Models, Writer, Client
    ├── main.py           # CLI entry point
    └── pyproject.toml
```

## Prerequisites

- **Node.js runtime**: [Bun](https://bun.sh) (v1.3+) recommended
- **Python**: v3.11+ with [uv](https://github.com/astral-sh/uv)
- **Delta Exchange**: API keys from https://www.delta.exchange/app/account/api

## Quick Start

### 1. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
# - DELTA_API_KEY / DELTA_API_SECRET
# - VAULT_PATH (for Obsidian sync)
# - INCOME_TAX_SLAB (your tax slab rate)
```

### 2. Run the App

```bash
# Start both frontend and backend
./start.sh
```

This will:
- Start the backend API at `http://localhost:8000`
- Start the frontend at `http://localhost:5173`
- Press `Ctrl+C` to stop both services

### 3. Alternative: Run Separately

**Backend only:**
```bash
cd app/backend
uv sync
uv run python main.py
```

**Frontend only:**
```bash
cd app/frontend
bun install
bun run dev
```

## Features

### Frontend (React Dashboard)
- **Dashboard** - Overview with open positions, equity curve, recent trades
- **Trade History** - Complete journal with filtering and search
- **Analytics** - P&L by hour/day, win rate by direction, duration analysis
- **Risk & Positions** - Sharpe/Sortino ratios, position sizing calculator
- **Tax Report** - Annual turnover, GST breakdown, audit threshold alerts
- **Daily Reviews** - Track mood, discipline score, mistakes, lessons
- **Theme** - Dark/Light mode toggle
- **Currency** - USD/INR conversion

### Backend (FastAPI)
- **REST API** - Trades, summary, positions, risk metrics
- **Trade Reconstruction** - Event-driven FIFO matching
- **Tax Calculations** - Slab-rate tax, GST extraction, audit thresholds
- **News Feed** - CryptoCompare + RSS aggregation

### Obsidian Sync (Optional)
```bash
cd obsidian
uv run main.py --dry-run   # Preview without writing files
uv run main.py             # Full sync to Obsidian vault
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DELTA_API_KEY` | Delta Exchange API key | Yes |
| `DELTA_API_SECRET` | Delta Exchange API secret | Yes |
| `DELTA_REGION` | "india" or "global" | Yes |
| `INCOME_TAX_SLAB` | Your income tax slab rate (e.g., 0.30) | Yes |
| `VAULT_PATH` | Path to Obsidian vault (Obsidian sync only) | No |
| `VITE_API_URL` | Backend URL (frontend only) | No |

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS 4 |
| Backend | Python 3.11+, FastAPI, SQLModel, Uvicorn |
| Database | SQLite (local) |
| Runtime | Bun (frontend), uv (Python) |

## Development

```bash
# Frontend lint
cd app/frontend && bun run lint

# Backend tests (if any)
cd app/backend && uv run pytest

# Full rebuild
cd app/frontend && bun run build
```

## License

MIT