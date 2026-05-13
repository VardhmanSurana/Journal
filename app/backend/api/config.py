import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (parent of app/backend)
# First try root .env, then fall back to local .env
possible_paths = [
    Path(__file__).parent.parent.parent / ".env",
    Path(__file__).parent.parent / ".env",
]

for env_path in possible_paths:
    if env_path.exists():
        load_dotenv(env_path, override=True)
        break

class Config:
    def __init__(self) -> None:
        self.API_KEY: str = os.getenv("DELTA_API_KEY", "")
        self.API_SECRET: str = os.getenv("DELTA_API_SECRET", "")
        self.GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
        self.REGION: str = os.getenv("DELTA_REGION", "india")
        
        # Hardcoded defaults (Removed from .env to simplify)
        self.DATABASE_URL: str = "sqlite:///./app.db"
        self.INCOME_TAX_SLAB: float = 0.30
        self.PAGE_LIMIT: int = 100
        
        # Automation & Alerts
        self.WEBHOOK_URL: str = os.getenv("WEBHOOK_URL", "")
        self.PNL_ALERT_THRESHOLD: float = float(os.getenv("PNL_ALERT_THRESHOLD", "100.0"))
        
        # Security & Compliance
        self.READ_ONLY_KEY: str = os.getenv("DELTA_READ_ONLY_KEY", self.API_KEY)
        self.READ_ONLY_SECRET: str = os.getenv("DELTA_READ_ONLY_SECRET", self.API_SECRET)
        self.SAFE_MODE: bool = os.getenv("SAFE_MODE", "true").lower() == "true"
        self.DEADMAN_SWITCH_ENABLED: bool = os.getenv("DEADMAN_SWITCH_ENABLED", "false").lower() == "true"
        
        # External APIs (Kept as requested)
        self.CRYPTOCOMPARE_API_KEY: str = os.getenv("CRYPTOCOMPARE_API_KEY", "")

    @property
    def base_url(self) -> str:
        if self.REGION == "india":
            return "https://api.india.delta.exchange/v2"
        return "https://api.delta.exchange/v2"

config = Config()
