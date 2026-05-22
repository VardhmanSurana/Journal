# 🔺 Delta Journal

Automated, high-fidelity crypto trading journal tailored specifically for **Delta Exchange** users. Equipped with an event-driven FIFO trade matching engine, Indian speculative tax calculations, AES-128 field-level encrypted notes, and a sleek, real-time React dashboard.

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
*   **Real-time Overview:** Live equity curves, active open positions, dynamic win rates, and integrated crypto news feeds.
*   **Economics & Financials:** Precise metrics for **Commissions**, **GST (18% Extracted)**, **Funding History**, and **Account Rewards**.
*   **Performance Calendars:** Visually trace winning and losing streaks on an intuitive daily performance grid.
*   **Dynamic Currency Engine**: Instantly toggle between USD and INR valuations globally across all pages and reports.

### 📈 Indian Tax Compliance
*   **Derivative Speculative Slab-Rate:** Programmatic categorization of derivative income under the personal income tax slab.
*   **Turnover & Audit Tracking:** Automated calculations matching Section 44AB threshold requirements (₹10Cr audits).
*   **GST Separation:** Extracts standard $18/118$ financial GST components from dynamic trade commission fees.

### 🧠 Psychological Journaling
*   **AES-128 Notes Encrypter:** Daily reviews, mood markers, and strategic lessons are encrypted on-disk using military-grade AES-128 block ciphers and PBKDF2 key derivation.

---

## 🏗️ System Architecture

Delta Journal uses an event-driven sync engine combined with a secure local database that decouples heavy exchange API requests from the frontend client.

```mermaid
graph TD
    subgraph "External API Layer"
        Delta[Delta Exchange API]
    end

    subgraph "Backend Engine (FastAPI)"
        Sync[Sync Daemon: app/backend/api/sync.py]
        DB[(WAL SQLite: app.db)]
        API[FastAPI Router: app/backend/api/routes.py]
        Crypt[AES-128 Encryption Engine]
    end

    subgraph "Frontend Client (React)"
        Dashboard[React SPA Dashboard]
    end

    Delta -->|Fetch Partial Fills| Sync
    Sync -->|FIFO Matching Algorithm| DB
    Crypt <-->|Read/Write Encrypted Logs| DB
    API <-->|Serve Clean JSON APIs| DB
    Dashboard <-->|Query Metrics| API
```

---

## ⚙️ Prerequisites

*   **Node.js**: [Bun](https://bun.sh) (v1.3+) recommended
*   **Python**: v3.11+ with [uv](https://github.com/astral-sh/uv) package manager
*   **API Credentials**: Read-Only API Keys from [Delta Exchange](https://www.delta.exchange/app/account/api)

---

## 🚀 Quick Start

### 1. Environment Setup

Copy the template configuration file to configure your local credentials:

```bash
# Create local configuration file
cp .env.example .env
```

Open `.env` and fill in your secure **Read-Only API Keys**:
```ini
DELTA_API_KEY=your_read_only_key
DELTA_API_SECRET=your_read_only_secret
DELTA_REGION=india # "india" or "global"
```

### 2. Local Development Stack

Run the integrated launcher to boot the FastAPI backend, the auto-sync loop, and the Vite development server simultaneously:

```bash
# Provide permissions and run
chmod +x start.sh
./start.sh
```

-   **Frontend Dashboard:** `http://localhost:5173`
-   **Backend REST API:** `http://localhost:8000`

### 3. Containerized Deployment (Docker Compose)

Launch the fully configured multi-container application stack in the background:

```bash
# Build and run with Docker Compose
docker compose up --build -d
```

-   **Frontend Dashboard:** `http://localhost`
-   **Backend REST API:** `http://localhost:8000/api`

---

## 🌐 Docker Outbound Proxy Routing (API Whitelisting)

Delta Exchange API keys require **IP Whitelisting** for secure data fetching. If your Docker host environment operates behind a dynamic IP (e.g., dynamic home ISP or cloud server rotations), outbound synchronizations will fail when your network changes.

Delta Journal natively supports routing all outbound Delta Exchange queries through a stable **Static Proxy**.

### Configuration Steps:
1.  Open your `.env` file at the root.
2.  Populate the proxy parameters:
    ```ini
    # === STATIC IP PROXY (Optional) ===
    PROXY_USER=proxyuser
    PROXY_PASS=proxypass123
    PROXY_IP=185.230.124.5
    PROXY_PORT=8080

    # Uncomment the compiled proxy connections to activate them in Docker Compose:
    # HTTP_PROXY=http://proxyuser:proxypass123@185.230.124.5:8080
    # HTTPS_PROXY=http://proxyuser:proxypass123@185.230.124.5:8080
    ```
3.  **Uncomment** the compiled `HTTP_PROXY` and `HTTPS_PROXY` lines.
4.  Apply changes and restart your stack:
    ```bash
    docker compose down && docker compose up -d
    ```
    *The Python backend will immediately route all external exchange connections through the configured proxy, satisfying your Delta whitelist rules.*

---

## 🛡️ Security Hardening & Concurrency

*   **Read-Only by Design:** The backend engine strictly excludes execution routes, buy/sell functions, and transaction capabilities. Your trading capital is structurally safe.
*   **Write-Ahead Logging (WAL):** SQLite database is initialized in WAL mode with a `30.0` second concurrency timeout, ensuring smooth background syncing while you interact with the UI.
*   **Robust Encryption:** Daily journal notes, mistakes, emotions, and lessons are transformed into high-entropy AES-128 ciphertext prior to SQLite insertion.
*   **Credential Masking:** Custom HMAC signatures are calculated strictly via headers. Secrets are programmatically redacted from all application logs and error stack traces.

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn and build. If you want to contribute:

1. Fork the project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
