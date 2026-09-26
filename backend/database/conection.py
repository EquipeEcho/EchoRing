import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from motor.motor_asyncio import AsyncIOMotorClient

# 1. Configuração do PostgreSQL (SQLAlchemy)
POSTGRES_URL = os.getenv(
    "POSTGRES_URL", 
    "postgresql+psycopg2://user:password@postgres_db:5432/mydb"
)

engine = create_engine(POSTGRES_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_postgres_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 2. Configuração do MongoDB (Motor - Assíncrono)
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo_db:27017")
mongo_client = AsyncIOMotorClient(MONGO_URL)
mongo_db = mongo_client.mydb  # Nome do banco de dados

def get_mongo_db():
    return mongo_db