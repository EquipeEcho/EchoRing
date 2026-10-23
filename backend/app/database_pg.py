"""PostgreSQL via SQLAlchemy: engine, sessões, criação do schema e utilidades gerais."""

import json
import os
import re
import threading
from contextlib import contextmanager
from datetime import datetime, timezone

from psycopg.conninfo import conninfo_to_dict
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, Engine
from sqlalchemy.orm import Session

from app.db_models import Base

MAX_DELIVERY_BYTES = 5 * 1024 * 1024
DRIVER = 'postgresql+psycopg'

# Colunas adicionadas depois da primeira versão do banco. Bancos novos já nascem com elas
# pelo create_all; este atalho só atualiza bancos antigos (o ideal futuro é usar Alembic).
LEGACY_COLUMNS = (
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_required BOOLEAN NOT NULL DEFAULT FALSE',
    "ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS files JSONB NOT NULL DEFAULT '[]'::jsonb",
)

_engines: dict[str, Engine] = {}
_ready_schemas: set[tuple[str, str]] = set()
_lock = threading.Lock()


def environment_flag(name: str) -> bool:
    return os.getenv(name, '').strip().lower() in {'1', 'true', 'yes', 'on'}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def to_datetime(value):
    """Converte o texto ISO (usado no JSON das solicitações) em datetime para colunas TIMESTAMPTZ."""
    if value is None or isinstance(value, datetime):
        return value
    text_value = str(value).strip()
    if text_value.endswith('Z'):
        text_value = text_value[:-1] + '+00:00'
    parsed = datetime.fromisoformat(text_value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def json_data(value):
    return value if isinstance(value, dict) else json.loads(value)


def postgres_schema() -> str:
    schema = os.getenv('POSTGRES_SCHEMA', 'public').strip() or 'public'
    if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', schema):
        raise RuntimeError('POSTGRES_SCHEMA deve ser um identificador PostgreSQL válido.')
    return schema


def database_url() -> URL:
    """Monta a URL do SQLAlchemy a partir de DATABASE_URL ou das variáveis POSTGRES_*."""
    raw_url = os.getenv('DATABASE_URL', '').strip()
    if raw_url:
        settings = conninfo_to_dict(raw_url)
        host_override = os.getenv('POSTGRES_HOST', '').strip()
        if host_override:
            settings['host'] = host_override
    else:
        settings = {
            'host': os.getenv('POSTGRES_HOST', 'localhost'),
            'port': os.getenv('POSTGRES_PORT', '5432'),
            'dbname': os.getenv('POSTGRES_DB', 'api5_relacional'),
            'user': os.getenv('POSTGRES_USER', ''),
            'password': os.getenv('POSTGRES_PASSWORD', ''),
        }
        if not settings['user'] or not settings['password']:
            raise RuntimeError('Configure DATABASE_URL ou POSTGRES_USER e POSTGRES_PASSWORD.')
    port = settings.pop('port', None)
    return URL.create(
        DRIVER,
        username=settings.pop('user', None) or None,
        password=settings.pop('password', None) or None,
        host=settings.pop('host', None) or None,
        port=int(port) if port else None,
        database=settings.pop('dbname', None) or None,
        query={key: str(value) for key, value in settings.items()},  # sslmode etc.
    )


def get_engine() -> Engine:
    url = database_url()
    key = url.render_as_string(hide_password=False)
    with _lock:
        engine = _engines.get(key)
        if engine is None:
            engine = create_engine(url, pool_pre_ping=True)
            _engines[key] = engine
        return engine


def _quoted(schema: str) -> str:
    # O nome já foi validado por postgres_schema(), então aspas duplas bastam.
    return '"' + schema + '"'


def initialize_schema(engine: Engine, schema: str):
    """Cria schema, tabelas e índices uma vez por processo, em transação própria já confirmada."""
    key = (engine.url.render_as_string(hide_password=False), schema)
    if key in _ready_schemas:
        return
    with _lock:
        if key in _ready_schemas:
            return
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS {_quoted(schema)}'))
            connection.execute(text(f'SET LOCAL search_path TO {_quoted(schema)}'))
            Base.metadata.create_all(connection)
            for statement in LEGACY_COLUMNS:
                connection.execute(text(statement))
        _ready_schemas.add(key)


@contextmanager
def database():
    """Entrega uma Session do SQLAlchemy; confirma ao sair e desfaz se houver exceção."""
    engine = get_engine()
    schema = postgres_schema()
    initialize_schema(engine, schema)
    session = Session(engine, expire_on_commit=False)
    try:
        session.execute(text(f'SET LOCAL search_path TO {_quoted(schema)}'))
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()