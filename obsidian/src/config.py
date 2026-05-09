"""
Configuration — loads .env and exposes typed settings.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    @staticmethod
    def _detect_vault() -> Path:
        """Detect default Obsidian vault location based on OS."""
        home = Path.home()
        candidates = [
            # 1. Check for TradingJournal specifically in standard locations
            home / "Documents" / "Obsidian Vault" / "TradingJournal",
            home / "Documents" / "TradingJournal",
            home / "Obsidian" / "TradingJournal",
            # 2. Check for general Obsidian Vault
            home / "Documents" / "Obsidian Vault",
            # 3. Fallback to current directory vault
            Path("./vault"),
        ]

        for p in candidates:
            if p.exists():
                return p
        return Path("./vault")

    def __init__(self) -> None:
        self.API_KEY: str = os.getenv("DELTA_API_KEY", "")
        self.API_SECRET: str = os.getenv("DELTA_API_SECRET", "")
        self.GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
        
        # Vertex AI settings
        self.USE_VERTEX_AI: bool = os.getenv("USE_VERTEX_AI", "false").lower() == "true"
        self.VERTEX_PROJECT_ID: str = os.getenv("VERTEX_PROJECT_ID", "")
        self.VERTEX_LOCATION: str = os.getenv("VERTEX_LOCATION", "us-central1")
        self.VERTEX_MODEL: str = os.getenv("VERTEX_MODEL", "gemini-1.5-flash")

        self.REGION: str = os.getenv("DELTA_REGION", "india")

        # Detection logic: Use .env if provided, otherwise auto-detect
        env_vault = os.getenv("VAULT_PATH")
        self.VAULT_PATH: Path = Path(env_vault) if env_vault else self._detect_vault()

        # VAULT_SUBDIR: subfolder name inside the vault root (e.g. "TradingJournal").
        # Leave empty if your vault root IS the TradingJournal folder.
        self.VAULT_SUBDIR: str = os.getenv("VAULT_SUBDIR", "")

        # Your personal income tax slab rate (crypto futures = speculative business income).
        # Common slabs: 0.05 (5%), 0.10, 0.15, 0.20, 0.30
        # NOT 30% flat — that only applies to VDA spot transfers.
        self.INCOME_TAX_SLAB: float = float(os.getenv("INCOME_TAX_SLAB", "0.30"))

        # 18% GST is charged on trading fees by Delta Exchange.
        # The API commission field ALREADY includes GST — this rate is for display breakdown only.
        self.GST_RATE: float = 0.18

        self.PAGE_LIMIT: int = int(os.getenv("PAGE_LIMIT", "100"))

    @property
    def base_url(self) -> str:
        if self.REGION == "india":
            return "https://api.india.delta.exchange/v2"
        return "https://api.delta.exchange/v2"

    def query_path(self, folder: str) -> str:
        """Return vault-relative path for Dataview/Tracker queries."""
        if self.VAULT_SUBDIR:
            return f"{self.VAULT_SUBDIR}/{folder}"
        return folder

    def validate(self) -> None:
        if not self.API_KEY or not self.API_SECRET:
            raise ValueError(
                "DELTA_API_KEY and DELTA_API_SECRET must be set in .env"
            )
        if not self.VAULT_PATH.exists():
            raise ValueError(
                f"Vault path does not exist: {self.VAULT_PATH}\n"
                "Create the folder or update VAULT_PATH in .env"
            )


config = Config()
