#!/bin/bash
# Delta Journal Auto-Sync Script
# Add this to your crontab using `crontab -e`
# Example: 0 * * * * /home/chotaxdon/Work/Projects/Journal/sync.sh >> /home/chotaxdon/Work/Projects/Journal/cron.log 2>&1

PROJECT_DIR="/home/chotaxdon/Work/Projects/Journal/obsidian"
cd "$PROJECT_DIR" || exit 1

echo "========================================================="
echo "Starting Delta Journal Sync at $(date)"
echo "========================================================="

# Ensure uv is in PATH
export PATH="/home/chotaxdon/.local/bin:$PATH"

# Run the python sync script
uv run main.py

echo "Sync completed at $(date)"
echo ""
