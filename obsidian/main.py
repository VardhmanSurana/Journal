"""
Main entry point — syncs Delta Exchange trades to Obsidian vault.

Usage:
    uv run main.py               # sync all fills
    uv run main.py --dry-run     # preview without writing files
    uv run main.py --limit 50    # only fetch latest 50 fills
"""
import argparse
import sys

from rich.console import Console
from rich.table import Table

from src.config import config
from src.client import fetch_fills, fetch_wallet_balance
from src.models import Fill, match_trades, build_summary
from src.writer import write_trade_note, write_dashboard, write_daily_notes, write_templater_template
from src import db

console = Console()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Delta Exchange → Obsidian Trade Journal")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and calculate but do not write any files",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of fills to fetch (default: all)",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wipe the local database history before syncing",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # ── Validate config ──────────────────────────────────────────────────────
    try:
        config.validate()
    except ValueError as e:
        console.print(f"[bold red]Config error:[/] {e}")
        sys.exit(1)

    console.rule("[bold blue]Delta Journal — Phase 1[/]")
    console.print(f"Vault: [cyan]{config.VAULT_PATH}[/]")
    console.print(f"Region: [cyan]{config.REGION}[/]")
    console.print(f"Income tax slab: [cyan]{int(config.INCOME_TAX_SLAB * 100)}%[/]")
    console.print()

    # ── Fetch fills ──────────────────────────────────────────────────────────
    with console.status("Fetching fills from Delta Exchange..."):
        raw_fills = fetch_fills()

    if args.limit:
        raw_fills = raw_fills[: args.limit]

    console.print(f"[green]✓[/] Fetched [bold]{len(raw_fills)}[/] fills")

    # ── Fetch wallet ─────────────────────────────────────────────────────────
    with console.status("Fetching wallet balances..."):
        wallet = fetch_wallet_balance()

    console.print(f"[green]✓[/] Fetched wallet balances for [bold]{len(wallet)}[/] assets")

    # ── Parse fills ──────────────────────────────────────────────────────────
    fills = [Fill.from_api(r) for r in raw_fills]

    # ── Match into trades ─────────────────────────────────────────────────────
    trades = match_trades(fills)
    console.print(f"[green]✓[/] Matched [bold]{len(trades)}[/] complete trades")

    if not trades:
        console.print("[yellow]No complete trades found. Do you have closed positions?[/]")
        sys.exit(0)

    # ── Database ─────────────────────────────────────────────────────────────
    with console.status("Saving to SQLite database..."):
        db.init_db()
        if args.reset:
            db.clear_db()
            console.print("[yellow]! Wiped local database (--reset)[/]")
        db.save_trades(trades)
    console.print("[green]✓[/] Saved trades to [cyan]journal.db[/]")

    # ── Summary table ─────────────────────────────────────────────────────────
    summary = build_summary(trades)
    table = Table(title="Trade Summary", border_style="blue")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", justify="right")

    table.add_row("Total Trades", str(summary["total_trades"]))
    table.add_row("Winners 📈", str(summary["winners"]))
    table.add_row("Losers 📉", str(summary["losers"]))
    table.add_row("Win Rate", f"{summary['win_rate']}%")
    table.add_row("Gross P&L", str(summary["total_gross_pnl"]))
    table.add_row("Base Fee (ex-GST)", str(summary["total_base_fee"]))
    table.add_row("GST on Fees 18%", str(summary["total_gst"]))
    table.add_row("Total Commission", str(summary["total_commission"]))
    table.add_row("Net P&L", str(summary["total_net_pnl"]))
    table.add_row("Income Tax (slab)", str(summary["total_income_tax"]))
    table.add_row("Profit After Tax", f"[bold]{summary['total_profit_after_tax']}[/]")
    table.add_row("Best Trade", f"[green]{summary['best_trade']}[/]")
    table.add_row("Worst Trade", f"[red]{summary['worst_trade']}[/]")

    console.print(table)

    # ── Write files ──────────────────────────────────────────────────────────
    if args.dry_run:
        console.print("\n[yellow]--dry-run: no files written.[/]")
        return

    console.print()
    with console.status("Writing trade notes..."):
        written = 0
        for trade in trades:
            write_trade_note(trade)
            written += 1

    console.print(f"[green]✓[/] Written [bold]{written}[/] trade notes → [cyan]{config.VAULT_PATH / 'trades'}[/]")

    with console.status("Writing daily notes..."):
        daily = write_daily_notes(trades)

    console.print(f"[green]✓[/] Written [bold]{len(daily)}[/] daily notes → [cyan]{config.VAULT_PATH / 'daily'}[/]")

    with console.status("Updating dashboard..."):
        dash_path = write_dashboard(trades, wallet)

    console.print(f"[green]✓[/] Dashboard updated → [cyan]{dash_path}[/]")

    template_path = write_templater_template()
    console.print(f"[green]✓[/] Templater template → [cyan]{template_path}[/]")

    console.rule("[bold green]Sync complete[/]")


if __name__ == "__main__":
    main()
