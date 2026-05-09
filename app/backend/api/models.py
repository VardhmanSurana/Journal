from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from pydantic import BaseModel, Field as PydanticField

# --- API Parsing Models ---

class APIFill(BaseModel):
    """Used for parsing the raw response from Delta Exchange API."""
    id: str
    symbol: str = PydanticField(alias="product_symbol")
    side: str
    price: float
    size: float
    commission: float
    role: str
    order_id: str
    created_at: str
    settling_asset: str = PydanticField(alias="settling_asset_symbol")
    fill_type: str = "normal"
    notional: float = 0.0
    meta: Dict[str, Any] = PydanticField(default_factory=dict, alias="meta_data")

    class Config:
        populate_by_name = True

    @property
    def timestamp(self) -> datetime:
        try:
            ts = int(self.created_at)
            return datetime.fromtimestamp(ts / 1_000_000, tz=timezone.utc)
        except (ValueError, TypeError):
            return datetime.fromisoformat(str(self.created_at).replace("Z", "+00:00"))

# --- Database Models ---

class Fill(SQLModel, table=True):
    """1. RAW FILLS TABLE - Direct exchange data. Immutable."""
    __tablename__ = "fills"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    exchange_fill_id: str = Field(unique=True, index=True)
    symbol: str
    side: str
    price: float
    size: float
    fee: float
    notional: float = 0.0 # <--- ADDED
    timestamp: datetime
    order_id: str
    
    trade_id: Optional[int] = Field(default=None, foreign_key="trades.id")
    trade: Optional["Trade"] = Relationship(back_populates="fills")

class TradeEvent(SQLModel, table=True):
    """3. TRADE EVENTS TABLE - Tracks scaling, partials, etc."""
    __tablename__ = "trade_events"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    trade_id: int = Field(foreign_key="trades.id")
    event_type: str  # ENTRY, SCALE_IN, PARTIAL_EXIT, FULL_EXIT, SL_HIT, TP_HIT
    timestamp: datetime
    price: float
    size: float
    notional: float = 0.0 # <--- ADDED
    
    trade: "Trade" = Relationship(back_populates="events")

class Trade(SQLModel, table=True):
    """2. TRADE CYCLES TABLE - Reconstructed Trades (The actual journal)."""
    __tablename__ = "trades"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str
    direction: str  # "long" | "short"
    entry_time: datetime
    exit_time: Optional[datetime] = None
    avg_entry: float = 0.0
    avg_exit: float = 0.0
    size: float = 0.0  # Max position size reached
    
    entry_notional: float = 0.0 # <--- ADDED
    exit_notional: float = 0.0  # <--- ADDED
    
    # Financials
    gross_profit: float = 0.0
    fees: float = 0.0
    gst: float = 0.0 # <--- ADDED
    net_fee: float = 0.0 # <--- ADDED (Excl. GST)
    funding_fees: float = 0.0
    net_profit: float = 0.0
    after_tax_profit: float = 0.0
    max_drawdown: float = 0.0
    
    # Analytics & Psychology
    holding_minutes: float = 0.0
    strategy: Optional[str] = None
    session: Optional[str] = None
    emotion: Optional[str] = None
    discipline_score: Optional[int] = None
    confidence_score: Optional[int] = None
    notes: Optional[str] = None
    mistakes: Optional[str] = None
    result: Optional[str] = None # "WIN", "LOSS", "BREAKEVEN"
    is_winner: bool = False
    is_open: bool = True # False when position size reaches 0
    
    # Relationships
    fills: List[Fill] = Relationship(back_populates="trade")
    events: List[TradeEvent] = Relationship(back_populates="trade")

class Screenshot(SQLModel, table=True):
    """4. SCREENSHOTS TABLE"""
    __tablename__ = "screenshots"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    trade_id: int = Field(foreign_key="trades.id")
    image_path: str
    chart_type: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DailyReview(SQLModel, table=True):
    """5. DAILY REVIEWS TABLE"""
    __tablename__ = "daily_reviews"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    date_str: str = Field(unique=True, index=True) # YYYY-MM-DD
    mood: Optional[str] = None
    discipline_score: Optional[int] = None
    mistakes: Optional[str] = None
    lessons: Optional[str] = None

# --- Frontend Data Transfer Objects ---

class DashboardSummary(BaseModel):
    total_trades: int
    winners: int
    losers: int
    win_rate: float
    total_net_pnl: float
    total_commission: float
    total_profit_after_tax: float
    best_trade: float
    worst_trade: float
    avg_win: float
    avg_loss: float
    profit_factor: float
    expectancy: float
    max_drawdown: float
    total_turnover: float
    
    cumulative_pnl: List[Dict[str, Any]] = []
    daily_pnl: List[Dict[str, Any]] = [] # [{"date": "YYYY-MM-DD", "value": ...}]
    pnl_by_symbol: List[Dict[str, Any]] = []
    wallet: List[Dict[str, Any]] = []
