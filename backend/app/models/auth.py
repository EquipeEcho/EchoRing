"""Authentication request schemas."""
from pydantic import BaseModel, Field

class Login(BaseModel):
    """Dados mínimos aceitos para iniciar uma sessão."""
    email: str = Field(max_length=160)
    password: str = Field(max_length=1024)
