from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

engine = create_engine('sqlite:///./fairpass.db', connect_args={'check_same_thread': False, 'timeout': 30})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def upgrade_schema():
    """Safely adds missing columns to existing SQLite tables without losing data."""
    with engine.connect() as conn:
        # Check tickets table columns
        res = conn.execute(text("PRAGMA table_info(tickets);")).fetchall()
        existing_cols = {row[1] for row in res}
        
        if 'quai_status' not in existing_cols:
            conn.execute(text("ALTER TABLE tickets ADD COLUMN quai_status VARCHAR DEFAULT 'NOT_SYNCED';"))
        if 'quai_tx_hash' not in existing_cols:
            conn.execute(text("ALTER TABLE tickets ADD COLUMN quai_tx_hash VARCHAR;"))
        if 'quai_token_id' not in existing_cols:
            conn.execute(text("ALTER TABLE tickets ADD COLUMN quai_token_id INTEGER;"))
        conn.commit()
