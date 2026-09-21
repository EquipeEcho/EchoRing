import os
from pymongo import MongoClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://db-mongo:27017")
client = MongoClient(MONGO_URL)

db = client["EchoRing"]        # use o nome do banco que aparece no Compass
usuarios = db["usuario"]       # mesma collection que você criou

# são esses índices que fazem o DuplicateKeyError acontecer
usuarios.create_index("email", unique=True)
usuarios.create_index("username", unique=True)