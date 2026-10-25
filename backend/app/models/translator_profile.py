"""Dados profissionais do tradutor, compartilhados entre rascunho e cadastro completo."""

import re
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.core.languages import SUPPORTED_CODES, language as language_key


class TranslatorLanguage(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(default='', max_length=80)
    level: Literal['Nativo', 'Fluente', 'Avançado', 'Intermediário'] = 'Fluente'

    @field_validator('name', mode='before')
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value


class TranslatorProfileDraft(BaseModel):
    model_config = ConfigDict(extra='forbid')
    fullName: str = Field(default='', max_length=160)
    phone: str = Field(default='', max_length=40)
    whatsapp: bool = False
    country: str = Field(default='', max_length=100)
    city: str = Field(default='', max_length=100)
    timezone: str = Field(default='', max_length=80)
    professionalTitle: str = Field(default='', max_length=160)
    bio: str = Field(default='', max_length=4000)
    languages: list[TranslatorLanguage] = Field(default_factory=list, max_length=30)
    education: str = Field(default='', max_length=3000)
    experienceYears: int | None = Field(default=None, ge=0, le=80, strict=True)
    experienceSummary: str = Field(default='', max_length=4000)
    specializations: list[str] = Field(default_factory=list, max_length=20)
    services: list[str] = Field(default_factory=list, max_length=20)
    tools: list[str] = Field(default_factory=list, max_length=30)
    certifications: str = Field(default='', max_length=3000)
    portfolioLinks: list[str] = Field(default_factory=list, max_length=10)
    availabilityHours: int | None = Field(default=None, ge=0, le=80, strict=True)
    availabilityNotes: str = Field(default='', max_length=1000)
    otherInformation: str = Field(default='', max_length=3000)

    @model_validator(mode='before')
    @classmethod
    def discard_legacy_translation_pairs(cls, value):
        # Existing JSONB records and older clients may still include this field.
        # Languages are now the only source of translation compatibility.
        if isinstance(value, dict):
            return {key: item for key, item in value.items() if key != 'translationPairs'}
        return value

    @field_validator(
        'fullName', 'phone', 'country', 'city', 'timezone', 'professionalTitle', 'bio',
        'education', 'experienceSummary', 'certifications', 'availabilityNotes',
        'otherInformation', mode='before',
    )
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator('specializations', 'services', 'tools')
    @classmethod
    def validate_tags(cls, values):
        result, seen = [], set()
        for value in values:
            value = value.strip()
            if not value or len(value) > 80:
                raise ValueError('Cada item deve conter de 1 a 80 caracteres.')
            if value.casefold() not in seen:
                result.append(value)
                seen.add(value.casefold())
        return result

    @field_validator('portfolioLinks')
    @classmethod
    def validate_links(cls, values):
        result = []
        for value in values:
            value = value.strip()
            try:
                parsed = urlsplit(value)
                valid = parsed.scheme in ('http', 'https') and parsed.hostname and not parsed.username and not parsed.password
            except ValueError:
                valid = False
            if len(value) > 500 or re.search(r'\s', value) or not valid:
                raise ValueError('Informe links HTTP ou HTTPS válidos para o portfólio.')
            if value not in result:
                result.append(value)
        return result


class TranslatorProfileComplete(TranslatorProfileDraft):
    @model_validator(mode='after')
    def validate_completion(self):
        if len(self.fullName) < 2 or len(self.country) < 2 or len(self.city) < 2:
            raise ValueError('Preencha nome completo, país e cidade.')
        if not re.fullmatch(r'[+()\d\s.\-/]+', self.phone) or not 7 <= len(re.sub(r'\D', '', self.phone)) <= 15:
            raise ValueError('Informe um telefone válido, incluindo o código da região.')
        languages = [language_key(item.name) for item in self.languages]
        if any(name not in SUPPORTED_CODES for name in languages):
            raise ValueError('Selecione apenas idiomas disponíveis na lista.')
        if len(languages) < 2 or any(not name for name in languages) or len(set(languages)) != len(languages):
            raise ValueError('Informe pelo menos dois idiomas diferentes e seus níveis de domínio.')
        if len(self.education) < 10:
            raise ValueError('Descreva sua formação, incluindo cursos ou formação autodidata.')
        if self.experienceYears is None or len(self.experienceSummary) < 20:
            raise ValueError('Informe o tempo de experiência e descreva sua trajetória profissional.')
        if not self.specializations:
            raise ValueError('Adicione pelo menos uma especialização ou área de atuação.')
        return self
