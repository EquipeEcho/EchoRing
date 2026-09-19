from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os

app = FastAPI()

# Configuração do CORS para permitir que o Expo (React Native) acesse a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sua rota original de teste do Docker
@app.get("/")
def read_root():
    return {"status": "Sucesso", "mensagem": "API Python rodando no Docker!"}

# Diretório para salvar os uploads temporariamente ou via volume do Docker
UPLOAD_DIR = "documents/traduzidos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Novo endpoint para a Issue #14
@app.post("/api/upload")
async def receber_traducao(
    file: UploadFile = File(...),
    servico_id: str = Form(...),
    status: str = Form(...)
):
    # 1. Salva o arquivo localmente (ou no volume do container)
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Espaço reservado para as futuras integrações com os bancos da FATEC
    print(f"\n[PostgreSQL] Simulação: UPDATE servicos SET status = '{status}' WHERE id = '{servico_id}';")
    print(f"[MongoDB] Simulação: Log salvo para o documento '{file.filename}' do serviço '{servico_id}'.\n")

    return {
        "mensagem": "Arquivo recebido com sucesso",
        "arquivo_salvo": file.filename,
        "status_atualizado": status
    }