"""Controla solicitações, orçamentos, tarefas, revisões e entregas finais."""

import base64
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import smtplib
import ssl
import threading
import time
import zipfile
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from email.message import EmailMessage
from pathlib import Path
from typing import Literal
from urllib.parse import quote as urlquote

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator, model_validator

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
_lock = threading.Lock()
_attempts: dict[tuple[str, str], list[float]] = {}
PASSWORD_ITERATIONS = 600_000
SESSION_SECONDS = 8 * 60 * 60
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
        UNIQUE(service_id, version)
    )''')
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


def throttle(request: Request, category: str, maximum: int):
    """Limita tentativas por IP e categoria dentro de uma janela de um minuto."""
    key = (request.client.host if request.client else 'unknown', category)
    timestamp = time.time()
    with _lock:
        for old_key in list(_attempts):
            _attempts[old_key] = [value for value in _attempts[old_key] if value > timestamp - 60]
            if not _attempts[old_key]:
                del _attempts[old_key]
        values = _attempts.setdefault(key, [])
        if len(values) >= maximum:
            raise HTTPException(429, 'Muitas tentativas. Aguarde um minuto e tente novamente.')
        values.append(timestamp)


def hash_password(password: str):
    """Gera um hash PBKDF2 com salt próprio para nunca guardar a senha original."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, PASSWORD_ITERATIONS)
    return f'pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}'


def password_matches(password: str, encoded: str):
    """Compara a senha recebida com o hash salvo sem expor diferenças de tempo."""
    try:
        algorithm, iterations, salt, expected = encoded.split('$', 3)
        if algorithm != 'pbkdf2_sha256':
            return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (TypeError, ValueError):
        return False


def configured_accounts():
    """Monta as contas iniciais definidas no ambiente e ignora e-mails repetidos."""
    accounts = []
    configured_emails = set()
    for prefix, role, default_name in (
        ('ADMIN', 'admin', 'Administrador Geral'),
        ('TRANSLATOR', 'translator', 'Tradutor Aliança'),
        ('STAFF', 'employee', 'Equipe Aliança'),
    ):
        email = os.getenv(f'{prefix}_EMAIL', '').strip().lower()
        password = os.getenv(f'{prefix}_PASSWORD', '')
        if email and len(password) >= 12 and email not in configured_emails:
            configured_emails.add(email)
            accounts.append({
                'id': hashlib.sha256(f'{role}:{email}'.encode()).hexdigest()[:32],
                'email': email, 'password': password,
                'name': os.getenv(f'{prefix}_NAME', default_name).strip() or default_name,
                'role': role,
            })
    return accounts


def sync_configured_accounts(connection, accounts):
    """Cria ou atualiza as contas do ambiente sem recalcular hashes sem necessidade."""
    for account in accounts:
        existing = connection.execute('SELECT password_hash FROM users WHERE email = ?', (account['email'],)).fetchone()
        password_hash = existing['password_hash'] if existing and password_matches(account['password'], existing['password_hash']) else hash_password(account['password'])
        connection.execute(
            '''INSERT INTO users (id, email, name, role, password_hash, active) VALUES (?, ?, ?, ?, ?, TRUE)
               ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role,
               password_hash = excluded.password_hash, active = TRUE''',
            (account['id'], account['email'], account['name'], account['role'], password_hash),
        )


def authenticated_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    """Valida o token da sessão e devolve somente um usuário ativo e não expirado."""
    if not credentials:
        raise HTTPException(401, 'Entre com sua conta para continuar.')
    digest = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    with database() as connection:
        session = connection.execute(
            '''SELECT sessions.expires, users.id, users.name, users.email, users.role, users.active
               FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.digest = ?''',
            (digest,),
        ).fetchone()
        if not session or session['expires'] <= time.time() or not session['active']:
            connection.execute('DELETE FROM sessions WHERE digest = ?', (digest,))
            raise HTTPException(401, 'Sessão expirada. Entre novamente no portal.')
    return dict(session)


def staff(user: dict = Depends(authenticated_user)):
    """Restringe a rota à equipe interna e ao administrador."""
    if user['role'] not in ('admin', 'employee'):
        raise HTTPException(403, 'Sua conta não tem permissão para acessar esta área.')
    return user


def translator(user: dict = Depends(authenticated_user)):
    """Restringe a rota a usuários com papel de tradutor."""
    if user['role'] != 'translator':
        raise HTTPException(403, 'Somente tradutores podem acessar esta área.')
    return user


def administrator(user: dict = Depends(authenticated_user)):
    """Restringe o gerenciamento de contas ao administrador geral."""
    if user['role'] != 'admin':
        raise HTTPException(403, 'Somente o administrador geral pode gerenciar usuários.')
    return user


def public_user(user):
    """Remove do retorno os campos internos e sensíveis do usuário."""
    return {key: user[key] for key in ('name', 'email', 'role')}


class Login(BaseModel):
    """Dados mínimos aceitos para iniciar uma sessão."""
    email: str = Field(max_length=160)
    password: str = Field(max_length=1024)


@router.post('/auth/login')
@router.post('/staff/login', include_in_schema=False)
def login(data: Login, request: Request):
    """Autentica a conta e salva apenas o resumo criptográfico do token da sessão."""
    throttle(request, 'auth-login', 5)
    accounts = configured_accounts()
    with database() as connection:
        sync_configured_accounts(connection, accounts)
        candidate = connection.execute('SELECT * FROM users WHERE email = ?', (data.email.strip().lower(),)).fetchone()
    fallback = 'pbkdf2_sha256$600000$00000000000000000000000000000000$33d727f3156a25e032f442eb429832a86bc213bd395aa8e59f4ebc754c54ddef'
    valid_password = password_matches(data.password, candidate['password_hash'] if candidate else fallback)
    if not candidate or not candidate['active'] or not valid_password:
        raise HTTPException(401, 'E-mail ou senha incorretos.')
    user = dict(candidate)
    token = secrets.token_urlsafe(48)
    expires = time.time() + SESSION_SECONDS
    with database() as connection:
        connection.execute('DELETE FROM sessions WHERE expires <= ?', (time.time(),))
        connection.execute(
            'INSERT INTO sessions (digest, expires, user_id) VALUES (?, ?, ?)',
            (hashlib.sha256(token.encode()).hexdigest(), expires, user['id']),
        )
    return {'token': token, 'expires': expires, **public_user(user)}


@router.get('/auth/me')
def me(user: dict = Depends(authenticated_user)):
    """Retorna os dados públicos da conta ligada ao token atual."""
    return public_user(user)


@router.post('/auth/logout')
@router.post('/staff/logout', include_in_schema=False)
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), user: dict = Depends(authenticated_user)):
    """Encerra a sessão removendo do banco o resumo do token recebido."""
    digest = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    with database() as connection:
        connection.execute('DELETE FROM sessions WHERE digest = ?', (digest,))
    return {'ok': True}


class UserCreate(BaseModel):
    """Valida os dados usados pelo administrador para cadastrar uma conta."""
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=12, max_length=128)
    role: Literal['employee', 'translator', 'hr']

    @field_validator('name', 'email', mode='before')
    @classmethod
    def trim_user(cls, value):
        """Remove espaços antes de aplicar as demais validações de usuário."""
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode='after')
    def validate_user(self):
        """Normaliza o e-mail e confere os campos que dependem de regras próprias."""
        self.email = self.email.lower()
        if not re.fullmatch(r'[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+', self.email):
            raise ValueError('E-mail inválido.')
        if not self.name:
            raise ValueError('Informe o nome do usuário.')
        return self


def user_record(user):
    """Formata um usuário para a API sem incluir seu hash de senha."""
    return {**{key: user[key] for key in ('id', 'name', 'email', 'role')}, 'active': bool(user['active'])}


@router.get('/users')
def list_users(admin: dict = Depends(administrator)):
    """Lista as contas cadastradas depois de sincronizar as contas do ambiente."""
    with database() as connection:
        sync_configured_accounts(connection, configured_accounts())
        users = connection.execute('SELECT id, name, email, role, active FROM users ORDER BY LOWER(name)').fetchall()
    return [user_record(user) for user in users]


@router.post('/users', status_code=201)
def create_user(data: UserCreate, admin: dict = Depends(administrator)):
    """Cadastra uma conta com senha protegida e impede e-mails duplicados."""
    try:
        with database() as connection:
            if connection.execute('SELECT 1 FROM users WHERE email = ?', (data.email,)).fetchone():
                raise HTTPException(409, 'Já existe uma conta com este e-mail.')
            user_id = secrets.token_hex(16)
            connection.execute(
                'INSERT INTO users (id, email, name, role, password_hash, active) VALUES (?, ?, ?, ?, ?, TRUE)',
                (user_id, data.email, data.name, data.role, hash_password(data.password)),
            )
            user = connection.execute('SELECT id, name, email, role, active FROM users WHERE id = ?', (user_id,)).fetchone()
    except psycopg.IntegrityError as error:
        raise HTTPException(409, 'Já existe uma conta com este e-mail.') from error
    return user_record(user)


@router.get('/translators')
def list_translators(user: dict = Depends(staff)):
    """Lista somente tradutores ativos que podem receber uma tarefa."""
    with database() as connection:
        sync_configured_accounts(connection, configured_accounts())
        users = connection.execute(
            "SELECT id, name, email, role, active FROM users WHERE role = 'translator' AND active = TRUE ORDER BY LOWER(name)"
        ).fetchall()
    return [user_record(item) for item in users]


class Attachment(BaseModel):
    """Representa um anexo e valida seu conteúdo real, não apenas a extensão."""
    name: str = Field(min_length=1, max_length=160)
    size: int = Field(gt=0, le=2 * 1024 * 1024)
    content: str = Field(max_length=2_800_000)

    @model_validator(mode='after')
    def validate_document(self):
        """Confere nome, tamanho e assinatura do arquivo informado pelo cliente."""
        if any(char in self.name for char in ('/', '\\', '\r', '\n', '\x00')):
            raise ValueError('Nome de documento inválido.')
        extension = Path(self.name).suffix.lower()
        try:
            raw = base64.b64decode(self.content, validate=True)
            if len(raw) != self.size:
                raise ValueError('Tamanho de documento inválido.')
            if extension == '.pdf':
                if not raw.startswith(b'%PDF-'):
                    raise ValueError('PDF inválido.')
            elif extension == '.docx':
                with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                    if not {'[Content_Types].xml', 'word/document.xml'}.issubset(archive.namelist()):
                        raise ValueError('DOCX inválido.')
            elif extension == '.txt':
                raw.decode('utf-8')
                if b'\x00' in raw:
                    raise ValueError('TXT inválido.')
            else:
                raise ValueError('Use PDF, DOCX ou TXT.')
        except (ValueError, zipfile.BadZipFile, UnicodeDecodeError) as error:
            raise ValueError('Documento inválido. Use PDF, DOCX ou TXT, com até 2 MB.') from error
        return self


class Intake(BaseModel):
    """Valida os dados enviados pelo cliente ao pedir uma tradução."""
    name: str = Field(min_length=1, max_length=160)
    email: str = Field(min_length=3, max_length=160)
    company: str = Field(default='', max_length=160)
    title: str = Field(min_length=1, max_length=160)
    service: str = Field(min_length=1, max_length=160)
    source: str = Field(min_length=1, max_length=160)
    target: str = Field(min_length=1, max_length=160)
    deadline: str = Field(default='', max_length=160)
    message: str = Field(min_length=1, max_length=3000)
    consent: bool
    attachments: list[Attachment] = Field(default_factory=list, max_length=3)

    @field_validator('name', 'email', 'company', 'title', 'service', 'source', 'target', 'deadline', 'message', mode='before')
    @classmethod
    def trim(cls, value):
        """Remove espaços extras dos campos textuais da solicitação."""
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode='after')
    def validate_intake(self):
        """Aplica as regras que envolvem consentimento, idiomas e total dos anexos."""
        if not self.consent:
            raise ValueError('Autorize o contato para orçamento.')
        if not re.fullmatch(r'[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+', self.email):
            raise ValueError('E-mail inválido.')
        if self.source.casefold() == self.target.casefold():
            raise ValueError('Informe idiomas diferentes.')
        if sum(file.size for file in self.attachments) > 5 * 1024 * 1024:
            raise ValueError('Limite total de documentos: 5 MB.')
        return self


class Quote(BaseModel):
    """Valida valor, prazo e mensagem usados na proposta comercial."""
    amount: str = Field(min_length=1, max_length=12)
    delivery: str = Field(min_length=1, max_length=160)
    message: str = Field(default='', max_length=3000)

    @model_validator(mode='after')
    def validate_quote(self):
        """Normaliza a proposta e garante que valor e prazo sejam válidos."""
        self.amount = self.amount.strip()
        self.delivery = self.delivery.strip()
        self.message = self.message.strip()
        if not self.delivery or not re.fullmatch(r'\d{1,8}([.,]\d{1,2})?', self.amount) or Decimal(self.amount.replace(',', '.')) <= 0:
            raise ValueError('Informe valor positivo e prazo.')
        return self


class Update(BaseModel):
    """Campos que a equipe pode alterar enquanto prepara o orçamento."""
    status: str | None = None
    quote: Quote | None = None


class QuoteDecision(BaseModel):
    """Resposta do cliente acompanhada pelo token recebido no e-mail."""
    token: str = Field(min_length=32, max_length=256)
    decision: Literal['approve', 'decline']


class TranslatorAssignment(BaseModel):
    """Dados necessários para transformar uma solicitação em tarefa."""
    translatorId: str = Field(min_length=1, max_length=160)
    deadline: str = Field(min_length=1, max_length=160)
    observations: str = Field(default='', max_length=3000)

    @field_validator('translatorId', 'deadline', 'observations', mode='before')
    @classmethod
    def trim_assignment(cls, value):
        """Remove espaços dos dados usados na atribuição da tarefa."""
        return value.strip() if isinstance(value, str) else value


class DeliveryReview(BaseModel):
    """Decisão da equipe sobre uma versão enviada pelo tradutor."""
    decision: Literal['approve', 'request_revision']
    feedback: str = Field(default='', max_length=3000)

    @model_validator(mode='after')
    def validate_review(self):
        """Exige uma orientação sempre que o documento voltar para revisão."""
        self.feedback = self.feedback.strip()
        if self.decision == 'request_revision' and not self.feedback:
            raise ValueError('Explique ao tradutor a revisão necessária.')
        return self


def read_request(connection, request_id, for_update=False):
    """Busca a solicitação e, quando necessário, bloqueia a linha durante a alteração."""
    suffix = ' FOR UPDATE' if for_update else ''
    row = connection.execute('SELECT data, sending FROM requests WHERE id = ?' + suffix, (request_id,)).fetchone()
    if not row:
        raise HTTPException(404, 'Solicitação não encontrada.')
    return json_data(row['data']), row['sending']


def read_service(connection, service_id, for_update=False):
    """Busca uma tarefa e permite bloquear a linha em mudanças de estado."""
    suffix = ' FOR UPDATE' if for_update else ''
    service = connection.execute('SELECT * FROM services WHERE id = ?' + suffix, (service_id,)).fetchone()
    if not service:
        raise HTTPException(404, 'Tarefa não encontrada.')
    return service


def read_delivery(connection, delivery_id, for_update=False):
    """Busca uma entrega junto com os nomes do tradutor e de quem revisou."""
    suffix = ' FOR UPDATE OF deliveries' if for_update else ''
    delivery = connection.execute(
        '''SELECT deliveries.*, services.title AS service_title,
                  translator_user.name AS translator_name, reviewer.name AS reviewer_name
           FROM deliveries JOIN services ON services.id = deliveries.service_id
           LEFT JOIN users AS translator_user ON translator_user.id = deliveries.translator_id
           LEFT JOIN users AS reviewer ON reviewer.id = deliveries.reviewed_by
           WHERE deliveries.id = ?''' + suffix,
        (delivery_id,),
    ).fetchone()
    if not delivery:
        raise HTTPException(404, 'Entrega não encontrada.')
    return delivery


def add_event(connection, status, request_id=None, service_id=None, actor=None, note=None, created_at=None):
    """Registra uma mudança no histórico com responsável, data e observação."""
    actor_name = actor.get('name') if actor else ('Cliente' if status in ('Orçamento aprovado', 'Orçamento recusado') else 'Sistema')
    connection.execute(
        '''INSERT INTO workflow_events (request_id, service_id, status, note, actor_id, actor_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (request_id, service_id, status, note or None, actor.get('id') if actor else None,
         actor_name, created_at or now()),
    )


