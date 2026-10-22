"""Modelos SQLAlchemy das tabelas do PostgreSQL (requer SQLAlchemy 2.0+).

Obs.: não há ForeignKey de propósito. O banco legado e os testes gravam ids
"soltos" (ex.: services.translator_id sem usuário correspondente), então as
referências continuam sendo só colunas de texto, como no esquema original.
"""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Double,
    Identity,
    Index,
    Integer,
    LargeBinary,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

TIMESTAMPTZ = DateTime(timezone=True)


class Base(DeclarativeBase):
    pass


class TranslationRequest(Base):
    """Solicitação de tradução; o conteúdo completo fica no JSONB `data`."""

    __tablename__ = 'requests'

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    sending: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text('false'))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())


class User(Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text('true'))
    onboarding_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text('false'))


class AuthSession(Base):
    """Sessão de login (tabela `sessions`). Nome diferente para não colidir com sqlalchemy.orm.Session."""

    __tablename__ = 'sessions'
    __table_args__ = (Index('sessions_user_id', 'user_id'),)

    digest: Mapped[str] = mapped_column(Text, primary_key=True)
    expires: Mapped[float] = mapped_column(Double, nullable=False)
    user_id: Mapped[str | None] = mapped_column(Text)


class Service(Base):
    """Tarefa de tradução atribuída a um tradutor."""

    __tablename__ = 'services'
    __table_args__ = (
        Index('services_translator_id', 'translator_id'),
        Index('services_request_id', 'request_id', unique=True, postgresql_where=text('request_id IS NOT NULL')),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    request_id: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    translator_id: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    deadline: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False)
    observations: Mapped[str] = mapped_column(Text, nullable=False, default='', server_default=text("''"))
    source: Mapped[str] = mapped_column(Text, nullable=False, default='', server_default=text("''"))
    target: Mapped[str] = mapped_column(Text, nullable=False, default='', server_default=text("''"))
    updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    started_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    ready_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    delivered_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    sending: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text('false'))


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
    files: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))


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


class LegacyMigration(Base):
    """Registro dos arquivos SQLite já importados por migrate_to_postgres.py."""

    __tablename__ = 'legacy_migrations'

    source_key: Mapped[str] = mapped_column(Text, primary_key=True)
    source_path: Mapped[str] = mapped_column(Text, nullable=False)
    migrated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False, server_default=func.current_timestamp())