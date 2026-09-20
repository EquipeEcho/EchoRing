import bcrypt
from fastapi import APIRouter, HTTPException
from pymongo.errors import DuplicateKeyError
from app.database import usuarios
from app.models.usuario import UsuarioCreate, UsuarioOut

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.post("", response_model=UsuarioOut, status_code=201)
def criar_usuario(dados: UsuarioCreate):
    senha_hash = bcrypt.hashpw(dados.senha.encode(), bcrypt.gensalt()).decode()
    try:
        resultado = usuarios.insert_one({
            "username": dados.username,
            "email": dados.email,
            "passwordHash": senha_hash,
        })
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email ou username já cadastrado")

    return UsuarioOut(id=str(resultado.inserted_id), username=dados.username, email=dados.email)