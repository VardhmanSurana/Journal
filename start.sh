#!/bin/bash

# Delta Journal Full-Stack Runner
# This script starts both the FastAPI backend and the React frontend.

# Get the absolute path of the project root
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables from root .env using export
if [ -f "$ROOT_DIR/.env" ]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^# ]] && continue
        [[ -z "$key" ]] && continue
        # Remove leading/trailing whitespace from key
        key=$(echo "$key" | xargs)
        # Export the variable (with quotes to handle values with spaces)
        export "$key"="$value"
    done < "$ROOT_DIR/.env"
fi

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "Stopping Delta Journal services..."
    # Kill the background backend process
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    # Also kill any other background jobs started by this shell
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap Ctrl+C (SIGINT) and SIGTERM
trap cleanup SIGINT SIGTERM

echo "🚀 Starting Delta Journal Full-Stack App from $ROOT_DIR..."

# 1. Start Backend in the background
echo "📡 Starting Backend (FastAPI)..."
cd "$ROOT_DIR/app/backend" || { echo "❌ Could not find app/backend directory"; exit 1; }
uv run python main.py > "$ROOT_DIR/app/backend.log" 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to initialize..."
MAX_RETRIES=15
COUNT=0
while ! curl -s http://localhost:8000/ > /dev/null; do
    sleep 1
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Backend failed to start. Check app/backend.log for errors."
        echo "Recent logs:"
        tail -n 10 "$ROOT_DIR/app/backend.log"
        kill $BACKEND_PID
        exit 1
    fi
done

echo "✅ Backend is live at http://localhost:8000"

# 2. Start Frontend
echo "💻 Starting Frontend (Vite)..."
cd "$ROOT_DIR/app/frontend" || { echo "❌ Could not find app/frontend directory"; exit 1; }

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules missing, running bun install..."
    bun install
fi

bun run dev

# If bun run dev exits, cleanup will be called via the trap
wait
