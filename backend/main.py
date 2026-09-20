import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from requests_api import router


class BodyLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] not in ('POST', 'PATCH'):
            return await self.app(scope, receive, send)
        body = bytearray()
        while True:
            event = await receive()
            if event['type'] == 'http.disconnect':
                return
            body.extend(event.get('body', b''))
            if len(body) > 8 * 1024 * 1024:
                return await JSONResponse({'detail': 'Solicitação muito grande. Limite total: 5 MB de documentos.'}, status_code=413)(scope, receive, send)
            if not event.get('more_body'):
                break
        delivered = False

        async def buffered_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {'type': 'http.request', 'body': bytes(body), 'more_body': False}
            return await receive()

        await self.app(scope, buffered_receive, send)

app = FastAPI()
app.add_middleware(BodyLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            'CORS_ORIGINS', 'http://localhost:8081,http://127.0.0.1:8081'
        ).split(',')
        if origin.strip()
    ],
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)

app.include_router(router)

@app.get("/")
def read_root():
    return {"status": "Sucesso", "mensagem": "API Python rodando no Docker!"}
