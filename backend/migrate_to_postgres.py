"""One-time, idempotent import from the legacy database into PostgreSQL."""

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

from dotenv import load_dotenv
from psycopg.types.json import Jsonb

load_dotenv(Path(__file__).with_name('.env'))

from requests_api import database, now


TABLE_COLUMNS = {
    'users': ('id', 'email', 'name', 'role', 'password_hash', 'active'),
    'sessions': ('digest', 'expires', 'user_id'),
    'services': (
        'id', 'request_id', 'title', 'translator_id', 'status', 'deadline', 'created_at',
        'observations', 'source', 'target', 'updated_at', 'started_at', 'ready_at',
        'delivered_at', 'sending',
    ),
    'deliveries': (
        'id', 'service_id', 'version', 'translator_id', 'name', 'media_type', 'size',
        'content', 'status', 'feedback', 'submitted_at', 'reviewed_at', 'reviewed_by',
    ),
}


def sqlite_columns(connection, table):
    return {row['name'] for row in connection.execute(f'PRAGMA table_info({table})')}


def sqlite_tables(connection):
    return {row['name'] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}


def values_for(row, columns, available):
    defaults = {
        'active': 1, 'sending': 0, 'observations': '', 'source': '', 'target': '',
        'updated_at': None, 'started_at': None, 'ready_at': None, 'delivered_at': None,
        'user_id': None,
    }
    return tuple(row[column] if column in available else defaults.get(column) for column in columns)


def import_legacy(sqlite_path):
    source = sqlite3.connect(sqlite_path)
    source.row_factory = sqlite3.Row
    source_key = hashlib.sha256(str(sqlite_path.resolve()).encode()).hexdigest()
    counts = {}
    try:
        tables = sqlite_tables(source)
        with database() as target:
            target.execute('''CREATE TABLE IF NOT EXISTS legacy_migrations (
                source_key TEXT PRIMARY KEY, source_path TEXT NOT NULL, migrated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )''')
            if target.execute('SELECT 1 FROM legacy_migrations WHERE source_key = ?', (source_key,)).fetchone():
                return {'alreadyMigrated': True, 'counts': {}}

            if 'users' in tables:
                columns = TABLE_COLUMNS['users']
                available = sqlite_columns(source, 'users')
                rows = source.execute('SELECT * FROM users').fetchall()
                for row in rows:
                    values = list(values_for(row, columns, available))
                    values[-1] = bool(values[-1])
                    target.execute(
                        '''INSERT INTO users (id, email, name, role, password_hash, active)
                           VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING''', tuple(values),
                    )
                counts['users'] = len(rows)

            if 'requests' in tables:
                rows = source.execute('SELECT * FROM requests').fetchall()
                for row in rows:
                    data = json.loads(row['data'])
                    target.execute(
                        '''INSERT INTO requests (id, data, sending, created_at) VALUES (?, ?, ?, ?)
                           ON CONFLICT (id) DO NOTHING''',
                        (row['id'], Jsonb(data), bool(row['sending']), data.get('createdAt') or now()),
                    )
                counts['requests'] = len(rows)

            for table in ('sessions', 'services', 'deliveries'):
                if table not in tables:
                    continue
                columns = TABLE_COLUMNS[table]
                available = sqlite_columns(source, table)
                rows = source.execute(f'SELECT * FROM {table}').fetchall()
                placeholders = ', '.join('?' for _ in columns)
                for row in rows:
                    values = list(values_for(row, columns, available))
                    if table == 'services':
                        values[-1] = bool(values[-1])
                    target.execute(
                        f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders}) ON CONFLICT DO NOTHING",
                        tuple(values),
                    )
                counts[table] = len(rows)

            if 'workflow_events' in tables:
                columns = ('request_id', 'service_id', 'status', 'note', 'actor_id', 'actor_name', 'created_at')
                available = sqlite_columns(source, 'workflow_events')
                rows = source.execute('SELECT * FROM workflow_events ORDER BY id').fetchall()
                for row in rows:
                    target.execute(
                        '''INSERT INTO workflow_events
                           (request_id, service_id, status, note, actor_id, actor_name, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?)''',
                        values_for(row, columns, available),
                    )
                counts['workflow_events'] = len(rows)

            target.execute(
                'INSERT INTO legacy_migrations (source_key, source_path) VALUES (?, ?)',
                (source_key, str(sqlite_path.resolve())),
            )
    finally:
        source.close()
    return {'alreadyMigrated': False, 'counts': counts}


def main():
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
        summary = ', '.join(f'{table}={count}' for table, count in result['counts'].items()) or 'nenhuma tabela compatível'
        print(f'Migração concluída: {summary}.')


if __name__ == '__main__':
    main()
