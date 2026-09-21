import os
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, Depends, status
from sqlalchemy.orm import Session
from functions.uploud import SolicitacaoUploadFacade
from database.conection import get_postgres_db

app = FastAPI()

@app.post("/upload/", status_code=status.HTTP_201_CREATED)
async def upload_solicitacao_endpoint(
    file: UploadFile = File(...),
    nome: str = Form(...),
    email: str = Form(...),
    telefone: Optional[str] = Form(None),
    empresa: Optional[str] = Form(None),
    trad_de: Optional[str] = Form(None),
    trad_para: Optional[str] = Form(None),
    servico: Optional[str] = Form(None),
    observacao: Optional[str] = Form(None),
    funcionario_id: Optional[int] = Form(None),
    db: Session = Depends(get_postgres_db)
):
    facade = SolicitacaoUploadFacade(db)
    
    solicitacao = await facade.upload_solicitacao(
        file=file,
        nome=nome,
        email=email,
        telefone=telefone,
        empresa=empresa,
        trad_de=trad_de,
        trad_para=trad_para,
        servico=servico,
        observacao=observacao,
        funcionario_id=funcionario_id
    )

    return {
        "message": "Solicitação e arquivo enviados com sucesso!",
        "solicitacao_id": getattr(solicitacao, "id", None),
        "nome": solicitacao.nome,
        "email": solicitacao.email,
        "caminho_arquivo": solicitacao.arquivos
    }