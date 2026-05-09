# Delta Journal Workspace

This project has been expanded into a full-stack application.

## Structure

- **`/obsidian`**: The original automated trade journal that syncs Delta Exchange trades into an Obsidian Vault.
- **`/app`**: Unified full-stack application folder.
    - **`/app/frontend`**: React-based web dashboard (Vite + TS).
    - **`/app/backend`**: Python-based REST API (FastAPI).

## Running the Project

### Standalone App (Frontend + Backend)
Run everything with a single command from the root directory:
```bash
./start.sh
```
This script handles starting the backend, waiting for it to be ready, and then launching the frontend. Press `Ctrl+C` to stop both services cleanly.

### Obsidian Sync (Original)
```bash
cd obsidian
uv run main.py
```

## Key Technologies
- **Frontend**: React, TypeScript, Vite, Bun, Lucide Icons, Axios.
- **Backend**: Python, FastAPI, SQLModel (SQLAlchemy), Uvicorn.
- **Database**: SQLite (local).

## Setup
Ensure you have your `.env` file configured in both `/obsidian` and `/backend`.
