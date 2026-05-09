# Delta Journal

An automated crypto trading journal built specifically for Delta Exchange users, generating beautiful, interactive reports directly into your Obsidian Vault.

## Quick Start

1. **Prerequisites**: Install [uv](https://github.com/astral-sh/uv) (the fast Python package manager) and Obsidian.
2. **Install Dependencies**:
   ```bash
   uv sync
   ```
3. **Configuration**:
   Copy the example environment file and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
4. **Run the Sync**:
   ```bash
   uv run main.py
   ```
   *To completely reset your local database and perform a fresh sync, run: `uv run main.py --reset`*

## Features

- **Automated Trade Matching**: intelligently aggregates partial fills and uses a FIFO stack to match opening and closing positions perfectly.
- **Obsidian Integration**: Creates Daily Notes, Individual Trade Notes, and a comprehensive Dashboard dynamically rendered via DataviewJS and Chart.js.
- **AI Trading Coach**: Uses Gemini to analyze your performance and generate actionable trading insights right in your dashboard.
- **Indian Tax Compliance**: Tracks your trading turnover (₹10Cr audit limit) and calculates net profit after slab-rate tax to keep you compliant with Indian crypto derivative taxation.
- **Dynamic USD ↔ INR UI**: Toggle your dashboard between USD and INR instantly via a seamless UI switch.
- **Local & Secure**: Stores your trade history in a local SQLite database (`journal.db`). API keys are securely sent in HTTP headers (no proxy leakage).

## Configuration

These settings live in your `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `DELTA_API_KEY` | Your Delta Exchange API Key | |
| `DELTA_API_SECRET`| Your Delta Exchange API Secret | |
| `GEMINI_API_KEY` | Gemini API key for AI Insights | |
| `DELTA_REGION` | The Delta Exchange region (`india` or `global`) | `india` |
| `VAULT_PATH` | Absolute path to your Obsidian Vault | Auto-detected |
| `VAULT_SUBDIR` | Optional sub-folder inside your vault | |
| `INCOME_TAX_SLAB`| Your personal tax slab (e.g. `0.30` for 30%) | `0.30` |

## Documentation

- [Developer Guide](./DEVELOPER.md) - Architecture, contributing, and testing details.

## License

MIT
