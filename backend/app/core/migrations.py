"""Versioned, additive migrations for the portal API."""

from pathlib import Path


def apply_migrations(connection):
    connection.execute('''CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )''')
    for version in ('001_job_offers', '002_translation_workflows'):
        if not connection.execute('SELECT 1 FROM schema_migrations WHERE version = %s', (version,)).fetchone():
            migration = Path(__file__).resolve().parents[2] / 'migrations' / (version + '.sql')
            connection.execute(migration.read_text(encoding='utf-8'))
            connection.execute('INSERT INTO schema_migrations (version) VALUES (%s)', (version,))