def event_history(connection, request_id=None, service_id=None):
    """Monta a linha do tempo completa de uma solicitação ou tarefa."""
    if service_id:
        rows = connection.execute(
            'SELECT status, note, actor_name, created_at FROM workflow_events WHERE service_id = ? OR request_id = (SELECT request_id FROM services WHERE id = ?) ORDER BY id',
            (service_id, service_id),
        ).fetchall()
    else:
        rows = connection.execute(
            'SELECT status, note, actor_name, created_at FROM workflow_events WHERE request_id = ? ORDER BY id',
            (request_id,),
        ).fetchall()
    return [
        {'status': row['status'], 'note': row['note'] or '', 'actorName': row['actor_name'] or 'Sistema', 'createdAt': row['created_at']}
        for row in rows
    ]


def sanitized_request(data, connection=None, include_content=False):
    """Prepara a solicitação para resposta sem vazar tokens ou anexos desnecessários."""
    result = {key: value for key, value in data.items() if key not in ('quoteResponseTokenDigest', 'quoteResponseExpiresAt')}
    result['attachments'] = [file if include_content else {**file, 'content': ''} for file in data.get('attachments', [])]
    if connection:
        result['history'] = event_history(connection, request_id=data['id'])
        task = connection.execute(
            '''SELECT services.id, services.status, services.deadline, users.id AS translator_id,
                      users.name AS translator_name, users.email AS translator_email
               FROM services LEFT JOIN users ON users.id = services.translator_id
               WHERE services.request_id = ?''',
            (data['id'],),
        ).fetchone()
        if task:
            result['task'] = {
                'id': task['id'], 'status': task['status'], 'deadline': task['deadline'],
                'translator': {'id': task['translator_id'], 'name': task['translator_name'], 'email': task['translator_email']},
            }
    return result


