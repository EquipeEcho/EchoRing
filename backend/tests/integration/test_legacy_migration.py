"""Real PostgreSQL coverage for legacy import types, idempotence and rollback."""

import json
import os
import unittest
import uuid
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from sqlalchemy import (
    Column,
    Float,
    Integer,
    LargeBinary,
    MetaData,
    Table,
    Text,
    create_engine,
    func,
    insert,
    select,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.schema import DropSchema

from app.database_pg import database, get_engine, to_datetime
from app.db_models import (
    AuthSession,
    Delivery,
    LegacyMigration,
    Service,
    TranslationRequest,
    User,
    WorkflowEvent,
)
from scripts.migrate_to_postgres import TABLE_COLUMNS, import_legacy


class LegacyMigrationTests(unittest.TestCase):
    def setUp(self):
        self.schema = 'test_' + uuid.uuid4().hex
        environment = patch.dict(os.environ, {'POSTGRES_SCHEMA': self.schema})
        environment.start()
        self.addCleanup(environment.stop)
        self.addCleanup(self.drop_schema)
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name) / 'legacy.sqlite3'
        self.source = create_engine('sqlite:///' + self.path.as_posix())
        self.addCleanup(self.source.dispose)
        metadata = MetaData()
        columns = {
            **TABLE_COLUMNS,
            'requests': ('id', 'data', 'sending'),
            'workflow_events': (
                'id',
                'request_id',
                'service_id',
                'status',
                'note',
                'actor_id',
                'actor_name',
                'created_at',
            ),
        }
        self.tables = {}
        for name, names in columns.items():

            def column_type(column):
                if column in ('active', 'sending', 'version', 'size') or (name == 'workflow_events' and column == 'id'):
                    return Integer()
                if column == 'expires':
                    return Float()
                return LargeBinary() if column == 'content' else Text()

            self.tables[name] = Table(name, metadata, *(Column(column, column_type(column)) for column in names))
        self.timestamp = '2026-10-01T09:30:00Z'
        self.record = {'id': 'legacy-request', 'title': 'Legacy manual', 'createdAt': self.timestamp}
        with self.source.begin() as connection:
            for table in self.tables.values():
                table.create(connection)
            connection.execute(
                insert(self.tables['users']).values(
                    id='legacy-user',
                    email='legacy@example.test',
                    name='Legacy translator',
                    role='translator',
                    password_hash='legacy-hash',
                    active=1,
                )
            )
            connection.execute(
                insert(self.tables['requests']).values(id='legacy-request', data=json.dumps(self.record), sending=0)
            )
            connection.execute(
                insert(self.tables['sessions']).values(digest='legacy-digest', expires=123.5, user_id='legacy-user')
            )
            connection.execute(
                insert(self.tables['services']).values(
                    id='legacy-service',
                    request_id='legacy-request',
                    title='Legacy manual',
                    translator_id='legacy-user',
                    status='Entregue',
                    deadline='2026-10-10',
                    observations='',
                    source='English',
                    target='Portuguese',
                    sending=0,
                    created_at='2026-10-01T09:30:00',
                    updated_at=self.timestamp,
                    started_at=self.timestamp,
                    ready_at=self.timestamp,
                    delivered_at=self.timestamp,
                )
            )
            connection.execute(
                insert(self.tables['deliveries']).values(
                    id='legacy-delivery',
                    service_id='legacy-service',
                    version=1,
                    translator_id='legacy-user',
                    name='translation.txt',
                    media_type='text/plain',
                    size=4,
                    content=b'text',
                    status='Entregue',
                    submitted_at=self.timestamp,
                    reviewed_at=self.timestamp,
                    reviewed_by='legacy-user',
                )
            )
            for event_id, status in ((10, 'Recebido'), (20, 'Entregue')):
                connection.execute(
                    insert(self.tables['workflow_events']).values(
                        id=event_id,
                        request_id='legacy-request',
                        service_id='legacy-service',
                        status=status,
                        actor_id='legacy-user',
                        actor_name='Legacy translator',
                        created_at=self.timestamp,
                    )
                )

    def drop_schema(self):
        engine = get_engine()
        with engine.begin() as connection:
            connection.execute(DropSchema(self.schema, cascade=True, if_exists=True))
        engine.dispose()

    def test_import_preserves_types_documents_event_order_and_is_idempotent(self):
        result = import_legacy(self.path)
        self.assertEqual(
            result,
            {
                'alreadyMigrated': False,
                'counts': {
                    'users': 1,
                    'requests': 1,
                    'sessions': 1,
                    'services': 1,
                    'deliveries': 1,
                    'workflow_events': 2,
                },
            },
        )
        with database() as session:
            user = session.execute(select(User.__table__)).mappings().first()
            self.assertIs(user['active'], True)
            self.assertEqual(session.execute(select(AuthSession.expires)).scalar_one(), 123.5)
            request = session.execute(select(TranslationRequest.__table__)).mappings().first()
            self.assertEqual(request['data'], self.record)
            self.assertIs(request['sending'], False)
            self.assertEqual(request['created_at'], to_datetime(self.timestamp))
            service = session.execute(select(Service.__table__)).mappings().first()
            self.assertEqual(service['deadline'], '2026-10-10')
            self.assertIs(service['sending'], False)
            for field in ('created_at', 'updated_at', 'started_at', 'ready_at', 'delivered_at'):
                self.assertEqual(service[field], to_datetime(self.timestamp), field)
            delivery = session.execute(select(Delivery.__table__)).mappings().first()
            self.assertEqual((delivery['content'], delivery['version']), (b'text', 1))
            for field in ('submitted_at', 'reviewed_at'):
                self.assertEqual(delivery[field], to_datetime(self.timestamp), field)
            events = session.execute(select(WorkflowEvent.__table__).order_by(WorkflowEvent.id)).mappings().all()
            self.assertEqual([event['status'] for event in events], ['Recebido', 'Entregue'])
            self.assertTrue(all(event['created_at'] == to_datetime(self.timestamp) for event in events))
        self.assertEqual(import_legacy(self.path), {'alreadyMigrated': True, 'counts': {}})
        with database() as session:
            self.assertEqual(session.execute(select(func.count()).select_from(WorkflowEvent)).scalar_one(), 2)
            self.assertEqual(session.execute(select(func.count()).select_from(LegacyMigration)).scalar_one(), 1)

    def test_failed_import_rolls_back_all_rows_and_can_be_retried(self):
        with self.source.begin() as connection:
            connection.execute(
                insert(self.tables['users']).values(
                    id='conflicting-user',
                    email='legacy@example.test',
                    name='Duplicate email',
                    role='translator',
                    password_hash='legacy-hash',
                    active=1,
                )
            )
        with self.assertRaises(IntegrityError):
            import_legacy(self.path)
        with database() as session:
            self.assertEqual(session.execute(select(func.count()).select_from(User)).scalar_one(), 0)
        with self.source.begin() as connection:
            table = self.tables['users']
            connection.execute(table.delete().where(table.c.id == 'conflicting-user'))
        self.assertFalse(import_legacy(self.path)['alreadyMigrated'])
