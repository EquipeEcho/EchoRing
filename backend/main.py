from fastapi import FastAPI
from app.routes.usuarios import router as usuarios_router

app = FastAPI()

app.include_router(usuarios_router)

@app.get("/")
def read_root():
    return {"status": "Sucesso", "mensagem": "API Python rodando no Docker!"}