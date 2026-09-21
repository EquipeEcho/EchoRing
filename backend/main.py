from fastapi import FastAPI
from app.routes.usuarios import router as usuarios_router
from app.routes.auth import router as auth_router

app = FastAPI()

app.include_router(usuarios_router)
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"status": "Sucesso", "mensagem": "API Python rodando no Docker!"}