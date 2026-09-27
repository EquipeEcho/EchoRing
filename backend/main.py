from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "Sucesso", "mensagem": "API Python rodando no Docker!"}