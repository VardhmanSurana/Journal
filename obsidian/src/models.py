"""
Trade data models and P&L calculator.

Taxation model for Delta Exchange India (crypto futures/derivatives):

  Crypto futures = Speculative Business Income (NOT VDA spot transfer)
  → Taxed at your personal income tax SLAB rate (ITR-3 / PGBP schedule)
  → Losses can be carried forward up to 4 years (set off against speculative gains)
  → 30% flat (Sec 115BBH) does NOT apply to futures — that's only for spot VDA

  Trading fees already include 18% GST (embedded in commission returned by API)
  → commission = base_fee + GST = base_fee × 1.18
  → we extract GST portion for display: commission × (18/118)
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import copy

from src.config import config


@dataclass
class Fill:
    id: int
    symbol: str
    side: str          # "buy" | "sell"
    price: float
    size: float
    commission: float  # total fee paid incl. 18% GST, in settling asset
    role: str          # "maker" | "taker"
    order_id: str
    created_at: str
    settling_asset: str
    fill_type: str
    notional: float = 0.0   # notional contract value (from API)
    meta: dict = field(default_factory=dict)

    @staticmethod
    def from_api(raw: dict) -> "Fill":
        meta = raw.get("meta_data") or {}
        return Fill(
            id=raw["id"],
            symbol=raw.get("product_symbol", ""),
            side=raw.get("side", ""),
            price=float(raw.get("price", 0)),
            size=float(raw.get("size", 0)),
            commission=float(raw.get("commission", 0)),
            role=raw.get("role", ""),
            order_id=str(raw.get("order_id", "")),
            created_at=raw.get("created_at", ""),
            settling_asset=raw.get("settling_asset_symbol", ""),
            fill_type=raw.get("fill_type", "normal"),
            notional=float(raw.get("notional", 0)),
            meta=meta,
        )

    @property
    def timestamp(self) -> datetime:
        """Parse created_at — Delta returns ISO string or microsecond int."""
        try:
            ts = int(self.created_at)
            return datetime.fromtimestamp(ts / 1_000_000, tz=timezone.utc)
        except (ValueError, TypeError):
            return datetime.fromisoformat(str(self.created_at).replace("Z", "+00:00"))


@dataclass
class Trade:
    symbol: str
    direction: str         # "long" | "short"
    entry_price: float
    exit_price: float
    size: float
    entry_time: datetime
    exit_time: datetime
    entry_commission: float  # includes 18% GST (embedded by Delta)
    exit_commission: float   # includes 18% GST
    settling_asset: str
    entry_order_id: str
    exit_order_id: str
    entry_role: str
    exit_role: str
    account_name: str = "Default"

    # Notional values from fills (Qty × Price × contract_multiplier)
    # Required because each product has a different contract size:
    #   XAUTUSD = 0.001 troy oz/contract
    #   ETHUSD  = 0.01  ETH/contract
    # gross_pnl MUST use notionals, not price_diff × size
    entry_notional: float = 0.0
    exit_notional: float = 0.0

    # Funding fees (sum of 8-hour funding payments while position was open)
    funding_fees: float = 0.0

    # Calculated fields
    gross_pnl: float = 0.0
    total_commission: float = 0.0    # entry + exit fee (GST included)
    gst_in_commission: float = 0.0   # 18% GST portion extracted for display
    net_fee_excl_gst: float = 0.0    # base fee before GST
    net_pnl: float = 0.0             # gross_pnl - total_commission + funding_fees
    income_tax: float = 0.0          # slab-rate tax on net profit (speculative business income)
    profit_after_tax: float = 0.0    # net_pnl - income_tax
    is_winner: bool = False

    def calculate(self) -> None:
        """
        Compute all P&L and tax fields.

        Commission from Delta API already contains 18% GST:
          commission = base_fee × 1.18
          → gst_portion = commission × (18/118)
          → base_fee   = commission × (100/118)

        Income tax (speculative business income):
          - Applied at slab rate (INCOME_TAX_SLAB in .env) on NET PROFIT only
          - Losses are NOT taxed and can be carried forward
          - This is NOT the 30% flat VDA rate (Sec 115BBH)
        """
        # Use notional values — accounts for contract size multiplier per product.
        # long:  profit when exit_notional > entry_notional
        # short: profit when entry_notional > exit_notional
        if self.direction == "long":
            self.gross_pnl = self.exit_notional - self.entry_notional
        else:
            self.gross_pnl = self.entry_notional - self.exit_notional

        self.total_commission = self.entry_commission + self.exit_commission

        # Break out GST portion (18% embedded in commission)
        self.gst_in_commission = self.total_commission * (18 / 118)
        self.net_fee_excl_gst = self.total_commission - self.gst_in_commission

        # Net P&L includes funding fees (positive = received, negative = paid)
        self.net_pnl = self.gross_pnl - self.total_commission + self.funding_fees

        # Income tax — only on profitable trades, at slab rate
        if self.net_pnl > 0:
            self.income_tax = self.net_pnl * config.INCOME_TAX_SLAB
            self.profit_after_tax = self.net_pnl - self.income_tax
        else:
            self.income_tax = 0.0
            self.profit_after_tax = self.net_pnl  # loss, no tax

        self.is_winner = self.net_pnl > 0

    @property
    def date_str(self) -> str:
        return self.entry_time.strftime("%Y-%m-%d")

    @property
    def note_filename(self) -> str:
        return f"{self.symbol}-{self.entry_time.strftime('%Y-%m-%d-%H%M%S')}-qty{self.size:g}.md"

    @property
    def hold_duration_minutes(self) -> float:
        delta = self.exit_time - self.entry_time
        return round(delta.total_seconds() / 60, 1)


def aggregate_fills(fills: list[Fill]) -> list[Fill]:
    """
    Combine multiple partial fills for the same order_id into a single Fill.
    This ensures that partial executions of the same order don't create split trades.
    """
    aggregated = {}
    for original_f in fills:
        f = copy.deepcopy(original_f)
        if f.order_id in aggregated:
            agg = aggregated[f.order_id]
            # Calculate weighted average price before updating size
            agg.price = ((agg.price * agg.size) + (f.price * f.size)) / (agg.size + f.size)
            agg.size += f.size
            agg.commission += f.commission
            agg.notional += f.notional
            # Keep the timestamp of the last fill for the order
            if f.timestamp > agg.timestamp:
                agg.created_at = f.created_at
        else:
            aggregated[f.order_id] = f
    
    return list(aggregated.values())


def match_trades(fills: list[Fill]) -> list[Trade]:
    """
    Match opening and closing fills into complete trades.

    Strategy:
    - Group fills by symbol
    - Use a FIFO position stack: opening fills accumulate, closing fills consume them
    - A "close" fill is the opposite side to the current net position direction
    """
    from collections import defaultdict

    # First, aggregate partial fills from the same order
    fills = aggregate_fills(fills)

    # Sort all fills by time ascending
    sorted_fills = sorted(fills, key=lambda f: f.timestamp)

    # Group by symbol
    by_symbol: dict[str, list[Fill]] = defaultdict(list)
    for fill in sorted_fills:
        by_symbol[fill.symbol].append(fill)

    trades: list[Trade] = []

    for symbol, symbol_fills in by_symbol.items():
        # FIFO stack of open "legs"
        open_stack: list[Fill] = []
        net_size: float = 0.0
        net_direction: Optional[str] = None

        for fill in symbol_fills:
            while fill.size > 1e-8:
                if net_size <= 1e-8:
                    # No open position, this fill opens a new one
                    open_stack.append(fill)
                    net_size += fill.size
                    net_direction = "long" if fill.side == "buy" else "short"
                    break

                is_close = (
                    (net_direction == "long" and fill.side == "sell") or
                    (net_direction == "short" and fill.side == "buy")
                )

                if not is_close:
                    # Adding to existing position
                    open_stack.append(fill)
                    net_size += fill.size
                    break

                # Closing against existing position
                entry_fill = open_stack[0]
                matched_size = min(entry_fill.size, fill.size)

                fraction_open = matched_size / entry_fill.size
                fraction_close = matched_size / fill.size

                entry_comm = entry_fill.commission * fraction_open
                entry_not = entry_fill.notional * fraction_open

                exit_comm = fill.commission * fraction_close
                exit_not = fill.notional * fraction_close

                trade = Trade(
                    symbol=symbol,
                    direction=net_direction,  # type: ignore[arg-type]
                    entry_price=entry_fill.price,
                    exit_price=fill.price,
                    size=matched_size,
                    entry_time=entry_fill.timestamp,
                    exit_time=fill.timestamp,
                    entry_commission=entry_comm,
                    exit_commission=exit_comm,
                    settling_asset=fill.settling_asset,
                    entry_order_id=entry_fill.order_id,
                    exit_order_id=fill.order_id,
                    entry_role=entry_fill.role,
                    exit_role=fill.role,
                    entry_notional=entry_not,
                    exit_notional=exit_not,
                )
                trade.calculate()
                trades.append(trade)

                # Deduct matched amounts from the open fill
                entry_fill.size -= matched_size
                entry_fill.commission -= entry_comm
                entry_fill.notional -= entry_not
                if entry_fill.size <= 1e-8:
                    open_stack.pop(0)

                # Deduct matched amounts from the incoming fill
                fill.size -= matched_size
                fill.commission -= exit_comm
                fill.notional -= exit_not
                
                net_size -= matched_size
                if net_size <= 1e-8:
                    net_direction = None
                    open_stack.clear()

    return sorted(trades, key=lambda t: t.entry_time, reverse=True)


def build_summary(trades: list[Trade]) -> dict:
    """Compute aggregate stats across all trades."""
    if not trades:
        return {}

    winners = [t for t in trades if t.is_winner]
    losers = [t for t in trades if not t.is_winner]
    total_net = sum(t.net_pnl for t in trades)
    total_gross = sum(t.gross_pnl for t in trades)
    total_commission = sum(t.total_commission for t in trades)
    total_gst = sum(t.gst_in_commission for t in trades)
    total_base_fee = sum(t.net_fee_excl_gst for t in trades)
    total_income_tax = sum(t.income_tax for t in trades)
    total_funding = sum(t.funding_fees for t in trades)

    # D4: use pre-computed profit_after_tax to avoid floating-point divergence
    total_profit_after_tax = sum(t.profit_after_tax for t in trades)

    # B4: Indian derivatives turnover = abs(gross_pnl) pre-fee, not net_pnl
    total_turnover = sum(abs(t.gross_pnl) for t in trades)

    return {
        "total_trades": len(trades),
        "winners": len(winners),
        "losers": len(losers),
        "win_rate": round(len(winners) / len(trades) * 100, 1),
        "total_gross_pnl": round(total_gross, 4),
        "total_commission": round(total_commission, 6),
        "total_base_fee": round(total_base_fee, 6),
        "total_gst": round(total_gst, 6),
        "total_net_pnl": round(total_net, 4),
        "total_income_tax": round(total_income_tax, 4),
        "total_profit_after_tax": round(total_profit_after_tax, 4),
        "total_funding": round(total_funding, 6),
        "avg_win": round(sum(t.net_pnl for t in winners) / len(winners), 4) if winners else 0,
        "avg_loss": round(sum(t.net_pnl for t in losers) / len(losers), 4) if losers else 0,
        "best_trade": round(max(t.net_pnl for t in trades), 4),
        "worst_trade": round(min(t.net_pnl for t in trades), 4),
        "total_turnover": round(total_turnover, 4),
    }


def apply_funding_fees(trades: list[Trade], transactions: list[dict]) -> None:
    """
    Correlate 'funding' transactions from the wallet history with matched trades.
    
    A funding fee belongs to a trade if:
    1. Its type is 'funding'
    2. Its asset matches the trade's settling_asset
    3. Its timestamp is between trade entry and exit
    """
    funding_txs = [
        tx for tx in transactions 
        if tx.get("transaction_type") == "funding"
    ]

    for tx in funding_txs:
        try:
            # Parse transaction time
            created_at = tx.get("created_at", "")
            try:
                ts = int(created_at)
                tx_time = datetime.fromtimestamp(ts / 1_000_000, tz=timezone.utc)
            except (ValueError, TypeError):
                tx_time = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
            
            tx_asset = tx.get("asset_symbol")
            tx_amount = float(tx.get("amount", 0))

            # Find trades that were open during this funding payment
            for trade in trades:
                if (
                    trade.settling_asset == tx_asset and
                    trade.entry_time <= tx_time <= trade.exit_time
                ):
                    # Note: If multiple trades for the same asset are open, 
                    # this simplified logic attributes the full funding to each.
                    # In Delta, positions are usually aggregated, so this is 
                    # mostly accurate for single-position traders.
                    trade.funding_fees += tx_amount
                    trade.calculate()
        except Exception:
            continue