def update_request_status(connection, request_id, status, actor=None, note=None, service_id=None, timestamp_field=None):
    """Atualiza o estado da solicitação e grava o mesmo passo no histórico."""
    data, _ = read_request(connection, request_id, for_update=True)
    changed_at = now()
    data['status'] = status
    if timestamp_field:
        data[timestamp_field] = changed_at
    connection.execute('UPDATE requests SET data = ? WHERE id = ?', (Jsonb(data), request_id))
    add_event(connection, status, request_id, service_id, actor, note, changed_at)
    return data


def delivery_documents(connection, delivery):
    """Lista todos os arquivos de uma versão e mantém compatibilidade com versões antigas."""
    files = connection.execute(
        'SELECT position, name, media_type, size, content FROM delivery_files WHERE delivery_id = ? ORDER BY position',
        (delivery['id'],),
    ).fetchall()
    if files:
        return files
    return [{
        'position': 0, 'name': delivery['name'], 'media_type': delivery['media_type'],
        'size': delivery['size'], 'content': delivery['content'],
    }]


def delivery_record(connection, delivery):
    """Formata os metadados da entrega sem devolver o conteúdo binário do arquivo."""
    record = {
        'id': delivery['id'], 'serviceId': delivery['service_id'],
        'serviceTitle': delivery['service_title'], 'version': delivery['version'],
        'translatorName': delivery['translator_name'], 'name': delivery['name'],
        'mediaType': delivery['media_type'], 'size': delivery['size'],
        'status': delivery['status'], 'submittedAt': delivery['submitted_at'],
        'files': [
            {'index': file['position'], 'name': file['name'], 'mediaType': file['media_type'], 'size': file['size']}
            for file in delivery_documents(connection, delivery)
        ],
    }
    if delivery['feedback']:
        record['feedback'] = delivery['feedback']
    if delivery['reviewed_at']:
        record['reviewedAt'] = delivery['reviewed_at']
    if delivery['reviewer_name']:
        record['reviewerName'] = delivery['reviewer_name']
    return record


