"""Translation intake, private staff inbox and SMTP quote delivery."""
import base64
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import smtplib
import sqlite3
import ssl
import threading
import time
import zipfile
from contextlib import contextmanager
from datetime import datetime, timezone
from decimal import Decimal
from email.message import EmailMessage
from pathlib import Path
from typing import Literal
from urllib.parse import quote

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


@contextmanager
def database():
    path = Path(os.getenv('REQUESTS_DB_PATH', str(Path(__file__).parent / '.local' / 'requests.sqlite3')))
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=30)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute('CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, data TEXT NOT NULL, sending INTEGER NOT NULL DEFAULT 0)')
        connection.execute('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1)')
        connection.execute('CREATE TABLE IF NOT EXISTS sessions (digest TEXT PRIMARY KEY, expires REAL NOT NULL, user_id TEXT)')
        connection.execute('''CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY, request_id TEXT, title TEXT NOT NULL, translator_id TEXT NOT NULL,
            status TEXT NOT NULL, deadline TEXT, created_at TEXT NOT NULL
        )''')
        connection.execute('''CREATE TABLE IF NOT EXISTS deliveries (
            id TEXT PRIMARY KEY, service_id TEXT NOT NULL, version INTEGER NOT NULL,
            translator_id TEXT NOT NULL, name TEXT NOT NULL, media_type TEXT NOT NULL,
            size INTEGER NOT NULL, content BLOB NOT NULL, status TEXT NOT NULL,
            feedback TEXT, submitted_at TEXT NOT NULL, reviewed_at TEXT, reviewed_by TEXT,
            UNIQUE(service_id, version)
        )''')
        session_columns = {column['name'] for column in connection.execute('PRAGMA table_info(sessions)')}
        if 'user_id' not in session_columns:
            connection.execute('ALTER TABLE sessions ADD COLUMN user_id TEXT')
        connection.execute('CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions (user_id)')
        connection.execute('CREATE INDEX IF NOT EXISTS services_translator_id ON services (translator_id)')
        connection.execute('CREATE INDEX IF NOT EXISTS deliveries_service_id ON deliveries (service_id, version)')
        connection.execute('CREATE INDEX IF NOT EXISTS deliveries_status ON deliveries (status, submitted_at)')
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def now():
    return datetime.now(timezone.utc).isoformat()


def throttle(request: Request, category: str, maximum: int):
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
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, PASSWORD_ITERATIONS)
    return f'pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}'


def password_matches(password: str, encoded: str):
    try:
        algorithm, iterations, salt, expected = encoded.split('$', 3)
        if algorithm != 'pbkdf2_sha256':
            return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (TypeError, ValueError):
        return False


def configured_accounts():
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
                'email': email,
                'password': password,
                'name': os.getenv(f'{prefix}_NAME', default_name).strip() or default_name,
                'role': role,
            })
    return accounts


def sync_configured_accounts(connection, accounts):
    for account in accounts:
        existing = connection.execute('SELECT password_hash FROM users WHERE email = ?', (account['email'],)).fetchone()
        password_hash = existing['password_hash'] if existing and password_matches(account['password'], existing['password_hash']) else hash_password(account['password'])
        connection.execute(
            '''INSERT INTO users (id, email, name, role, password_hash, active) VALUES (?, ?, ?, ?, ?, 1)
               ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role,
               password_hash = excluded.password_hash, active = 1''',
            (account['id'], account['email'], account['name'], account['role'], password_hash),
        )


def authenticated_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
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
    if user['role'] not in ('admin', 'employee'):
        raise HTTPException(403, 'Sua conta não tem permissão para acessar esta área.')
    return user


def translator(user: dict = Depends(authenticated_user)):
    if user['role'] != 'translator':
        raise HTTPException(403, 'Somente o tradutor atribuído pode enviar a tradução.')
    return user


def administrator(user: dict = Depends(authenticated_user)):
    if user['role'] != 'admin':
        raise HTTPException(403, 'Somente o administrador geral pode gerenciar usuários.')
    return user


def public_user(user):
    return {key: user[key] for key in ('name', 'email', 'role')}


class Login(BaseModel):
    email: str = Field(max_length=160)
    password: str = Field(max_length=1024)


@router.post('/auth/login')
@router.post('/staff/login', include_in_schema=False)
def login(data: Login, request: Request):
    throttle(request, 'auth-login', 5)
    accounts = configured_accounts()
    with database() as connection:
        sync_configured_accounts(connection, accounts)
        candidate = connection.execute('SELECT * FROM users WHERE email = ?', (data.email.strip().lower(),)).fetchone()
    # The fallback performs the same expensive check when the account does not exist.
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
    return public_user(user)


