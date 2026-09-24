import os
import aiofiles
from fastapi import UploadFile

class StorageService:
    @staticmethod
    async def save_file(file: UploadFile, upload_dir: str) -> str:
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        
        async with aiofiles.open(file_path, "wb") as out_file:
            while chunk := await file.read(1024 * 1024):
                await out_file.write(chunk)
                
        return file_path