def task_record(connection, service):
    """Reúne tarefa, cliente, tradutor, última versão e histórico em uma resposta."""
    request_data = None
    if service['request_id']:
        row = connection.execute('SELECT data FROM requests WHERE id = ?', (service['request_id'],)).fetchone()
        if row:
            request_data = json_data(row['data'])
    latest = connection.execute('SELECT * FROM deliveries WHERE service_id = ? ORDER BY version DESC LIMIT 1', (service['id'],)).fetchone()
    assigned = connection.execute('SELECT id, name, email FROM users WHERE id = ?', (service['translator_id'],)).fetchone()
    record = {
        'id': service['id'], 'requestId': service['request_id'], 'title': service['title'],
        'status': service['status'], 'deadline': service['deadline'], 'createdAt': service['created_at'],
        'updatedAt': service['updated_at'] or service['created_at'], 'startedAt': service['started_at'],
        'readyAt': service['ready_at'], 'deliveredAt': service['delivered_at'],
        'observations': service['observations'] or '', 'source': service['source'] or '',
        'target': service['target'] or '', 'lastVersion': latest['version'] if latest else 0,
        'translator': {'id': assigned['id'], 'name': assigned['name'], 'email': assigned['email']} if assigned else None,
        'history': event_history(connection, service_id=service['id']),
    }
    if latest:
        latest_files = delivery_documents(connection, latest)
        record['lastDelivery'] = {
            'id': latest['id'], 'name': latest['name'], 'size': latest['size'], 'status': latest['status'],
            'version': latest['version'], 'submittedAt': latest['submitted_at'], 'feedback': latest['feedback'] or '',
            'files': [
                {'index': file['position'], 'name': file['name'], 'mediaType': file['media_type'], 'size': file['size']}
                for file in latest_files
            ],
        }
        if latest['feedback']:
            record['lastFeedback'] = latest['feedback']
    if request_data:
        record.update({
            'clientName': request_data['name'], 'clientEmail': request_data['email'],
            'company': request_data.get('company', ''),
            'source': service['source'] or request_data['source'], 'target': service['target'] or request_data['target'],
            'attachments': [{**file, 'content': ''} for file in request_data.get('attachments', [])],
        })
    else:
        record['attachments'] = []
    return record


def validate_delivery_document(name, content):
    """Valida o arquivo traduzido pelo nome, tamanho e estrutura esperada do formato."""
    if not name or len(name) > 160 or any(char in name for char in ('/', '\\', '\r', '\n', '\x00')):
        raise HTTPException(422, 'Nome de documento inválido.')
    if not content or len(content) > MAX_DELIVERY_BYTES:
        raise HTTPException(422, 'O documento deve ter entre 1 byte e 5 MB.')
    extension = Path(name).suffix.lower()
    try:
        if extension == '.pdf':
            if not content.startswith(b'%PDF-'):
                raise ValueError
            return 'application/pdf'
        if extension == '.docx':
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                if not {'[Content_Types].xml', 'word/document.xml'}.issubset(archive.namelist()):
                    raise ValueError
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        if extension == '.txt':
            content.decode('utf-8')
            if b'\x00' in content:
                raise ValueError
            return 'text/plain; charset=utf-8'
    except (ValueError, zipfile.BadZipFile, UnicodeDecodeError) as error:
        raise HTTPException(422, 'Documento inválido. Use PDF, DOCX ou TXT, com até 5 MB.') from error
    raise HTTPException(422, 'Documento inválido. Use PDF, DOCX ou TXT, com até 5 MB.')


