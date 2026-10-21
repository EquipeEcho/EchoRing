import mongomock
import pytest
from bson import ObjectId
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.tarefa import StatusTarefa
from app.routes import tarefas as rota_tarefas

TRADUTOR = "trad-1"
OUTRO_TRADUTOR = "trad-2"


@pytest.fixture
def colecao(monkeypatch):
    col = mongomock.MongoClient().echoring_test.tarefas
    monkeypatch.setattr(rota_tarefas, "tarefas", col)
    return col


@pytest.fixture
def client(colecao):
    app = FastAPI()
    app.include_router(rota_tarefas.router)
    return TestClient(app)


def criar_tarefa(col, tradutor_id=TRADUTOR, status=StatusTarefa.pendente):
    res = col.insert_one({"tradutor_id": tradutor_id, "status": status.value})
    return str(res.inserted_id)


def test_tradutor_aceita(client, colecao):
    tid = criar_tarefa(colecao)
    r = client.post(f"/tarefas/{tid}/validacao", json={"tradutor_id": TRADUTOR, "aceito": True})

    assert r.status_code == 200
    assert r.json()["status"] == StatusTarefa.aceita.value
    assert r.json()["mensagem"] == "Tarefa aceita"

    doc = colecao.find_one({"_id": ObjectId(tid)})
    assert doc["status"] == StatusTarefa.aceita.value
    assert "respondido_em" in doc
    assert "motivo_recusa" not in doc


def test_tradutor_recusa_com_motivo(client, colecao):
    tid = criar_tarefa(colecao)
    r = client.post(
        f"/tarefas/{tid}/validacao",
        json={"tradutor_id": TRADUTOR, "aceito": False, "motivo_recusa": "sem tempo"},
    )

    assert r.status_code == 200
    assert r.json()["status"] == StatusTarefa.recusada.value
    assert r.json()["mensagem"] == "Tarefa recusada"

    doc = colecao.find_one({"_id": ObjectId(tid)})
    assert doc["status"] == StatusTarefa.recusada.value
    assert doc["motivo_recusa"] == "sem tempo"


def test_id_malformado_retorna_400(client):
    r = client.post("/tarefas/1/validacao", json={"tradutor_id": TRADUTOR, "aceito": True})
    assert r.status_code == 400


def test_tarefa_inexistente_retorna_404(client):
    r = client.post(
        f"/tarefas/{ObjectId()}/validacao", json={"tradutor_id": TRADUTOR, "aceito": True}
    )
    assert r.status_code == 404


def test_outro_tradutor_retorna_403_e_nao_altera(client, colecao):
    tid = criar_tarefa(colecao)
    r = client.post(
        f"/tarefas/{tid}/validacao", json={"tradutor_id": OUTRO_TRADUTOR, "aceito": True}
    )

    assert r.status_code == 403
    doc = colecao.find_one({"_id": ObjectId(tid)})
    assert doc["status"] == StatusTarefa.pendente.value


def test_tarefa_ja_respondida_retorna_409(client, colecao):
    tid = criar_tarefa(colecao, status=StatusTarefa.aceita)
    r = client.post(f"/tarefas/{tid}/validacao", json={"tradutor_id": TRADUTOR, "aceito": False})
    assert r.status_code == 409


def test_nao_responde_duas_vezes(client, colecao):
    tid = criar_tarefa(colecao)
    corpo = {"tradutor_id": TRADUTOR, "aceito": True}
    assert client.post(f"/tarefas/{tid}/validacao", json=corpo).status_code == 200
    assert client.post(f"/tarefas/{tid}/validacao", json=corpo).status_code == 409


def test_corpo_invalido_retorna_422(client, colecao):
    tid = criar_tarefa(colecao)
    r = client.post(f"/tarefas/{tid}/validacao", json={})
    assert r.status_code == 422