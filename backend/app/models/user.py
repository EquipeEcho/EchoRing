"""Platform account management schemas."""
import re
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator

class UserCreate(BaseModel):
    """Valida os dados usados pelo administrador para cadastrar uma conta."""
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=6, max_length=128)
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
