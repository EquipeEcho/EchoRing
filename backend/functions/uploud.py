import os
import uuid
from typing import Optional
import puremagic
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from database.schema_db import Solicitacao

# --- CONFIGURAÇÕES ---
UPLOAD_DIR = "/app/uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc"
}

os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- SUBSISTEMAS ---

class FileValidatorService:
    """Subsistema responsável por validar regras de arquivo (Tamanho e MIME)."""
    
    @staticmethod
    async def validate_size(file: UploadFile) -> int:
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="O arquivo excede o limite permitido de 10 MB."
            )
        return file_size

    @staticmethod
    async def validate_mime_type(file: UploadFile) -> str:
        header = await file.read(2048)
        await file.seek(0)

        try:
            matches = puremagic.from_string(header, mime=True)
            detected_mime = matches if isinstance(matches, str) else matches[0]
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível verificar a integridade do arquivo."
            )

        if detected_mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de arquivo não permitido ({detected_mime}). Apenas PDF e DOC/DOCX são aceitos."
            )
        return detected_mime


class StorageService:
    """Subsistema responsável por salvar o arquivo em disco."""

    @staticmethod
    async def save_file(file: UploadFile, extension: str) -> tuple[str, str]:
        unique_filename = f"{uuid.uuid4().hex}{extension}"
        destination_path = os.path.join(UPLOAD_DIR, unique_filename)

        if not os.path.abspath(destination_path).startswith(os.path.abspath(UPLOAD_DIR)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Caminho de arquivo inválido."
            )

        try:
            with open(destination_path, "wb") as buffer:
                while chunk := await file.read(1024 * 1024):
                    buffer.write(chunk)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao salvar o arquivo em disco."
            )

        return unique_filename, destination_path


class SolicitacaoRepository:
    """Subsistema responsável por gravar a Solicitação no banco de dados."""

    @staticmethod
    def create_solicitacao_record(
        db: Session,
        nome: str,
        email: str,
        caminho_arquivo: str,
        telefone: Optional[str] = None,
        empresa: Optional[str] = None,
        trad_de: Optional[str] = None,
        trad_para: Optional[str] = None,
        servico: Optional[str] = None,
        observacao: Optional[str] = None,
        funcionario_id: Optional[int] = None
    ) -> Solicitacao:
        solicitacao_entry = Solicitacao(
            nome=nome,
            email=email,
            telefone=telefone,
            empresa=empresa,
            trad_de=trad_de,
            trad_para=trad_para,
            servico=servico,
            observacao=observacao,
            arquivos=caminho_arquivo,
            funcionario_id=funcionario_id
        )
        db.add(solicitacao_entry)
        db.commit()
        db.refresh(solicitacao_entry)
        return solicitacao_entry


# --- FACADE ---

class SolicitacaoUploadFacade:
    def __init__(self, db: Session):
        self.db = db
        self.validator = FileValidatorService()
        self.storage = StorageService()
        self.repository = SolicitacaoRepository()

    async def upload_solicitacao(
        self,
        file: UploadFile,
        nome: str,
        email: str,
        telefone: Optional[str] = None,
        empresa: Optional[str] = None,
        trad_de: Optional[str] = None,
        trad_para: Optional[str] = None,
        servico: Optional[str] = None,
        observacao: Optional[str] = None,
        funcionario_id: Optional[int] = None
    ) -> Solicitacao:
        # 1. Validações do arquivo
        _ = await self.validator.validate_size(file)
        detected_mime = await self.validator.validate_mime_type(file)

        # 2. Armazenamento físico
        extension = ALLOWED_MIME_TYPES[detected_mime]
        _, destination_path = await self.storage.save_file(file, extension)

        # 3. Persistência na tabela "solicitacoes"
        solicitacao = self.repository.create_solicitacao_record(
            db=self.db,
            nome=nome,
            email=email,
            telefone=telefone,
            empresa=empresa,
            trad_de=trad_de,
            trad_para=trad_para,
            servico=servico,
            observacao=observacao,
            caminho_arquivo=destination_path,
            funcionario_id=funcionario_id
        )

        return solicitacao