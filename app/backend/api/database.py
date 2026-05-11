from sqlmodel import SQLModel, create_engine, Session, text
from api.config import config
import sqlite3

engine = create_engine(config.DATABASE_URL)

def init_db():
    # Create new tables (like price_alerts)
    SQLModel.metadata.create_all(engine)
    
    # Handle migrations for existing tables
    # SQLite doesn't support 'ADD COLUMN IF NOT EXISTS' directly in a clean way
    # so we'll check for column existence and add them manually.
    
    db_path = config.DATABASE_URL.replace("sqlite:///", "")
    if not db_path.startswith("/"):
        import os
        db_path = os.path.join(os.getcwd(), db_path)

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Check trades table columns
        cursor.execute("PRAGMA table_info(trades)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add missing columns one by one.
        # We use hardcoded ALTER TABLE statements to avoid dynamic SQL construction.
        migrations = [
            ("pre_plan", "ALTER TABLE trades ADD COLUMN pre_plan TEXT"),
            ("risk_pct", "ALTER TABLE trades ADD COLUMN risk_pct REAL DEFAULT 0"),
            ("actual_risk_pct", "ALTER TABLE trades ADD COLUMN actual_risk_pct REAL DEFAULT 0"),
            ("stop_loss", "ALTER TABLE trades ADD COLUMN stop_loss REAL DEFAULT 0"),
            ("take_profit", "ALTER TABLE trades ADD COLUMN take_profit REAL DEFAULT 0")
        ]
        
        for col_name, query in migrations:
            if col_name not in columns:
                print(f"Migrating: Adding column {col_name} to trades table...")
                cursor.execute(query)
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Migration error: {e}")

def get_session():
    with Session(engine) as session:
        yield session
