from fastapi import APIRouter, HTTPException, status
from app.database import usuarios
from app.models.usuario import LoginRequest, TokenResponse
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(dados: LoginRequest):
    user = usuarios.find_one({"email": dados.email})

    if not user or not verify_password(dados.senha, user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )

    token_data = {"sub": str(user["_id"]), "role": user["role"]}
    return TokenResponse(access_token=create_access_token(token_data))