@router.post('/auth/logout')
@router.post('/staff/logout', include_in_schema=False)
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), user: dict = Depends(authenticated_user)):
    digest = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    with database() as connection:
        connection.execute('DELETE FROM sessions WHERE digest = ?', (digest,))
    return {'ok': True}


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=12, max_length=128)
    role: Literal['employee', 'translator', 'hr']

    @field_validator('name', 'email', mode='before')
    @classmethod
    def trim_user(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode='after')
    def validate_user(self):
        self.email = self.email.lower()
        if not re.fullmatch(r'[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+', self.email):
            raise ValueError('E-mail inválido.')
        if not self.name:
            raise ValueError('Informe o nome do usuário.')
        return self


def user_record(user):
    return {**{key: user[key] for key in ('id', 'name', 'email', 'role')}, 'active': bool(user['active'])}


@router.get('/users')
def list_users(admin: dict = Depends(administrator)):
    with database() as connection:
        sync_configured_accounts(connection, configured_accounts())
        users = connection.execute('SELECT id, name, email, role, active FROM users ORDER BY name COLLATE NOCASE').fetchall()
    return [user_record(user) for user in users]


@router.post('/users', status_code=201)
def create_user(data: UserCreate, admin: dict = Depends(administrator)):
    try:
        with database() as connection:
            if connection.execute('SELECT 1 FROM users WHERE email = ?', (data.email,)).fetchone():
                raise HTTPException(409, 'Já existe uma conta com este e-mail.')
            user_id = secrets.token_hex(16)
            connection.execute(
                'INSERT INTO users (id, email, name, role, password_hash, active) VALUES (?, ?, ?, ?, ?, 1)',
                (user_id, data.email, data.name, data.role, hash_password(data.password)),
            )
            user = connection.execute('SELECT id, name, email, role, active FROM users WHERE id = ?', (user_id,)).fetchone()
    except sqlite3.IntegrityError as error:
        raise HTTPException(409, 'Já existe uma conta com este e-mail.') from error
    return user_record(user)


class Attachment(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    size: int = Field(gt=0, le=2 * 1024 * 1024)
    content: str = Field(max_length=2800000)

    @model_validator(mode='after')
    def validate_document(self):
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
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode='after')
    def validate_intake(self):
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
    amount: str = Field(min_length=1, max_length=12)
    delivery: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=3000)

    @model_validator(mode='after')
    def validate_quote(self):
        self.delivery = self.delivery.strip()
        self.message = self.message.strip()
        if not self.delivery or not self.message or not re.fullmatch(r'\d{1,8}([.,]\d{1,2})?', self.amount) or Decimal(self.amount.replace(',', '.')) <= 0:
            raise ValueError('Informe valor positivo, prazo e mensagem.')
        return self


class Update(BaseModel):
    status: str | None = None
    quote: Quote | None = None


class DeliveryReview(BaseModel):
    decision: Literal['approve', 'request_adjustment']
    feedback: str = Field(default='', max_length=3000)

    @model_validator(mode='after')
    def validate_review(self):
        self.feedback = self.feedback.strip()
        if self.decision == 'request_adjustment' and not self.feedback:
            raise ValueError('Explique ao tradutor o ajuste necessário.')
        return self


def read_request(connection, request_id):
    row = connection.execute('SELECT data, sending FROM requests WHERE id = ?', (request_id,)).fetchone()
    if not row:
        raise HTTPException(404, 'Solicitação não encontrada.')
    return json.loads(row['data']), row['sending']


def summary(data):
    return {**data, 'attachments': [{**file, 'content': ''} for file in data['attachments']]}


def read_service(connection, service_id):
    service = connection.execute('SELECT * FROM services WHERE id = ?', (service_id,)).fetchone()
    if not service:
        raise HTTPException(404, 'Serviço não encontrado.')
    return service


def read_delivery(connection, delivery_id):
    delivery = connection.execute(
        '''SELECT deliveries.*, services.title AS service_title,
                  translator_user.name AS translator_name, reviewer.name AS reviewer_name
           FROM deliveries JOIN services ON services.id = deliveries.service_id
           LEFT JOIN users AS translator_user ON translator_user.id = deliveries.translator_id
           LEFT JOIN users AS reviewer ON reviewer.id = deliveries.reviewed_by
           WHERE deliveries.id = ?''',
        (delivery_id,),
    ).fetchone()
    if not delivery:
        raise HTTPException(404, 'Entrega não encontrada.')
    return delivery


