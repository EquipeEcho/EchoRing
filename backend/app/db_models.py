"""Modelos SQLAlchemy do schema PostgreSQL (requer SQLAlchemy 2.0+).

Espelham o schema FINAL: tabelas base criadas em database_pg.py mais as migrações
backend/migrations/001..003. Os modelos servem para consultar e gravar. Quem cria
e atualiza o schema continua sendo o mecanismo versionado (database_pg.initialize_schema
+ app/core/migrations.py); não use Base.metadata.create_all() no app, para não existir
uma segunda fonte de verdade.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Double,
    ForeignKey,
    Identity,
    Index,
    Integer,
    LargeBinary,
    Numeric,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

TIMESTAMPTZ = DateTime(timezone=True)
OFFER_STATUSES = ('pending', 'accepted', 'declined', 'expired', 'cancelled')
WORKFLOW_TEMPLATES = ('tep', 'mtpe', 'localization', 'documentary', 'subtitling')


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(value) for value in values)})"


class Base(DeclarativeBase):
    pass


class TranslationRequest(Base):
    """Solicitação de tradução; o conteúdo completo fica no JSONB `data`."""

    __tablename__ = 'requests'

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    sending: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())


class User(Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('true'))
    onboarding_required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))


class TranslatorProfile(Base):
    __tablename__ = 'translator_profiles'

    user_id: Mapped[str] = mapped_column(Text, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())


class AuthSession(Base):
    """Sessão de login (tabela `sessions`). Nome diferente para não colidir com sqlalchemy.orm.Session."""

    __tablename__ = 'sessions'
    __table_args__ = (Index('sessions_user_id', 'user_id'),)

    digest: Mapped[str] = mapped_column(Text, primary_key=True)
    expires: Mapped[float] = mapped_column(Double, nullable=False)
    user_id: Mapped[str | None] = mapped_column(Text)


class Service(Base):
    """Tarefa de tradução atribuída a um tradutor (uma por pedido e idioma de destino)."""

    __tablename__ = 'services'
    __table_args__ = (
        CheckConstraint('translator_compensation > 0'),
        Index('services_translator_id', 'translator_id'),
        Index('services_request_lookup', 'request_id'),
        Index('services_request_target', 'request_id', 'target', unique=True, postgresql_where=text('request_id IS NOT NULL')),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    request_id: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    translator_id: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    deadline: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False)
    observations: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    source: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    target: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    started_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    ready_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    delivered_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    sending: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text('false'))
    translator_compensation: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))  # BRL, migração 001


class Delivery(Base):
    """Versão de um documento traduzido enviada por um tradutor."""

    __tablename__ = 'deliveries'
    __table_args__ = (
        UniqueConstraint('service_id', 'version'),
        Index('deliveries_service_id', 'service_id', 'version'),
        Index('deliveries_status', 'status', 'submitted_at'),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    service_id: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    translator_id: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    media_type: Mapped[str] = mapped_column(Text, nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    reviewed_by: Mapped[str | None] = mapped_column(Text)
    files: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))


class DeliveryFile(Base):
    """Arquivo de uma entrega com vários documentos."""

    __tablename__ = 'delivery_files'
    __table_args__ = (Index('delivery_files_delivery_id', 'delivery_id', 'position'),)

    delivery_id: Mapped[str] = mapped_column(Text, primary_key=True)
    position: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    media_type: Mapped[str] = mapped_column(Text, nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)


class WorkflowEvent(Base):
    """Histórico de status de uma solicitação ou tarefa."""

    __tablename__ = 'workflow_events'
    __table_args__ = (
        Index('workflow_events_request', 'request_id', 'created_at'),
        Index('workflow_events_service', 'service_id', 'created_at'),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    request_id: Mapped[str | None] = mapped_column(Text)
    service_id: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    actor_id: Mapped[str | None] = mapped_column(Text)
    actor_name: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False)


class JobOffer(Base):
    """Oferta de trabalho enviada a tradutores (migrações 001 e 003)."""

    __tablename__ = 'job_offers'
    __table_args__ = (
        CheckConstraint('compensation > 0'),
        CheckConstraint(_in('status', OFFER_STATUSES)),
        CheckConstraint('expires_at > created_at'),
        CheckConstraint(_in('audience', ('selected', 'all'))),
        CheckConstraint(_in('workflow_template_id', WORKFLOW_TEMPLATES)),
        Index('job_offers_pending_recipient', 'request_id', 'target', 'translator_id', unique=True, postgresql_where=text("status = 'pending'")),
        Index('job_offers_one_acceptance', 'request_id', 'target', unique=True, postgresql_where=text("status = 'accepted'")),
        Index('job_offers_expiration', 'expires_at', postgresql_where=text("status = 'pending'")),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    request_id: Mapped[str] = mapped_column(Text, ForeignKey('requests.id'), nullable=False)
    translator_id: Mapped[str] = mapped_column(Text, ForeignKey('users.id'), nullable=False)
    created_by: Mapped[str] = mapped_column(Text, ForeignKey('users.id'), nullable=False)
    compensation: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    deadline: Mapped[date] = mapped_column(Date, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    volume: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())
    decided_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    service_id: Mapped[str | None] = mapped_column(Text, ForeignKey('services.id'))
    audience: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'selected'"))
    workflow_template_id: Mapped[str | None] = mapped_column(Text)
    target: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))


Index('job_offers_inbox', JobOffer.translator_id, JobOffer.created_at.desc())


class JobOfferEvent(Base):
    __tablename__ = 'job_offer_events'
    __table_args__ = (Index('job_offer_events_offer', 'offer_id', 'id'),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    offer_id: Mapped[str] = mapped_column(Text, ForeignKey('job_offers.id'), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[str | None] = mapped_column(Text, ForeignKey('users.id'))
    note: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())


class OfferNotification(Base):
    __tablename__ = 'offer_notifications'

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, ForeignKey('users.id'), nullable=False)
    offer_id: Mapped[str] = mapped_column(Text, ForeignKey('job_offers.id'), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    href: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())
    read_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)


Index('offer_notifications_user', OfferNotification.user_id, OfferNotification.id.desc())


class ServiceWorkflow(Base):
    """Fluxo de etapas atribuído a uma tarefa (migração 002)."""

    __tablename__ = 'service_workflows'
    __table_args__ = (
        CheckConstraint(_in('template_id', WORKFLOW_TEMPLATES)),
        CheckConstraint('revision > 0'),
    )

    service_id: Mapped[str] = mapped_column(Text, ForeignKey('services.id', ondelete='CASCADE'), primary_key=True)
    template_id: Mapped[str] = mapped_column(Text, nullable=False)
    definition: Mapped[dict] = mapped_column(JSONB, nullable=False)
    stages: Mapped[list] = mapped_column(JSONB, nullable=False)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('1'))
    assigned_by: Mapped[str] = mapped_column(Text, ForeignKey('users.id'), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())


class SchemaMigration(Base):
    """Controle das migrações .sql já aplicadas (app/core/migrations.py)."""

    __tablename__ = 'schema_migrations'

    version: Mapped[str] = mapped_column(Text, primary_key=True)
    applied_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())


class LegacyMigration(Base):
    """Registro dos arquivos SQLite já importados por scripts/migrate_to_postgres.py."""

    __tablename__ = 'legacy_migrations'

    source_key: Mapped[str] = mapped_column(Text, primary_key=True)
    source_path: Mapped[str] = mapped_column(Text, nullable=False)
    migrated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())