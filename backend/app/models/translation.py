"""Translation intake, quotes, assignments, reviews and document validation."""
import base64
import io
import re
import zipfile
from decimal import Decimal
from pathlib import Path
from typing import Literal
from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from app.core.languages import SUPPORTED_CODES, language as language_key
from app.database_pg import MAX_DELIVERY_BYTES
from app.models.translation_workflow import WorkflowType

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
        if any(language_key(value) not in SUPPORTED_CODES for value in (self.source, self.target)):
            raise ValueError('Selecione apenas idiomas disponíveis na lista.')
        if language_key(self.source) == language_key(self.target):
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
    workflowTemplateId: WorkflowType | None = None
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