def delivery_record(delivery):
    record = {
        'id': delivery['id'], 'serviceId': delivery['service_id'],
        'serviceTitle': delivery['service_title'], 'version': delivery['version'],
        'translatorName': delivery['translator_name'], 'name': delivery['name'],
        'mediaType': delivery['media_type'], 'size': delivery['size'],
        'status': delivery['status'], 'submittedAt': delivery['submitted_at'],
    }
    if delivery['feedback']:
        record['feedback'] = delivery['feedback']
    if delivery['reviewed_at']:
        record['reviewedAt'] = delivery['reviewed_at']
    if delivery['reviewer_name']:
        record['reviewerName'] = delivery['reviewer_name']
    return record


def validate_delivery_document(name, content):
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


@router.post('/services/{service_id}/deliveries', status_code=201)
async def upload_delivery(service_id: str, file: UploadFile = File(...), user: dict = Depends(translator)):
    name = (file.filename or '').strip()
    content = await file.read(MAX_DELIVERY_BYTES + 1)
    await file.close()
    media_type = validate_delivery_document(name, content)
    with database() as connection:
        connection.execute('BEGIN IMMEDIATE')
        service = read_service(connection, service_id)
        if service['translator_id'] != user['id']:
            raise HTTPException(403, 'Este serviço não está atribuído à sua conta.')
        if service['status'] not in ('Em tradução', 'Ajuste solicitado'):
            raise HTTPException(409, 'Este serviço não está disponível para uma nova entrega.')
        version = connection.execute(
            'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM deliveries WHERE service_id = ?',
            (service_id,),
        ).fetchone()['next_version']
        delivery_id, submitted_at = 'ENT-' + secrets.token_hex(6).upper(), now()
        connection.execute(
            '''INSERT INTO deliveries
               (id, service_id, version, translator_id, name, media_type, size, content, status, submitted_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Em revisão', ?)''',
            (delivery_id, service_id, version, user['id'], name, media_type, len(content), content, submitted_at),
        )
        connection.execute("UPDATE services SET status = 'Em revisão' WHERE id = ?", (service_id,))
        delivery = read_delivery(connection, delivery_id)
    return delivery_record(delivery)


@router.get('/deliveries')
def list_deliveries(user: dict = Depends(staff)):
    with database() as connection:
        deliveries = connection.execute(
            '''SELECT deliveries.*, services.title AS service_title,
                      translator_user.name AS translator_name, reviewer.name AS reviewer_name
               FROM deliveries JOIN services ON services.id = deliveries.service_id
               LEFT JOIN users AS translator_user ON translator_user.id = deliveries.translator_id
               LEFT JOIN users AS reviewer ON reviewer.id = deliveries.reviewed_by
               ORDER BY deliveries.submitted_at DESC, deliveries.version DESC'''
        ).fetchall()
    return [delivery_record(delivery) for delivery in deliveries]


@router.get('/deliveries/{delivery_id}')
def delivery_detail(delivery_id: str, user: dict = Depends(staff)):
    with database() as connection:
        return delivery_record(read_delivery(connection, delivery_id))


@router.get('/deliveries/{delivery_id}/file')
def download_delivery(delivery_id: str, user: dict = Depends(staff)):
    with database() as connection:
        delivery = read_delivery(connection, delivery_id)
        content = bytes(delivery['content'])
        filename = quote(delivery['name'], safe='')
        media_type = delivery['media_type']
    return Response(
        content=content, media_type=media_type,
        headers={'Content-Disposition': f"attachment; filename*=UTF-8''{filename}", 'X-Content-Type-Options': 'nosniff'},
    )


@router.post('/deliveries/{delivery_id}/review')
def review_delivery(delivery_id: str, review: DeliveryReview, user: dict = Depends(staff)):
    with database() as connection:
        connection.execute('BEGIN IMMEDIATE')
        delivery = read_delivery(connection, delivery_id)
        if delivery['status'] != 'Em revisão':
            raise HTTPException(409, 'Esta entrega já foi revisada.')
        latest = connection.execute(
            'SELECT id FROM deliveries WHERE service_id = ? ORDER BY version DESC LIMIT 1',
            (delivery['service_id'],),
        ).fetchone()
        if not latest or latest['id'] != delivery_id:
            raise HTTPException(409, 'Somente a versão mais recente pode ser revisada.')
        status = 'Aprovado' if review.decision == 'approve' else 'Ajuste solicitado'
        reviewed_at = now()
        connection.execute(
            '''UPDATE deliveries SET status = ?, feedback = ?, reviewed_at = ?, reviewed_by = ?
               WHERE id = ?''',
            (status, review.feedback or None, reviewed_at, user['id'], delivery_id),
        )
        connection.execute('UPDATE services SET status = ? WHERE id = ?', (status, delivery['service_id']))
        delivery = read_delivery(connection, delivery_id)
    return delivery_record(delivery)


