"""Copy legacy MongoDB profiles into PostgreSQL without overwriting newer data."""

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from pydantic import ValidationError
from pymongo import MongoClient
from sqlalchemy import and_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db_models import TranslatorProfile, User

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

from app.database_pg import database
from app.models.translator_profile import TranslatorProfileDraft


def timestamp(value, default=None):
    if value is None:
        return default
    parsed = value if isinstance(value, datetime) else datetime.fromisoformat(value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def migrate_profiles(collection, *, apply=False):
    counts = {'imported': 0, 'wouldImport': 0, 'existing': 0, 'missingUser': 0, 'invalid': 0}
    with database() as session:
        for document in collection.find({}):
            user_id = document.get('_id')
            if (
                not isinstance(user_id, str)
                or not session.execute(
                    select(1).select_from(User).where(and_(User.id == user_id, User.role == 'translator'))
                )
                .mappings()
                .first()
            ):
                counts['missingUser'] += 1
                continue
            if (
                session.execute(select(1).select_from(TranslatorProfile).where(TranslatorProfile.user_id == user_id))
                .mappings()
                .first()
            ):
                counts['existing'] += 1
                continue
            try:
                profile = TranslatorProfileDraft.model_validate(document.get('data', {}))
                completed = timestamp(document.get('completed_at'))
                updated = timestamp(document.get('updated_at'), completed or datetime.now(timezone.utc))
            except (ValidationError, ValueError, TypeError):
                counts['invalid'] += 1
                continue
            if not apply:
                counts['wouldImport'] += 1
                continue
            result = (
                session.execute(
                    pg_insert(TranslatorProfile)
                    .values(user_id=user_id, data=profile.model_dump(), completed_at=completed, updated_at=updated)
                    .on_conflict_do_nothing(index_elements=[TranslatorProfile.user_id])
                    .returning(TranslatorProfile.user_id)
                )
                .mappings()
                .first()
            )
            counts['imported' if result else 'existing'] += 1
    return {'dryRun': not apply, **counts}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Grava somente os perfis ainda ausentes no PostgreSQL.')
    arguments = parser.parse_args()
    with MongoClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017'), serverSelectionTimeoutMS=5000) as client:
        collection = client[os.getenv('MONGO_DB', 'EchoRing')]['translator_profiles']
        print(json.dumps(migrate_profiles(collection, apply=arguments.apply), ensure_ascii=False))


if __name__ == '__main__':
    main()