def ensure_task_access(service, user):
    """Libera a equipe ou somente o tradutor que realmente recebeu a tarefa."""
    if user['role'] in ('admin', 'employee'):
        return
    if user['role'] != 'translator' or service['translator_id'] != user['id']:
        raise HTTPException(403, 'Esta tarefa não está atribuída à sua conta.')


@router.post('/requests', status_code=201)
def create_request(data: Intake, request: Request):
    """Cria a solicitação pública e registra seu primeiro evento como recebida."""
    throttle(request, 'intake', 10)
    created_at = now()
    record = {**data.model_dump(), 'id': 'SOL-' + secrets.token_hex(6).upper(), 'createdAt': created_at, 'status': 'Recebido', 'demo': False}
    with database() as connection:
        connection.execute('INSERT INTO requests (id, data) VALUES (?, ?)', (record['id'], Jsonb(record)))
        add_event(connection, 'Recebido', request_id=record['id'], created_at=created_at)
        return sanitized_request(record, connection)


@router.get('/requests')
def list_requests(user: dict = Depends(staff)):
    """Lista as solicitações mais recentes para a equipe interna."""
    with database() as connection:
        rows = connection.execute('SELECT data FROM requests ORDER BY created_at DESC').fetchall()
        return [sanitized_request(json_data(row['data']), connection) for row in rows]


@router.get('/requests/{request_id}')
def request_detail(request_id: str, user: dict = Depends(staff)):
    """Entrega à equipe todos os dados da solicitação, incluindo os anexos."""
    with database() as connection:
        data, _ = read_request(connection, request_id)
        return sanitized_request(data, connection, include_content=True)


@router.patch('/requests/{request_id}')
def update_request(request_id: str, changes: Update, user: dict = Depends(staff)):
    """Salva o rascunho do orçamento enquanto a solicitação ainda aceita edição."""
    if changes.status is not None and changes.status != 'Em análise':
        raise HTTPException(422, 'Status inválido.')
    if changes.status is None and changes.quote is None:
        raise HTTPException(422, 'Nenhuma alteração informada.')
    with database() as connection:
        data, sending = read_request(connection, request_id, for_update=True)
        if sending or data['status'] not in ('Recebido', 'Em análise'):
            raise HTTPException(409, 'Esta solicitação não aceita mais alterações no orçamento.')
        previous_status = data['status']
        if changes.quote:
            previous_id = data.get('quote', {}).get('id')
            data['quote'] = {**changes.quote.model_dump(), **({'id': previous_id} if previous_id else {})}
            data['status'] = 'Em análise'
        if changes.status:
            data['status'] = changes.status
        if data['status'] == 'Em análise' and not data.get('analysisStartedAt'):
            data['analysisStartedAt'] = now()
        connection.execute('UPDATE requests SET data = ? WHERE id = ?', (Jsonb(data), request_id))
        if previous_status != data['status']:
            add_event(connection, data['status'], request_id=request_id, actor=user, created_at=data.get('analysisStartedAt'))
        return sanitized_request(data, connection, include_content=True)


def _smtp_send(message):
    """Envia uma mensagem usando SSL direto ou STARTTLS conforme o ambiente."""
    host, sender = os.getenv('SMTP_HOST', ''), os.getenv('SMTP_FROM', '')
    if not host or not sender:
        raise HTTPException(503, 'O envio de e-mails não foi configurado. Os dados continuam salvos.')
    context = ssl.create_default_context()
    implicit_tls = os.getenv('SMTP_SECURITY', 'starttls').lower() == 'ssl'
    factory = smtplib.SMTP_SSL if implicit_tls else smtplib.SMTP
    port = int(os.getenv('SMTP_PORT', '465' if implicit_tls else '587'))
    kwargs = {'context': context} if implicit_tls else {}
    with factory(host, port, timeout=15, **kwargs) as smtp:
        if not implicit_tls:
            smtp.starttls(context=context)
        if os.getenv('SMTP_USER'):
            smtp.login(os.environ['SMTP_USER'], os.getenv('SMTP_PASSWORD', ''))
        smtp.send_message(message)


def deliver_quote(data, response_token=None):
    """Monta o orçamento em texto e HTML com links pessoais de aprovação e recusa."""
    quote_data = data['quote']
    amount = f"{Decimal(quote_data['amount'].replace(',', '.')):,.2f}".replace(',', '_').replace('.', ',').replace('_', '.')
    quote_id = quote_data.get('id', 'ORCAMENTO')
    frontend = os.getenv('FRONTEND_PUBLIC_URL', 'http://localhost:8081').rstrip('/')
    token = response_token or 'token-nao-disponivel'
    approve_url = f'{frontend}/orcamento/{urlquote(quote_id, safe="")}?decision=approve#{urlquote(token, safe="")}'
    decline_url = f'{frontend}/orcamento/{urlquote(quote_id, safe="")}?decision=decline#{urlquote(token, safe="")}'
    optional_message = f"\nMensagem da equipe: {quote_data['message']}\n" if quote_data.get('message') else ''
    message = EmailMessage()
    message['From'] = os.getenv('SMTP_FROM', '')
    message['To'] = data['email']
    message['Subject'] = f"Orçamento Aliança Traduções · {data['id']}"
    message.set_content(
        f"Olá, {data['name']}!\n\nSegue nossa proposta para {data['title']}.\n\n"
        f"Serviço: {data['service']}\nIdiomas: {data['source']} → {data['target']}\n"
        f"Valor: R$ {amount}\nPrazo: {quote_data['delivery']}\n{optional_message}\n"
        f"Aprovar orçamento: {approve_url}\nRecusar orçamento: {decline_url}\n\n"
        f"Os links são pessoais e devem ser usados apenas por você.\n\nAliança Traduções\nProtocolo: {data['id']}"
    )
    message.add_alternative(
        f"<h2>Orçamento para {data['title']}</h2><p><strong>Serviço:</strong> {data['service']}<br>"
        f"<strong>Idiomas:</strong> {data['source']} → {data['target']}<br>"
        f"<strong>Valor:</strong> R$ {amount}<br><strong>Prazo:</strong> {quote_data['delivery']}</p>"
        f"<p>{quote_data.get('message', '')}</p><p><a href=\"{approve_url}\">Aprovar orçamento</a> &nbsp; "
        f"<a href=\"{decline_url}\">Recusar orçamento</a></p><p>Protocolo: {data['id']}</p>", subtype='html')
    _smtp_send(message)


