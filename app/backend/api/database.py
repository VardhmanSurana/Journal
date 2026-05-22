from sqlmodel import SQLModel, create_engine, Session, text
from api.config import config
import sqlite3
import api.models # Ensure models are registered for create_all

engine = create_engine(
    config.DATABASE_URL, 
    connect_args={"check_same_thread": False, "timeout": 30.0}
)

def init_db():
    # Enable WAL mode for better concurrency
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
        conn.commit()
    
    # Create new tables (like price_alerts)
    SQLModel.metadata.create_all(engine)
    
    # Automatic dynamic migration engine
    # Compares SQLModel class definitions with SQLite table structures and adds missing columns automatically
    db_path = config.DATABASE_URL.replace("sqlite:///", "")
    if not db_path.startswith("/"):
        import os
        db_path = os.path.join(os.getcwd(), db_path)

    try:
        conn = sqlite3.connect(db_path, timeout=30.0)
        # Force WAL mode for direct sqlite3 connections too
        conn.execute("PRAGMA journal_mode=WAL")
        cursor = conn.cursor()
        
        # Inspect and align all defined SQLModel tables
        for table_name, table in SQLModel.metadata.tables.items():
            # Check if table exists in SQLite database
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
            if not cursor.fetchone():
                continue
                
            cursor.execute(f"PRAGMA table_info({table_name})")
            existing_cols = {row[1] for row in cursor.fetchall()}
            
            for column in table.columns:
                if column.name not in existing_cols:
                    col_type = str(column.type).upper()
                    # Resolve appropriate SQLite types
                    if "VARCHAR" in col_type or "TEXT" in col_type:
                        sqlite_type = "TEXT"
                    elif "INTEGER" in col_type:
                        sqlite_type = "INTEGER"
                    elif "FLOAT" in col_type or "REAL" in col_type or "DECIMAL" in col_type:
                        sqlite_type = "REAL"
                    elif "BOOLEAN" in col_type:
                        sqlite_type = "INTEGER"
                    else:
                        sqlite_type = "TEXT"
                        
                    # Handle defaults safely
                    default_str = ""
                    if column.default is not None and hasattr(column.default, 'arg'):
                        default_val = column.default.arg
                        if isinstance(default_val, (int, float)):
                            default_str = f" DEFAULT {default_val}"
                        elif isinstance(default_val, str):
                            default_str = f" DEFAULT '{default_val}'"
                        elif isinstance(default_val, bool):
                            default_str = f" DEFAULT {1 if default_val else 0}"
                            
                    alter_query = f"ALTER TABLE {table_name} ADD COLUMN {column.name} {sqlite_type}{default_str}"
                    print(f"Migration: Adding missing column {column.name} ({sqlite_type}) to table {table_name}...")
                    cursor.execute(alter_query)
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Migration error: {e}")

def get_session():
    with Session(engine) as session:
        yield session
