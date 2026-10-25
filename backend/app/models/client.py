"""Client contact validation from the client registration flow."""
import re
from pydantic import BaseModel, Field, field_validator, model_validator

class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: str = Field(min_length=3, max_length=160)
    company: str = Field(default='', max_length=160)

    @field_validator('name', 'email', 'company', mode='before')
    @classmethod
    def trim_client_fields(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode='after')
    def validate_client(self):
        self.email = self.email.lower()
        if not self.name:
            raise ValueError('Informe o nome do cliente.')
        if not re.fullmatch(r'[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+', self.email):
            raise ValueError('E-mail inválido.')
        return self
