"""Conexão com o MongoDB, usada pelos dados que ficam fora do PostgreSQL."""

import os

from pymongo import MongoClient

_client = None


def get_db():
    """Devolve o banco do Mongo, criando a conexão só no primeiro uso."""
    global _client
    if _client is None:
        _client = MongoClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017'), serverSelectionTimeoutMS=5000)
    return _client[os.getenv('MONGO_DB', 'echoring')]