@router.post('/requests/{request_id}/send-quote')
def send_quote(request_id: str, user: dict = Depends(staff)):
    """Protege contra envio duplicado e confirma o estado somente após enviar o e-mail."""
    auto_approve = environment_flag('AUTO_APPROVE_QUOTES')
    response_token = '' if auto_approve else secrets.token_urlsafe(48)
    with database() as connection:
        data, sending = read_request(connection, request_id, for_update=True)
        if sending or data['status'] == 'Orçamento enviado':
            raise HTTPException(409, 'Este orçamento já foi enviado ou está em envio.')
        if data['status'] != 'Em análise' or not data.get('quote'):
            raise HTTPException(422, 'Salve o orçamento e inicie a análise antes de enviar.')
        quote_id = data['quote'].get('id') or 'ORC-' + secrets.token_hex(6).upper()
        data['quote']['id'] = quote_id
        data['quoteResponseTokenDigest'] = hashlib.sha256(response_token.encode()).hexdigest()
        days = max(1, min(int(os.getenv('QUOTE_RESPONSE_DAYS', '30')), 365))
        data['quoteResponseExpiresAt'] = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        connection.execute('UPDATE requests SET data = ?, sending = TRUE WHERE id = ?', (Jsonb(data), request_id))
    # O envio fica fora da transação para não segurar o bloqueio do banco enquanto o SMTP responde.
    if auto_approve:
        approved_at = now()
        data.update(
            status='Orçamento aprovado', quoteDecision='approve',
            quoteRespondedAt=approved_at, autoApproved=True,
        )
        with database() as connection:
            connection.execute('UPDATE requests SET data = ?, sending = FALSE WHERE id = ?', (Jsonb(data), request_id))
            add_event(
                connection, 'Orçamento aprovado', request_id=request_id, actor=user,
                note='Aprovação automática habilitada para testes.', created_at=approved_at,
            )
            return sanitized_request(data, connection, include_content=True)
    try:
        deliver_quote(data, response_token)
    except Exception as error:
        with database() as connection:
            connection.execute('UPDATE requests SET sending = FALSE WHERE id = ?', (request_id,))
        if isinstance(error, HTTPException):
            raise
        raise HTTPException(502, 'Não foi possível confirmar o envio pelo provedor. O rascunho foi preservado; confira a caixa de saída antes de tentar novamente.') from error
    sent_at = now()
    data.update(status='Orçamento enviado', emailSentAt=sent_at, quoteSentAt=sent_at)
    with database() as connection:
        connection.execute('UPDATE requests SET data = ?, sending = FALSE WHERE id = ?', (Jsonb(data), request_id))
        add_event(connection, 'Orçamento enviado', request_id=request_id, actor=user, created_at=sent_at)
        return sanitized_request(data, connection, include_content=True)


