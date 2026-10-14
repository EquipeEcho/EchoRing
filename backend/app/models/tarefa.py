from enum import Enum
from pydantic import BaseModel


class StatusTarefa(str, Enum):
    pendente = "pendente"
    aceita = "aceita"
    recusada = "recusada"


class ValidacaoTraducaoIn(BaseModel):
    tradutor_id: str
    aceito: bool
    motivo_recusa: str | None = None


class ValidacaoTraducaoOut(BaseModel):
    tarefa_id: str
    status: StatusTarefa
    mensagem: str