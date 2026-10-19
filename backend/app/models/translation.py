"""Pydantic schemas and document validation for translation workflows."""

import base64
import io
import re
import zipfile
from decimal import Decimal
from pathlib import Path
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from app.database_pg import MAX_DELIVERY_BYTES


class Login(BaseModel):
    email: str = Field(max_length=160)
    password: str = Field(max_length=1024)


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=6, max_length=128)
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


class Attachment(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    size: int = Field(gt=0, le=2 * 1024 * 1024)
    content: str = Field(max_length=2_800_000)

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
    message: str = Field(default='', max_length=3000)

    @model_validator(mode='after')
    def validate_quote(self):
        self.amount = self.amount.strip()
        self.delivery = self.delivery.strip()
        self.message = self.message.strip()
        if not self.delivery or not re.fullmatch(r'\d{1,8}([.,]\d{1,2})?', self.amount) or Decimal(self.amount.replace(',', '.')) <= 0:
            raise ValueError('Informe valor positivo e prazo.')
        return self


class Update(BaseModel):
    status: str | None = None
    quote: Quote | None = None


class QuoteDecision(BaseModel):
    token: str = Field(min_length=32, max_length=256)
    decision: Literal['approve', 'decline']


class TranslatorAssignment(BaseModel):
    translatorId: str = Field(min_length=1, max_length=160)
    deadline: str = Field(min_length=1, max_length=160)
    observations: str = Field(default='', max_length=3000)

    @field_validator('translatorId', 'deadline', 'observations', mode='before')
    @classmethod
    def trim_assignment(cls, value):
        return value.strip() if isinstance(value, str) else value


class DeliveryReview(BaseModel):
    decision: Literal['approve', 'request_revision']
    feedback: str = Field(default='', max_length=3000)

    @model_validator(mode='after')
    def validate_review(self):
        self.feedback = self.feedback.strip()
        if self.decision == 'request_revision' and not self.feedback:
            raise ValueError('Explique ao tradutor a revisão necessária.')
        return self


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