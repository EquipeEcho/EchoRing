import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
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

@app.get("/")
def read_root():
    return {"status": "Sucesso", "mensagem": "API Python rodando no Docker!"}
