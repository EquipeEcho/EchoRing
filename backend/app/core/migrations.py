"""Versioned, additive migrations for the portal API."""

from pathlib import Path

from sqlalchemy import insert, select

from app.db_models import SchemaMigration

MIGRATIONS = ('001_job_offers', '002_translation_workflows', '003_multilingual')
MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / 'migrations'


def apply_migrations(session):
    """Aplica, na ordem, as migrações .sql que ainda não constam em schema_migrations."""
    connection = session.connection()
    SchemaMigration.__table__.create(connection, checkfirst=True)
    for version in MIGRATIONS:
        applied = session.execute(
            select(SchemaMigration.version).where(SchemaMigration.version == version)
        ).first()
        if applied:
            continue
        # Os .sql têm vários comandos (DDL e UPDATE); rodam como script, na mesma transação.
        connection.exec_driver_sql((MIGRATIONS_DIR / (version + '.sql')).read_text(encoding='utf-8'))
        session.execute(insert(SchemaMigration).values(version=version))