import os
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from functions.storage import StorageService

from database.schema_db import Solicitacao 

class SolicitacaoUploadFacade:
    def __init__(self, db: Session):
        self.db = db

    async def upload_solicitacao(self, file: UploadFile, **kwargs):
        saved_file_path = None
        try:
            saved_file_path = await StorageService.save_file(file, upload_dir="uploads")
            
            nova_solicitacao = Solicitacao(
                arquivos=saved_file_path,
                **kwargs
            )
            
            self.db.add(nova_solicitacao)
            self.db.commit()
            self.db.refresh(nova_solicitacao)
            
            return nova_solicitacao

        except Exception as err:
            self.db.rollback()
            if saved_file_path and os.path.exists(saved_file_path):
                try:
                    os.remove(saved_file_path)
                except OSError:
                    pass
            raise err