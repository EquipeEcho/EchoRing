"""PostgreSQL transactions, schema initialization and shared database values."""
import json
import os
import re
from contextlib import contextmanager
from datetime import datetime, timezone
import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict
from psycopg.rows import dict_row

MAX_DELIVERY_BYTES = 5 * 1024 * 1024
MAX_DELIVERY_FILES = 10
MAX_DELIVERY_TOTAL_BYTES = 20 * 1024 * 1024


def environment_flag(name: str) -> bool:
    """Converte uma variável de ambiente comum em uma opção booleana."""
    return os.getenv(name, '').strip().lower() in {'1', 'true', 'yes', 'on'}


def postgres_schema():
    """Retorna o schema configurado e bloqueia nomes que poderiam alterar o SQL."""
    schema = os.getenv('POSTGRES_SCHEMA', 'public').strip() or 'public'
    if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', schema):
        raise RuntimeError('POSTGRES_SCHEMA deve ser um identificador PostgreSQL válido.')
    return schema


def postgres_connection():
    """Abre a conexão usando DATABASE_URL ou as variáveis separadas do PostgreSQL."""
    database_url = os.getenv('DATABASE_URL', '').strip()
    if database_url:
        settings = conninfo_to_dict(database_url)
        host_override = os.getenv('POSTGRES_HOST', '').strip()
        if host_override:
            settings['host'] = host_override
        return psycopg.connect(**settings, row_factory=dict_row)
    settings = {
        'host': os.getenv('POSTGRES_HOST', 'localhost'),
        'port': int(os.getenv('POSTGRES_PORT', '5432')),
        'dbname': os.getenv('POSTGRES_DB', 'api5_relacional'),
        'user': os.getenv('POSTGRES_USER', ''),
        'password': os.getenv('POSTGRES_PASSWORD', ''),
    }
    if not settings['user'] or not settings['password']:
        raise RuntimeError('Configure DATABASE_URL ou POSTGRES_USER e POSTGRES_PASSWORD.')
    return psycopg.connect(**settings, row_factory=dict_row)


class DatabaseConnection:
    """Mantém os placeholders antigos da API sem abrir mão dos parâmetros do Psycopg."""

    def __init__(self, connection):
        """Guarda a conexão real usada para executar as consultas adaptadas."""
        self.connection = connection

    def execute(self, query, parameters=()):
        """Adapta o placeholder `?` para `%s` antes de executar a consulta."""
        return self.connection.execute(query.replace('?', '%s'), parameters)


def initialize_schema(connection, schema):
    """Cria as tabelas e os índices necessários caso o banco ainda esteja vazio."""
    connection.execute(sql.SQL('CREATE SCHEMA IF NOT EXISTS {}').format(sql.Identifier(schema)))
    connection.execute(sql.SQL('SET LOCAL search_path TO {}').format(sql.Identifier(schema)))
    connection.execute('''CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY, data JSONB NOT NULL, sending BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )''')
    connection.execute('''CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        role TEXT NOT NULL, password_hash TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE
    )''')
    # Existing accounts keep their access; only newly invited translators require onboarding.
    connection.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_required BOOLEAN NOT NULL DEFAULT FALSE')
    connection.execute('''CREATE TABLE IF NOT EXISTS translator_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb, completed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )''')
    connection.execute('''CREATE TABLE IF NOT EXISTS sessions (
        digest TEXT PRIMARY KEY, expires DOUBLE PRECISION NOT NULL, user_id TEXT
    )''')
    connection.execute('''CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY, request_id TEXT, title TEXT NOT NULL, translator_id TEXT NOT NULL,
        status TEXT NOT NULL, deadline TEXT, created_at TIMESTAMPTZ NOT NULL,
        observations TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '',
        target TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ, started_at TIMESTAMPTZ,
        ready_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, sending BOOLEAN NOT NULL DEFAULT FALSE
    )''')
    connection.execute('''CREATE TABLE IF NOT EXISTS deliveries (
        id TEXT PRIMARY KEY, service_id TEXT NOT NULL, version INTEGER NOT NULL,
        translator_id TEXT NOT NULL, name TEXT NOT NULL, media_type TEXT NOT NULL,
        size INTEGER NOT NULL, content BYTEA NOT NULL, status TEXT NOT NULL,
        feedback TEXT, submitted_at TIMESTAMPTZ NOT NULL, reviewed_at TIMESTAMPTZ, reviewed_by TEXT,
        files JSONB NOT NULL DEFAULT '[]'::jsonb,
        UNIQUE(service_id, version)
    )''')
    connection.execute("ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS files JSONB NOT NULL DEFAULT '[]'::jsonb")
    connection.execute('''CREATE TABLE IF NOT EXISTS delivery_files (
        delivery_id TEXT NOT NULL, position INTEGER NOT NULL,
        name TEXT NOT NULL, media_type TEXT NOT NULL,
        size INTEGER NOT NULL, content BYTEA NOT NULL,
        PRIMARY KEY (delivery_id, position)
    )''')
    connection.execute('''CREATE TABLE IF NOT EXISTS workflow_events (
        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, request_id TEXT, service_id TEXT,
        status TEXT NOT NULL, note TEXT, actor_id TEXT, actor_name TEXT,
        created_at TIMESTAMPTZ NOT NULL
    )''')
    connection.execute('CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions (user_id)')
    connection.execute('CREATE INDEX IF NOT EXISTS services_translator_id ON services (translator_id)')
    connection.execute('CREATE UNIQUE INDEX IF NOT EXISTS services_request_id ON services (request_id) WHERE request_id IS NOT NULL')
    connection.execute('CREATE INDEX IF NOT EXISTS deliveries_service_id ON deliveries (service_id, version)')
    connection.execute('CREATE INDEX IF NOT EXISTS deliveries_status ON deliveries (status, submitted_at)')
    connection.execute('CREATE INDEX IF NOT EXISTS delivery_files_delivery_id ON delivery_files (delivery_id, position)')
    connection.execute('CREATE INDEX IF NOT EXISTS workflow_events_request ON workflow_events (request_id, created_at)')
    connection.execute('CREATE INDEX IF NOT EXISTS workflow_events_service ON workflow_events (service_id, created_at)')
    from app.core.migrations import apply_migrations
    apply_migrations(connection)


@contextmanager
def database():
    """Controla a transação: confirma no sucesso e desfaz tudo quando ocorre um erro."""
    connection = postgres_connection()
    schema = postgres_schema()
    try:
        initialize_schema(connection, schema)
        yield DatabaseConnection(connection)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def now():
    """Gera datas em UTC no mesmo formato usado nos registros e nas respostas."""
    return datetime.now(timezone.utc).isoformat()


def json_data(value):
    """Normaliza o JSONB, que pode chegar do driver como dicionário ou texto."""
    return value if isinstance(value, dict) else json.loads(value)
