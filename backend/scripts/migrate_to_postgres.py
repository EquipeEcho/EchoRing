"""Importa uma única vez os dados do SQLite antigo para o PostgreSQL."""

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import Boolean, DateTime, insert, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

from app.database_pg import database, now, to_datetime
from app.db_models import (
    AuthSession,
    Delivery,
    LegacyMigration,
    Service,
    TranslationRequest,
    User,
    WorkflowEvent,
)

TABLE_COLUMNS = {
    'users': ('id', 'email', 'name', 'role', 'password_hash', 'active'),
    'sessions': ('digest', 'expires', 'user_id'),
    'services': (
        'id',
        'request_id',
        'title',
        'translator_id',
        'status',
        'deadline',
        'created_at',
        'observations',
        'source',
        'target',
        'updated_at',
        'started_at',
        'ready_at',
        'delivered_at',
        'sending',
    ),
    'deliveries': (
        'id',
        'service_id',
        'version',
        'translator_id',
        'name',
        'media_type',
        'size',
        'content',
        'status',
        'feedback',
        'submitted_at',
        'reviewed_at',
        'reviewed_by',
    ),
}
TABLE_MODELS = {'sessions': AuthSession, 'services': Service, 'deliveries': Delivery}


def sqlite_columns(connection, table):
    """Lê as colunas existentes porque bancos antigos podem ter estruturas diferentes."""
    return {row['name'] for row in connection.execute(f'PRAGMA table_info({table})')}


def sqlite_tables(connection):
    """Lista as tabelas disponíveis no arquivo SQLite recebido."""
    return {row['name'] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}


def values_for(row, columns, available):
    """Monta uma linha compatível e completa campos que não existiam em versões antigas."""
    defaults = {
        'active': 1,
        'sending': 0,
        'observations': '',
        'source': '',
        'target': '',
        'updated_at': None,
        'started_at': None,
        'ready_at': None,
        'delivered_at': None,
        'user_id': None,
    }
    return tuple(row[column] if column in available else defaults.get(column) for column in columns)


def postgres_values(model, row, columns, available):
    """Converte os tipos do SQLite antes de gravar nas colunas PostgreSQL."""
    values = dict(zip(columns, values_for(row, columns, available)))
    for column, value in values.items():
        column_type = model.__table__.c[column].type
        if isinstance(column_type, DateTime):
            values[column] = to_datetime(value)
        elif isinstance(column_type, Boolean):
            values[column] = bool(value)
    return values


def import_legacy(sqlite_path):
    """Copia as tabelas conhecidas sem repetir uma migração já registrada."""
    source = sqlite3.connect(sqlite_path)
    source.row_factory = sqlite3.Row
    source_key = hashlib.sha256(str(sqlite_path.resolve()).encode()).hexdigest()
    counts = {}
    try:
        tables = sqlite_tables(source)
        with database() as session:
            LegacyMigration.__table__.create(session.connection(), checkfirst=True)
            if (
                session.execute(select(LegacyMigration.source_key).where(LegacyMigration.source_key == source_key))
                .mappings()
                .first()
            ):
                return {'alreadyMigrated': True, 'counts': {}}

            # Usuários e solicitações precisam de ajustes próprios antes de entrar no PostgreSQL.
            if 'users' in tables:
                columns = TABLE_COLUMNS['users']
                available = sqlite_columns(source, 'users')
                rows = source.execute('SELECT * FROM users').fetchall()
                for row in rows:
                    session.execute(
                        pg_insert(User)
                        .values(**postgres_values(User, row, columns, available))
                        .on_conflict_do_nothing(index_elements=[User.id])
                    )
                counts['users'] = len(rows)

            if 'requests' in tables:
                rows = source.execute('SELECT * FROM requests').fetchall()
                for row in rows:
                    data = json.loads(row['data'])
                    session.execute(
                        pg_insert(TranslationRequest)
                        .values(
                            id=row['id'],
                            data=data,
                            sending=bool(row['sending']),
                            created_at=to_datetime(data.get('createdAt') or now()),
                        )
                        .on_conflict_do_nothing(index_elements=[TranslationRequest.id])
                    )
                counts['requests'] = len(rows)

            # Estas tabelas têm estrutura equivalente e podem seguir o mesmo fluxo de cópia.
            for table in ('sessions', 'services', 'deliveries'):
                if table not in tables:
                    continue
                columns = TABLE_COLUMNS[table]
                available = sqlite_columns(source, table)
                rows = source.execute(f'SELECT * FROM {table}').fetchall()
                model = TABLE_MODELS[table]
                for row in rows:
                    session.execute(
                        pg_insert(model)
                        .values(**postgres_values(model, row, columns, available))
                        .on_conflict_do_nothing()
                    )
                counts[table] = len(rows)

            # Os ids do histórico são recriados pelo PostgreSQL para manter sua sequência local.
            if 'workflow_events' in tables:
                columns = ('request_id', 'service_id', 'status', 'note', 'actor_id', 'actor_name', 'created_at')
                available = sqlite_columns(source, 'workflow_events')
                rows = source.execute('SELECT * FROM workflow_events ORDER BY id').fetchall()
                for row in rows:
                    session.execute(
                        insert(WorkflowEvent).values(**postgres_values(WorkflowEvent, row, columns, available))
                    )
                counts['workflow_events'] = len(rows)

            # O caminho vira uma chave estável para o mesmo arquivo não ser importado duas vezes.
            session.execute(
                insert(LegacyMigration).values(source_key=source_key, source_path=str(sqlite_path.resolve()))
            )
    finally:
        source.close()
    return {'alreadyMigrated': False, 'counts': counts}


def main():
    """Lê o caminho informado, executa a importação e mostra um resumo no terminal."""
    parser = argparse.ArgumentParser(description='Importa o SQLite legado no PostgreSQL configurado no .env.')
    parser.add_argument('--sqlite-path', default='.local/requests.sqlite3')
    args = parser.parse_args()
    path = Path(args.sqlite_path)
    if not path.is_file():
        raise SystemExit(f'Arquivo SQLite não encontrado: {path}')
    result = import_legacy(path)
    if result['alreadyMigrated']:
        print('Este arquivo SQLite já foi migrado; nenhuma alteração foi feita.')
    else:
        summary = (
            ', '.join(f'{table}={count}' for table, count in result['counts'].items()) or 'nenhuma tabela compatível'
        )
        print(f'Migração concluída: {summary}.')


if __name__ == '__main__':
    main()
