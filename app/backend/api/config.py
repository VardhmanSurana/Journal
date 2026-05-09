import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Config:
    def __init__(self) -> None:
        self.API_KEY: str = os.getenv("DELTA_API_KEY", "")
        self.API_SECRET: str = os.getenv("DELTA_API_SECRET", "")
        self.GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
        self.REGION: str = os.getenv("DELTA_REGION", "india")
        
        # Vertex AI settings
        self.USE_VERTEX_AI: bool = os.getenv("USE_VERTEX_AI", "false").lower() == "true"
        self.VERTEX_PROJECT_ID: str = os.getenv("VERTEX_PROJECT_ID", "")
        self.VERTEX_LOCATION: str = os.getenv("VERTEX_LOCATION", "us-central1")
        self.VERTEX_MODEL: str = os.getenv("VERTEX_MODEL", "gemini-1.5-flash")

        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
        self.INCOME_TAX_SLAB: float = float(os.getenv("INCOME_TAX_SLAB", "0.30"))
        self.PAGE_LIMIT: int = int(os.getenv("PAGE_LIMIT", "100"))

    @property
    def base_url(self) -> str:
        if self.REGION == "india":
            return "https://api.india.delta.exchange/v2"
        return "https://api.delta.exchange/v2"

config = Config()
