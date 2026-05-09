from sqlmodel import SQLModel, create_engine, Session
from api.config import config

engine = create_engine(config.DATABASE_URL)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
