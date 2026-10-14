from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from app.database import tarefas
from app.models.tarefa import (
    StatusTarefa,
    ValidacaoTraducaoIn,
    ValidacaoTraducaoOut,
)

router = APIRouter(prefix="/tarefas", tags=["tarefas"])


@router.post("/{tarefa_id}/validacao", response_model=ValidacaoTraducaoOut)
def validar_traducao(tarefa_id: str, dados: ValidacaoTraducaoIn):
    try:
        oid = ObjectId(tarefa_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de tarefa inválido")

    novo_status = StatusTarefa.aceita if dados.aceito else StatusTarefa.recusada

    campos = {
        "status": novo_status.value,
        "respondido_em": datetime.now(timezone.utc),
    }
    if not dados.aceito:
        campos["motivo_recusa"] = dados.motivo_recusa

    # Só atualiza se a tarefa for deste tradutor e ainda estiver pendente
    tarefa = tarefas.find_one_and_update(
        {"_id": oid, "tradutor_id": dados.tradutor_id, "status": StatusTarefa.pendente.value},
        {"$set": campos},
        return_document=ReturnDocument.AFTER,
    )

    if tarefa is None:
        existente = tarefas.find_one({"_id": oid}, {"tradutor_id": 1, "status": 1})
        if existente is None:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada")
        if existente.get("tradutor_id") != dados.tradutor_id:
            raise HTTPException(status_code=403, detail="Tarefa não atribuída a este tradutor")
        raise HTTPException(status_code=409, detail="Tarefa já foi respondida")

    return ValidacaoTraducaoOut(
        tarefa_id=tarefa_id,
        status=novo_status,
        mensagem="Tarefa aceita" if dados.aceito else "Tarefa recusada",
    )