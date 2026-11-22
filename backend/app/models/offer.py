"""Validated terms shared by every recipient of an offer send."""

from datetime import date, datetime, timezone
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import Literal
from app.models.translation_workflow import WorkflowType


class OfferSend(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    translatorIds: list[str] = Field(default_factory=list, max_length=100)
    audience: Literal['selected', 'all'] = 'selected'
    workflowTemplateId: WorkflowType | None = None
    compensation: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    deadline: date
    expiresAt: datetime
    description: str = Field(min_length=1, max_length=3000)
    requirements: str = Field(default='', max_length=3000)
    volume: str = Field(min_length=1, max_length=160)

    @field_validator('translatorIds')
    @classmethod
    def recipients(cls, values):
        if any(not item.strip() or len(item) > 160 for item in values):
            raise ValueError('Destinatário inválido.')
        return list(dict.fromkeys(item.strip() for item in values))

    @model_validator(mode='after')
    def dates(self):
        if (self.audience == 'selected' and not self.translatorIds) or (self.audience == 'all' and self.translatorIds):
            raise ValueError('Selecione destinatários ou publique para todos, sem combinar as duas opções.')
        current = datetime.now(timezone.utc)
        if self.expiresAt.tzinfo is None or self.expiresAt <= current:
            raise ValueError('Informe uma validade futura com fuso horário.')
        if self.deadline < current.date() or self.expiresAt.date() > self.deadline:
            raise ValueError('O prazo deve ser futuro e posterior à validade da oferta.')
        return self
