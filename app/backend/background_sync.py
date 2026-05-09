"""
Scheduled Background Sync Script for Delta Journal.
This script performs a full sync from Delta Exchange and checks for alert triggers.

Usage:
    uv run background_sync.py
    
Cron Setup (every hour):
    0 * * * * cd /path/to/project/app/backend && uv run background_sync.py >> sync.log 2>&1
"""
import requests
import sys
from datetime import datetime

API_BASE = "http://localhost:8000/api"

def run_sync():
    print(f"[{datetime.now().isoformat()}] Starting background sync...")
    try:
        # 1. Trigger Trade Sync
        sync_res = requests.post(f"{API_BASE}/sync")
        if sync_res.status_code == 200:
            data = sync_res.json()
            print(f"  ✓ Sync successful: {data.get('new_fills_synced')} new fills found.")
        else:
            print(f"  ✗ Sync failed with status {sync_res.status_code}: {sync_res.text}")
            
        # 2. Check Alerts
        alert_res = requests.post(f"{API_BASE}/alerts/check")
        if alert_res.status_code == 200:
            data = alert_res.json()
            alerts = data.get("alerts", [])
            if alerts:
                print(f"  ! {len(alerts)} alerts triggered.")
                for a in alerts:
                    print(f"    - [{a.get('type')}] {a.get('message')}")
            else:
                print("  ✓ No alerts triggered.")
        else:
            print(f"  ✗ Alert check failed with status {alert_res.status_code}")
            
    except Exception as e:
        print(f"  ✗ Error during background sync: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_sync()
