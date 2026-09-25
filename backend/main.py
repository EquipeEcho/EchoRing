from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, Depends, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from functions.uploud import SolicitacaoUploadFacade
from database.conection import engine, get_postgres_db
from database.schema_db import Base

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(BodyLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            'CORS_ORIGINS', 'http://localhost:8081,http://127.0.0.1:8081'
        ).split(',')
        if origin.strip()
    ],
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)

app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/upload", status_code=status.HTTP_201_CREATED)
async def create_upload(
    name: str = Form(...),
    email: str = Form(...),
    file: UploadFile = File(...),
    phone: Optional[str] = Form(None),
    company: Optional[str] = Form(None),
    service: Optional[str] = Form(None),
    source_lang: Optional[str] = Form(None),
    target_lang: Optional[str] = Form(None),
    message: Optional[str] = Form(None),
    consent: Optional[str] = Form(None),
    db: Session = Depends(get_postgres_db)
):
    try:
        facade = SolicitacaoUploadFacade(db)
        
        nova_solicitacao = await facade.upload_solicitacao(
            file=file,
            nome=name,
            email=email,
            telefone=phone,
            empresa=company,
            trad_de=source_lang,
            trad_para=target_lang,
            servico=service,
            observacao=message
        )

        return {
            "success": True,
            "id": nova_solicitacao.id,
            "message": "Solicitação gravada com sucesso!"
        }

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Erro interno: {str(e)}"
        )