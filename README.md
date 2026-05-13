# Delta Journal

Automated crypto trading journal for Delta Exchange users with full-stack web dashboard and Obsidian vault integration.

## Features

### 📊 Full-Stack Dashboard (React)
- **Real-time Overview** - Open positions, current equity curve, and latest market news.
- **Trade History** - Complete journal with event-driven FIFO matching (aggregates partial fills).
- **Advanced Risk Metrics** - Sharpe Ratio, Sortino Ratio, Calmar Ratio, and Drawdown tracking.
- **Health & Safety Panel** - Live sync status, API connectivity check, and staleness detection.
- **Operational Safety** - Toggle **Safe Mode** to disable risk actions and manage **Deadman Switch**.
- **Indian Tax Compliance** - GST extraction, slab-rate tax calculations, and turnover tracking for audit thresholds.
- **Dynamic Currency** - Instantly toggle between USD and INR across all reports.

### 📝 Obsidian Integration (CLI)
- **Markdown Journaling** - Automatically generate detailed trade reports in your Obsidian vault.
- **Interactive Dashboards** - DataviewJS + Chart.js powered views with live currency switching.
- **AI Trading Coach** - Optional Gemini integration to analyze performance and provide actionable feedback.

### 🛡️ Security & Resilience
- **HMAC-SHA256 Auth** - Secure interaction with Delta Exchange API.
- **Credential Protection** - Secrets are redacted in logs and never exposed in traces.
- **Resilient Client** - Automatic exponential backoff for rate limits and 401 timestamp drift correction.

## Project Status

The project is currently in active development.
- **Phase 1 (Security Hardening):** 90% Complete (Input validation, broad exception removal, safety metadata).
- **Phase 2 (Functional UX):** 80% Complete (Health endpoints, sync lifecycle tracking).
- **Phase 3 (UI/UX Elevation):** Ongoing (Health panel, action safety gating, trust-oriented microcopy).

See [docs/implementation_plan.md](docs/implementation_plan.md) for the full roadmap.

## Prerequisites

- **Node.js runtime**: [Bun](https://bun.sh) (v1.3+) recommended
- **Python**: v3.11+ with [uv](https://github.com/astral-sh/uv)
- **Delta Exchange**: API keys from [delta.exchange](https://www.delta.exchange/app/account/api)
- **Docker**: (Optional) For containerized deployment

## Quick Start

### 1. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
```

### 2. Run the App (Local)

```bash
# Start both frontend and backend
./start.sh
```

- **Backend API:** `http://localhost:8000`
- **Frontend Dashboard:** `http://localhost:5173`

### 3. Run with Docker

Alternatively, you can run the entire stack using Docker Compose:

```bash
docker compose up --build -d
```

- **Dashboard:** `http://localhost` (Port 80)
- **Backend API:** `http://localhost:8000`

## Troubleshooting

### 🔑 API Key: IP Whitelist Error
If you see a `401 Unauthorized` error in the logs mentioning `ip_not_whitelisted_for_api_key`, it means your Delta Exchange API key has IP restrictions enabled.

**To fix this:**
1. **Identify your Public IP:**
   - If running locally: Visit [ifconfig.me](https://ifconfig.me) in your browser.
   - If running in Docker: Run `docker compose exec backend curl ifconfig.me`.
2. **Update Delta Settings:**
   - Go to [Delta Exchange API Settings](https://www.delta.exchange/app/account/api).
   - Find your API key and either **add your IP** to the whitelist or **disable IP restriction** (recommended for dynamic IPs).

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS 4, Lucide Icons |
| Backend | Python 3.11+, FastAPI, SQLModel (SQLite), Pydantic v2 |
| CLI / Sync | uv (Python), Bun (Frontend) |
| Integration | Obsidian, DataviewJS, Chart.js, Google Gemini |

## License

MIT