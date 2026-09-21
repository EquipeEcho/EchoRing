from pydantic import BaseModel, EmailStr, Field

class UsuarioCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=72)  # bcrypt aceita até 72 bytes
    role: str

class UsuarioOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    role: str