@router.post('/requests', status_code=201)
def create_request(data: Intake, request: Request):
    throttle(request, 'intake', 10)
    record = {**data.model_dump(), 'id': 'SOL-' + secrets.token_hex(6).upper(), 'createdAt': now(), 'status': 'Recebido', 'demo': False}
    with database() as connection:
        connection.execute('INSERT INTO requests (id, data) VALUES (?, ?)', (record['id'], json.dumps(record, ensure_ascii=False)))
    return summary(record)


@router.get('/requests', dependencies=[Depends(staff)])
def list_requests():
    with database() as connection:
        rows = connection.execute('SELECT data FROM requests ORDER BY rowid DESC').fetchall()
    return [summary(json.loads(row['data'])) for row in rows]


@router.get('/requests/{request_id}', dependencies=[Depends(staff)])
def detail(request_id: str):
    with database() as connection:
        data, _ = read_request(connection, request_id)
    return data


@router.patch('/requests/{request_id}', dependencies=[Depends(staff)])
def update_request(request_id: str, changes: Update):
    if changes.status is not None and changes.status != 'Em análise':
        raise HTTPException(422, 'Status inválido.')
    with database() as connection:
        connection.execute('BEGIN IMMEDIATE')
        data, sending = read_request(connection, request_id)
        if sending or data['status'] == 'Orçamento enviado':
            raise HTTPException(409, 'Este orçamento já foi enviado ou está em envio.')
        if changes.status:
            data['status'] = changes.status
        if changes.quote:
            data['quote'] = changes.quote.model_dump()
            data['status'] = 'Em análise'
        connection.execute('UPDATE requests SET data = ? WHERE id = ?', (json.dumps(data, ensure_ascii=False), request_id))
    return data


def deliver_quote(data):
    host, sender = os.getenv('SMTP_HOST', ''), os.getenv('SMTP_FROM', '')
    if not host or not sender:
        raise HTTPException(503, 'O envio de e-mails não foi configurado. O orçamento continua salvo como rascunho.')
    quote = data['quote']
    amount = f"{Decimal(quote['amount'].replace(',', '.')):,.2f}".replace(',', '_').replace('.', ',').replace('_', '.')
    message = EmailMessage()
    message['From'] = sender
    message['To'] = data['email']
    message['Subject'] = f"Orçamento Aliança Traduções · {data['id']}"
    message.set_content(f"Olá, {data['name']}!\n\nSegue nossa proposta para {data['title']}.\n\nServiço: {data['service']}\nIdiomas: {data['source']} → {data['target']}\nValor: R$ {amount}\nPrazo: {quote['delivery']}\n\n{quote['message']}\n\nPara aprovar ou tirar dúvidas, responda a este e-mail.\n\nAliança Traduções\nProtocolo: {data['id']}")
    context = ssl.create_default_context()
    implicit_tls = os.getenv('SMTP_SECURITY', 'starttls') == 'ssl'
    factory = smtplib.SMTP_SSL if implicit_tls else smtplib.SMTP
    port = int(os.getenv('SMTP_PORT', '465' if implicit_tls else '587'))
    kwargs = {'context': context} if implicit_tls else {}
    with factory(host, port, timeout=15, **kwargs) as smtp:
        if not implicit_tls:
            smtp.starttls(context=context)
        if os.getenv('SMTP_USER'):
            smtp.login(os.environ['SMTP_USER'], os.getenv('SMTP_PASSWORD', ''))
        smtp.send_message(message)


@router.post('/requests/{request_id}/send-quote', dependencies=[Depends(staff)])
def send_quote(request_id: str):
    with database() as connection:
        connection.execute('BEGIN IMMEDIATE')
        data, sending = read_request(connection, request_id)
        if sending or data['status'] == 'Orçamento enviado':
            raise HTTPException(409, 'Este orçamento já foi enviado ou está em envio.')
        if not data.get('quote'):
            raise HTTPException(422, 'Salve o orçamento antes de enviar.')
        connection.execute('UPDATE requests SET sending = 1 WHERE id = ?', (request_id,))
    try:
        deliver_quote(data)
    except Exception as error:
        with database() as connection:
            connection.execute('UPDATE requests SET sending = 0 WHERE id = ?', (request_id,))
        if isinstance(error, HTTPException):
            raise
        raise HTTPException(502, 'Não foi possível confirmar o envio pelo provedor. O rascunho foi preservado; confira a caixa de saída antes de tentar novamente.') from error
    data.update(status='Orçamento enviado', emailSentAt=now())
    with database() as connection:
        connection.execute('UPDATE requests SET data = ?, sending = 0 WHERE id = ?', (json.dumps(data, ensure_ascii=False), request_id))
    return data
