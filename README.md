<p align="center">
  <img src="./app/frontend/public/logo.png" alt="Delta Journal Logo" width="128" style="border-radius: 24px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);" />
</p>

# 🔺 Delta Journal

Automated, high-fidelity crypto trading journal tailored specifically for **Delta Exchange** users. Equipped with an event-driven FIFO trade matching engine, Indian speculative tax calculations, AES-128 field-level encrypted notes, AI-powered trade analysis, real-time WebSocket data, and a sleek React dashboard.

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black&style=for-the-badge" alt="React 18" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white&style=for-the-badge" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white&style=for-the-badge" alt="Python 3.11+" />
  <img src="https://img.shields.io/badge/SQLite-WAL%20Enabled-003B57?logo=sqlite&logoColor=white&style=for-the-badge" alt="SQLite WAL" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License MIT" />
</p>

---

## 📌 Table of Contents

- [📖 Introduction](#-introduction)
- [🧩 Features](#-features)
- [🏗️ System Architecture](#️-system-architecture)
- [⚙️ Prerequisites](#️-prerequisites)
- [🚀 Quick Start](#-quick-start)
  - [1. Environment Setup](#1-environment-setup)
  - [2. Local Development Stack](#2-local-development-stack)
  - [3. Containerized Deployment (Docker Compose)](#3-containerized-deployment-docker-compose)
- [🤖 AI Trade Analysis](#-ai-trade-analysis)
- [📊 Advanced Statistics](#-advanced-statistics)
- [📈 Benchmark Comparison](#-benchmark-comparison)
- [📥 Import & Export](#-import--export)
- [🌐 Docker Outbound Proxy Routing (API Whitelisting)](#-docker-outbound-proxy-routing-api-whitelisting)
- [🛡️ Security Hardening & Concurrency](#️-security-hardening--concurrency)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 📖 Introduction

Keeping a manual trading journal is tedious and error-prone. **Delta Journal** automates the entire loop. It securely syncs your read-only execution records from the Delta Exchange API, aggregates fragmented partial fills chronologically using a robust FIFO matching algorithm, extracts hidden economic costs like funding rates and GST, and serves them in a premium real-time React analytics platform.

---

## 🧩 Features

### 📊 Full-Stack Dashboard
- **Real-time Overview:** Live equity curves, active open positions, dynamic win rates, wallet balance, and integrated crypto news feeds.
- **Advanced Statistics:** Sharpe, Sortino, and Calmar ratios, max win/loss streaks, average hold time, gross P&L in a collapsible section.
- **Benchmark Comparison:** Toggle BTC/ETH/SOL return overlay on your equity curve via CoinGecko market data.
- **OHLC Trade Charts:** Entry/exit price candles with ReferenceDot markers inside the trade detail modal.
- **Performance Calendars:** Visually trace winning and losing streaks on an intuitive daily performance grid.
- **Dynamic Currency Engine:** Instantly toggle between USD and INR valuations globally across all pages and reports.
- **Pages:** Dashboard, Fees & Funding (with funding rate predictions), Journal (trade reviews), Import Data, Maintenance.

### 🤖 AI Trade Analysis
- **Vertex AI (Gemini 2.5 Pro):** Structured JSON critique via Pydantic schema — pattern identification, psychological state, mistakes, actionable suggestions, risk score.
- **Ollama Support:** Run local LLMs (Llama 3.2, etc.) with automatic model pulling on first use.
- One-click analysis button inside every trade detail modal.

### 📈 Indian Tax Compliance
- **Derivative Speculative Slab-Rate:** Programmatic categorization of derivative income under the personal income tax slab.
- **Turnover & Audit Tracking:** Automated calculations matching Section 44AB threshold requirements (₹10Cr audits).
- **GST Separation:** Extracts standard 18/118 financial GST components from dynamic trade commission fees.

### 🧠 Psychological Journaling
- **AES-128 Notes Encrypter:** Daily reviews, mood markers, and strategic lessons are encrypted on-disk using military-grade AES-128 block ciphers and PBKDF2 key derivation.

### 📥 Import & Export
- **CSV Import:** Drag-and-drop CSV files with smart column auto-detection (Delta, Binance, Bybit formats supported).
- **Export Reports:** Download trade-level and monthly summary CSV reports.

---

## 🏗️ System Architecture

Delta Journal uses an event-driven sync engine combined with a secure local database that decouples heavy exchange API requests from the frontend client. WebSocket connections provide real-time positions, wallet, and margin data with REST fallback.

```mermaid
graph TD
    subgraph "External API Layer"
        Delta[Delta Exchange API]
        CG[CoinGecko API]
    end

    subgraph "Backend Engine (FastAPI)"
        WS[WebSocket Client: ws_client.py]
        Sync[Sync Daemon: sync.py]
        DB[(WAL SQLite: app.db)]
        API[FastAPI Router: routes.py]
        AI[AI Engine: ai.py]
        Crypt[AES-128 Encryption Engine]
    end

    subgraph "Frontend Client (React)"
        Dashboard[React SPA Dashboard]
    end

    Delta -->|REST + WebSocket| WS
    Delta -->|Fetch Trades & Orders| Sync
    Sync -->|FIFO Matching| DB
    WS -->|Real-time Cache| API
    AI -->|Vertex AI / Ollama| API
    CG -->|Benchmark Prices| API
    Crypt <-->|Encrypted Logs| DB
    API <-->|Clean JSON APIs| DB
    Dashboard <-->|Query Metrics| API
```

---

## ⚙️ Prerequisites

- **Git**
- **Python:** v3.11+ with [uv](https://github.com/astral-sh/uv) package manager
- **Bun:** v1.3+ ([install guide](https://bun.sh))
- **API Credentials:** Read-Only API Keys from [Delta Exchange](https://www.delta.exchange/app/account/api)
- **Ollama (optional):** For local AI analysis — [install Ollama](https://ollama.com)

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/VardhmanSurana/Journal.git
cd delta-journal

# Install backend dependencies
cd app/backend && uv sync && cd ../..

# Install frontend dependencies
cd app/frontend && bun install && cd ../..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in your Delta Exchange API keys:

```ini
DELTA_API_KEY=your_read_only_key
DELTA_API_SECRET=your_read_only_secret
DELTA_REGION=india
```

### 3. Local Development

```bash
# Start both backend and frontend
make dev
```

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000`

### 4. Docker Deployment

```bash
docker compose up --build -d
```

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000/api`
- **Ollama:** `http://localhost:11434`

> The backend automatically pulls the configured Ollama model on first use when `AI_PROVIDER=ollama`.

---

## 🤖 AI Trade Analysis

Delta Journal supports two AI backends for trade critique:

| Provider | Setup | Model |
|----------|-------|-------|
| **Vertex AI** (default) | Set `PROJECT_ID` in `.env` (Google Cloud ADC) | `gemini-2.5-pro` with structured Pydantic output |
| **Ollama** (local) | Set `AI_PROVIDER=ollama` in `.env` | Configurable via `OLLAMA_MODEL` (default: `llama3.2`) |

The analysis returns: risk score (1-10), identified pattern, psychological state, mistake list, and actionable suggestions — displayed inside the trade detail modal.

> No Delta Exchange API key is required for AI analysis.

---

## 📊 Advanced Statistics

The Dashboard includes a collapsible Advanced Statistics section with:

- **Sharpe Ratio** (risk-adjusted return)
- **Sortino Ratio** (downside deviation)
- **Calmar Ratio** (return vs max drawdown)
- **Max Win / Loss Streaks**
- **Average Holding Time**
- **Gross P&L**

---

## 📈 Benchmark Comparison

Toggle benchmark overlays on the equity curve chart to compare your performance against major crypto assets:

- BTC (Bitcoin)
- ETH (Ethereum)
- SOL (Solana)

Powered by the free CoinGecko public API — no API key needed.

---

## 📥 Import & Export

### CSV Import
Navigate to **Import Data** page, drag-and-drop CSV files. The engine auto-detects column layouts from Delta Exchange, Binance, and Bybit export formats.

### Export Reports
Download CSV reports from the Import Data page:
- **Trade-level export:** All closed trades with full metadata
- **Monthly summary:** Aggregated P&L, fees, and trade counts per month

> No Delta Exchange API key needed for import/export features.

---

## 🌐 Docker Outbound Proxy Routing (API Whitelisting)

Delta Exchange API keys require **IP Whitelisting** for secure data fetching. If your Docker host environment operates behind a dynamic IP, Delta Journal natively supports routing all outbound queries through a **Static Proxy**.

```ini
# === STATIC IP PROXY (Optional) ===
PROXY_USER=proxyuser
PROXY_PASS=proxypass123
PROXY_IP=185.230.124.5
PROXY_PORT=8080

# Uncomment to activate:
# HTTP_PROXY=http://proxyuser:proxypass123@185.230.124.5:8080
# HTTPS_PROXY=http://proxyuser:proxypass123@185.230.124.5:8080
```

---

## 🛡️ Security Hardening & Concurrency

- **Read-Only by Design:** The backend strictly excludes execution routes, buy/sell functions, and transaction capabilities.
- **Write-Ahead Logging (WAL):** SQLite initialized in WAL mode with a 30-second concurrency timeout.
- **Robust Encryption:** Journal notes, mistakes, emotions, and lessons are AES-128 encrypted before storage.
- **Credential Masking:** Secrets are programmatically redacted from all application logs and error stack traces.
- **Real-time WebSocket:** Persistent WebSocket connection to Delta Exchange reduces REST API calls and rate limit pressure.

---

## 🤝 Contributing

1. Fork the project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
