"""
API connectivity test — runs without requiring a vault or any files.
Tests:
  1. GET /indices           (public — network + DNS check)
  2. GET /wallet/balances   (authenticated)
  3. GET /fills             (authenticated)
  4. GET /orders/history    (authenticated)
"""
import sys
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

# ── Load config ───────────────────────────────────────────────────────────────
try:
    from src.config import config
    if not config.API_KEY or not config.API_SECRET:
        console.print("[bold red]ERROR:[/] API key/secret missing in .env")
        sys.exit(1)
except Exception as e:
    console.print(f"[bold red]Config error:[/] {e}")
    sys.exit(1)

console.rule("[bold blue]Delta Exchange — API Connection Test[/]")
console.print(f"Region : [cyan]{config.REGION}[/]")
console.print(f"Base   : [cyan]{config.base_url}[/]")
console.print(f"API Key: [cyan]{config.API_KEY[:8]}...{config.API_KEY[-4:]}[/]")
console.print()

import requests
from src.client import _get

errors: list[str] = []
warnings: list[str] = []

# ── Test 1: Public endpoint ──────────────────────────────────────────────────
console.print("[bold]Test 1:[/] GET /indices (public — no auth needed)")
try:
    data = _get("/indices", public=True)
    count = len(data.get("result", []))
    console.print(f"  [green]✓[/] OK — {count} indices returned (network + DNS working)")
except Exception as e:
    msg = f"GET /indices failed: {e}"
    console.print(f"  [red]✗[/] {msg}")
    errors.append(msg)

# ── Test 2: Wallet balances ──────────────────────────────────────────────────
console.print("\n[bold]Test 2:[/] GET /wallet/balances (authenticated)")
try:
    from src.client import fetch_wallet_balance
    wallet = fetch_wallet_balance()
    console.print(f"  [green]✓[/] Auth OK — {len(wallet)} assets in wallet")

    table = Table(border_style="green")
    table.add_column("Asset")
    table.add_column("Balance", justify="right")
    table.add_column("Available", justify="right")
    has_balance = False
    for w in wallet:
        bal = float(w.get("balance", 0))
        if bal > 0:
            has_balance = True
            table.add_row(
                w.get("asset_symbol", ""),
                str(round(bal, 4)),
                str(round(float(w.get("available_balance", 0)), 4)),
            )
    if has_balance:
        console.print(table)
    else:
        console.print("  [yellow]All balances are zero[/]")

except requests.HTTPError as e:
    body = e.response.json() if e.response else {}
    err_code = body.get("error", {}).get("code", "unknown")
    client_ip = body.get("error", {}).get("context", {}).get("client_ip", "unknown")

    if err_code == "ip_not_whitelisted_for_api_key":
        msg = f"IP not whitelisted: [bold]{client_ip}[/]"
        console.print(f"  [red]✗[/] {msg}")
        warnings.append(
            f"IP whitelist issue — your current IP [bold cyan]{client_ip}[/] is not "
            f"whitelisted on this API key.\n"
            f"    Fix: Go to Delta Exchange → API Keys → Edit → add [bold]{client_ip}[/] to whitelist\n"
            f"    Or disable IP whitelist if you have a dynamic IP."
        )
    else:
        msg = f"GET /wallet/balances failed ({e.response.status_code}): {err_code}"
        console.print(f"  [red]✗[/] {msg}")
        errors.append(msg)

except Exception as e:
    msg = f"GET /wallet/balances failed: {e}"
    console.print(f"  [red]✗[/] {msg}")
    errors.append(msg)

# ── Test 3: Fills ────────────────────────────────────────────────────────────
console.print("\n[bold]Test 3:[/] GET /fills (authenticated)")
try:
    data = _get("/fills", {"page_size": 5})
    fills = data.get("result", [])
    console.print(f"  [green]✓[/] Auth OK — {len(fills)} fills on first page")
    if fills:
        f = fills[0]
        console.print(f"  Latest fill: [cyan]{f.get('product_symbol')}[/] "
                      f"{f.get('side')} @ {f.get('price')} × {f.get('size')} "
                      f"(commission: {f.get('commission')})")
    else:
        console.print("  [yellow]No fills found yet — account may have no closed trades[/]")
except requests.HTTPError as e:
    body = e.response.json() if e.response else {}
    err_code = body.get("error", {}).get("code", "")
    if err_code == "ip_not_whitelisted_for_api_key":
        console.print("  [red]✗[/] IP whitelist (same issue as Test 2)")
    else:
        errors.append(f"GET /fills failed: {e}")
        console.print(f"  [red]✗[/] {errors[-1]}")
except Exception as e:
    msg = f"GET /fills failed: {e}"
    console.print(f"  [red]✗[/] {msg}")
    errors.append(msg)

# ── Test 4: Order history ────────────────────────────────────────────────────
console.print("\n[bold]Test 4:[/] GET /orders/history (authenticated)")
try:
    data = _get("/orders/history", {"page_size": 5})
    orders = data.get("result", [])
    console.print(f"  [green]✓[/] Auth OK — {len(orders)} orders on first page")
    if orders:
        o = orders[0]
        console.print(f"  Latest order: [cyan]{o.get('product_symbol')}[/] "
                      f"{o.get('side')} {o.get('order_type')} "
                      f"@ {o.get('limit_price')} — state: {o.get('state')}")
    else:
        console.print("  [yellow]No closed orders yet[/]")
except requests.HTTPError as e:
    body = e.response.json() if e.response else {}
    err_code = body.get("error", {}).get("code", "")
    if err_code == "ip_not_whitelisted_for_api_key":
        console.print("  [red]✗[/] IP whitelist (same issue as Test 2)")
    else:
        errors.append(f"GET /orders/history failed: {e}")
        console.print(f"  [red]✗[/] {errors[-1]}")
except Exception as e:
    msg = f"GET /orders/history failed: {e}"
    console.print(f"  [red]✗[/] {msg}")
    errors.append(msg)

# ── Result ───────────────────────────────────────────────────────────────────
console.print()

if warnings:
    console.rule("[bold yellow]ACTION REQUIRED[/]")
    for w in warnings:
        console.print(Panel(w, title="⚠️  Fix Required", border_style="yellow"))

if errors:
    console.rule("[bold red]HARD ERRORS[/]")
    for err in errors:
        console.print(f"  [red]✗[/] {err}")
    sys.exit(1)
elif warnings:
    console.print("\n[yellow]Network and signature are correct.[/]")
    console.print("[yellow]Fix the IP whitelist on Delta Exchange, then re-run this test.[/]")
    sys.exit(0)
else:
    console.rule("[bold green]ALL TESTS PASSED ✓[/]")
    console.print("\n[green]API is fully working. Run:[/]  [bold]uv run main.py --dry-run[/]")
