"""Statistics agent request schema."""
from pydantic import BaseModel, Field, field_validator


class AgentQuestion(BaseModel):
    """Pergunta enviada pelo administrador ao agente de estatística."""
    pergunta: str = Field(min_length=3, max_length=500)

    @field_validator('pergunta', mode='before')
    @classmethod
    def trim_question(cls, value):
        """Remove espaços nas pontas antes de validar o tamanho."""
        return value.strip() if isinstance(value, str) else value