def _request_for_quote(connection, quote_id):
    """Localiza e bloqueia a solicitação ligada ao orçamento respondido pelo cliente."""
    row = connection.execute(
        "SELECT data FROM requests WHERE data -> 'quote' ->> 'id' = ? FOR UPDATE",
        (quote_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, 'Orçamento não encontrado.')
    return json_data(row['data'])


@router.post('/quotes/{quote_id}/decision')
def decide_quote(quote_id: str, decision: QuoteDecision, request: Request):
    """Valida o link pessoal e registra uma única decisão do cliente."""
    throttle(request, 'quote-decision', 20)
    with database() as connection:
        data = _request_for_quote(connection, quote_id)
        digest = hashlib.sha256(decision.token.encode()).hexdigest()
        if not data.get('quoteResponseTokenDigest') or not hmac.compare_digest(digest, data['quoteResponseTokenDigest']):
            raise HTTPException(403, 'Este link de orçamento é inválido.')
        try:
            expires = datetime.fromisoformat(data['quoteResponseExpiresAt'])
        except (KeyError, ValueError):
            raise HTTPException(403, 'Este link de orçamento é inválido.')
        if expires <= datetime.now(timezone.utc):
            raise HTTPException(410, 'Este link expirou. Entre em contato com a equipe para receber uma nova proposta.')
        if data['status'] != 'Orçamento enviado' or data.get('quoteRespondedAt'):
            raise HTTPException(409, 'Este orçamento já foi respondido.')
        status = 'Orçamento aprovado' if decision.decision == 'approve' else 'Orçamento recusado'
        responded_at = now()
        data.update(status=status, quoteDecision=decision.decision, quoteRespondedAt=responded_at)
        connection.execute('UPDATE requests SET data = ? WHERE id = ?', (Jsonb(data), data['id']))
        add_event(connection, status, request_id=data['id'], created_at=responded_at)
    return {'requestId': data['id'], 'quoteId': quote_id, 'title': data['title'], 'status': status, 'respondedAt': responded_at}


@router.post('/requests/{request_id}/assign', status_code=201)
def assign_translator(request_id: str, assignment: TranslatorAssignment, user: dict = Depends(staff)):
    """Cria uma tarefa para uma solicitação aprovada e vincula o tradutor escolhido."""
    with database() as connection:
        data, _ = read_request(connection, request_id, for_update=True)
        if data['status'] != 'Orçamento aprovado':
            raise HTTPException(409, 'A solicitação precisa ter um orçamento aprovado antes da atribuição.')
        if connection.execute('SELECT 1 FROM services WHERE request_id = ?', (request_id,)).fetchone():
            raise HTTPException(409, 'Esta solicitação já possui uma tarefa.')
        assigned = connection.execute("SELECT id, name, email FROM users WHERE id = ? AND role = 'translator' AND active = TRUE", (assignment.translatorId,)).fetchone()
        if not assigned:
            raise HTTPException(422, 'Selecione um tradutor ativo.')
        task_id = 'TRD-' + secrets.token_hex(6).upper()
        created_at = now()
        connection.execute(
            '''INSERT INTO services
               (id, request_id, title, translator_id, status, deadline, observations, source, target, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'Tradutor atribuído', ?, ?, ?, ?, ?, ?)''',
            (task_id, request_id, data['title'], assigned['id'], assignment.deadline, assignment.observations,
             data['source'], data['target'], created_at, created_at),
        )
        data.update(status='Tradutor atribuído', assignedAt=created_at, taskId=task_id,
                    translator={'id': assigned['id'], 'name': assigned['name'], 'email': assigned['email']})
        connection.execute('UPDATE requests SET data = ? WHERE id = ?', (Jsonb(data), request_id))
        add_event(connection, 'Tradutor atribuído', request_id, task_id, user, assignment.observations, created_at)
        return task_record(connection, read_service(connection, task_id))


@router.get('/tasks')
def list_tasks(user: dict = Depends(authenticated_user)):
    """Lista todas as tarefas para a equipe ou apenas as atribuídas ao tradutor."""
    if user['role'] == 'translator':
        query, values = 'SELECT * FROM services WHERE translator_id = ? ORDER BY created_at DESC', (user['id'],)
    elif user['role'] in ('admin', 'employee'):
        query, values = 'SELECT * FROM services ORDER BY created_at DESC', ()
    else:
        raise HTTPException(403, 'Sua conta não tem permissão para acessar tarefas de tradução.')
    with database() as connection:
        return [task_record(connection, item) for item in connection.execute(query, values).fetchall()]


@router.get('/services', include_in_schema=False)
def list_assigned_services(user: dict = Depends(translator)):
    """Mantém a rota antiga de serviços apontando para as tarefas do tradutor."""
    with database() as connection:
        services = connection.execute('SELECT * FROM services WHERE translator_id = ? ORDER BY created_at DESC', (user['id'],)).fetchall()
        return [task_record(connection, service) for service in services]


@router.get('/tasks/{task_id}')
def task_detail(task_id: str, user: dict = Depends(authenticated_user)):
    """Retorna a tarefa depois de conferir se a conta pode acessá-la."""
    with database() as connection:
        service = read_service(connection, task_id)
        ensure_task_access(service, user)
        return task_record(connection, service)


@router.post('/tasks/{task_id}/start')
def start_task(task_id: str, user: dict = Depends(translator)):
    """Marca o início do trabalho pelo tradutor responsável e atualiza o histórico."""
    with database() as connection:
        service = read_service(connection, task_id, for_update=True)
        ensure_task_access(service, user)
        if service['status'] != 'Tradutor atribuído':
            raise HTTPException(409, 'Esta tarefa não pode ser iniciada neste status.')
        started_at = now()
        connection.execute("UPDATE services SET status = 'Em andamento', started_at = ?, updated_at = ? WHERE id = ?", (started_at, started_at, task_id))
        if service['request_id']:
            update_request_status(connection, service['request_id'], 'Em andamento', user, service_id=task_id, timestamp_field='startedAt')
        else:
            add_event(connection, 'Em andamento', service_id=task_id, actor=user, created_at=started_at)
        return task_record(connection, read_service(connection, task_id))


def original_attachment(connection, service, attachment_index):
    """Recupera um anexo original pelo índice dentro da solicitação."""
    if not service['request_id']:
        raise HTTPException(404, 'Documento original não encontrado.')
    data, _ = read_request(connection, service['request_id'])
    attachments = data.get('attachments', [])
    if attachment_index < 0 or attachment_index >= len(attachments):
        raise HTTPException(404, 'Documento original não encontrado.')
    return attachments[attachment_index]


@router.get('/tasks/{task_id}/attachments/{attachment_index}')
def download_original(task_id: str, attachment_index: int, user: dict = Depends(authenticated_user)):
    """Entrega o documento original apenas a quem tem acesso à tarefa."""
    with database() as connection:
        service = read_service(connection, task_id)
        ensure_task_access(service, user)
        attachment = original_attachment(connection, service, attachment_index)
    content = base64.b64decode(attachment['content'], validate=True)
    filename = urlquote(attachment['name'], safe='')
    return Response(content=content, media_type='application/octet-stream',
                    headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'})


async def _upload_delivery(task_id: str, uploads: list[UploadFile], user: dict):
    """Valida e salva uma versão com um ou mais arquivos, pronta para avaliação conjunta."""
    if not uploads:
        raise HTTPException(422, 'Selecione ao menos um documento traduzido.')
    if len(uploads) > MAX_DELIVERY_FILES:
        raise HTTPException(422, f'Envie no máximo {MAX_DELIVERY_FILES} documentos por versão.')
    prepared = []
    total_size = 0
    for upload in uploads:
        name = (upload.filename or '').strip()
        content = await upload.read(MAX_DELIVERY_BYTES + 1)
        await upload.close()
        media_type = validate_delivery_document(name, content)
        total_size += len(content)
        prepared.append({'name': name, 'content': content, 'media_type': media_type})
    if total_size > MAX_DELIVERY_TOTAL_BYTES:
        raise HTTPException(422, 'Os documentos devem ter no máximo 20 MB no total.')
    with database() as connection:
        service = read_service(connection, task_id, for_update=True)
        ensure_task_access(service, user)
        if service['status'] not in ('Em andamento', 'Revisão solicitada', 'Em tradução', 'Ajuste solicitado'):
            raise HTTPException(409, 'Esta tarefa não está disponível para uma nova entrega.')
        version = connection.execute('SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM deliveries WHERE service_id = ?', (task_id,)).fetchone()['next_version']
        delivery_id, submitted_at = 'ENT-' + secrets.token_hex(6).upper(), now()
        first = prepared[0]
        connection.execute(
            '''INSERT INTO deliveries
               (id, service_id, version, translator_id, name, media_type, size, content, status, submitted_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aguardando avaliação', ?)''',
            (delivery_id, task_id, version, user['id'], first['name'], first['media_type'], len(first['content']), first['content'], submitted_at),
        )
        for position, document in enumerate(prepared):
            connection.execute(
                '''INSERT INTO delivery_files (delivery_id, position, name, media_type, size, content)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (delivery_id, position, document['name'], document['media_type'], len(document['content']), document['content']),
            )
        connection.execute("UPDATE services SET status = 'Aguardando avaliação', updated_at = ? WHERE id = ?", (submitted_at, task_id))
        file_note = f"Versão {version}: " + (first['name'] if len(prepared) == 1 else f"{len(prepared)} arquivos")
        if service['request_id'] and connection.execute('SELECT 1 FROM requests WHERE id = ?', (service['request_id'],)).fetchone():
            update_request_status(connection, service['request_id'], 'Aguardando avaliação', user, file_note, task_id, 'submittedAt')
        else:
            add_event(connection, 'Aguardando avaliação', service_id=task_id, actor=user, note=file_note, created_at=submitted_at)
        return delivery_record(connection, read_delivery(connection, delivery_id))


@router.post('/tasks/{task_id}/deliveries', status_code=201)
async def upload_task_delivery(task_id: str, files: list[UploadFile] | None = File(None), file: UploadFile | None = File(None), user: dict = Depends(translator)):
    """Recebe uma versão traduzida pela rota atual de tarefas."""
    return await _upload_delivery(task_id, files or ([file] if file else []), user)


@router.post('/services/{task_id}/deliveries', status_code=201, include_in_schema=False)
async def upload_service_delivery(task_id: str, files: list[UploadFile] | None = File(None), file: UploadFile | None = File(None), user: dict = Depends(translator)):
    """Mantém compatibilidade com a rota antiga de envio por serviços."""
    return await _upload_delivery(task_id, files or ([file] if file else []), user)


@router.get('/deliveries')
def list_deliveries(user: dict = Depends(staff)):
    """Lista para a equipe todas as versões recebidas, da mais recente para a mais antiga."""
    with database() as connection:
        deliveries = connection.execute(
            '''SELECT deliveries.*, services.title AS service_title,
                      translator_user.name AS translator_name, reviewer.name AS reviewer_name
               FROM deliveries JOIN services ON services.id = deliveries.service_id
               LEFT JOIN users AS translator_user ON translator_user.id = deliveries.translator_id
               LEFT JOIN users AS reviewer ON reviewer.id = deliveries.reviewed_by
               ORDER BY deliveries.submitted_at DESC, deliveries.version DESC''').fetchall()
        return [delivery_record(connection, delivery) for delivery in deliveries]


@router.get('/deliveries/{delivery_id}')
def delivery_detail(delivery_id: str, user: dict = Depends(staff)):
    """Retorna os metadados de uma entrega sem carregar seu arquivo na resposta."""
    with database() as connection:
        return delivery_record(connection, read_delivery(connection, delivery_id))


@router.get('/deliveries/{delivery_id}/file')
def download_delivery(delivery_id: str, user: dict = Depends(staff)):
    """Baixa o arquivo de uma entrega com cabeçalhos que evitam execução no navegador."""
    with database() as connection:
        delivery = read_delivery(connection, delivery_id)
        content = bytes(delivery['content'])
        filename = urlquote(delivery['name'], safe='')
        media_type = delivery['media_type']
    return Response(content=content, media_type=media_type,
                    headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'})


@router.get('/deliveries/{delivery_id}/files/{file_index}')
def download_delivery_file(delivery_id: str, file_index: int, user: dict = Depends(staff)):
    """Baixa um arquivo específico quando a versão contém vários documentos."""
    with database() as connection:
        delivery = read_delivery(connection, delivery_id)
        files = delivery_documents(connection, delivery)
        if file_index < 0 or file_index >= len(files):
            raise HTTPException(404, 'Arquivo da entrega não encontrado.')
        document = files[file_index]
        content = bytes(document['content'])
        filename = urlquote(document['name'], safe='')
        media_type = document['media_type']
    return Response(content=content, media_type=media_type,
                    headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'})


@router.post('/deliveries/{delivery_id}/review')
def review_delivery(delivery_id: str, review: DeliveryReview, user: dict = Depends(staff)):
    """Aprova ou devolve para revisão somente a versão mais recente da tarefa."""
    with database() as connection:
        delivery = read_delivery(connection, delivery_id, for_update=True)
        if delivery['status'] != 'Aguardando avaliação':
            raise HTTPException(409, 'Esta entrega já foi avaliada.')
        latest = connection.execute('SELECT id FROM deliveries WHERE service_id = ? ORDER BY version DESC LIMIT 1', (delivery['service_id'],)).fetchone()
        if not latest or latest['id'] != delivery_id:
            raise HTTPException(409, 'Somente a versão mais recente pode ser avaliada.')
        status = 'Entregue' if review.decision == 'approve' else 'Revisão solicitada'
        reviewed_at = now()
        connection.execute('UPDATE deliveries SET status = ?, feedback = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?',
                           (status, review.feedback or None, reviewed_at, user['id'], delivery_id))
        connection.execute('UPDATE services SET status = ?, updated_at = ?, ready_at = ?, delivered_at = ? WHERE id = ?',
                           (status, reviewed_at, reviewed_at if status == 'Entregue' else None,
                            reviewed_at if status == 'Entregue' else None, delivery['service_id']))
        service = read_service(connection, delivery['service_id'])
        if service['request_id'] and connection.execute('SELECT 1 FROM requests WHERE id = ?', (service['request_id'],)).fetchone():
            note = review.feedback or ('Tradução aprovada e serviço finalizado.' if status == 'Entregue' else '')
            update_request_status(connection, service['request_id'], status, user, note, service['id'],
                                  'deliveredAt' if status == 'Entregue' else 'revisionRequestedAt')
        else:
            add_event(connection, status, service_id=service['id'], actor=user, note=review.feedback, created_at=reviewed_at)
        return delivery_record(connection, read_delivery(connection, delivery_id))
