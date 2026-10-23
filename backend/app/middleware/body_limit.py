"""Request body size guard for the portal API."""

import re
from starlette.responses import JSONResponse
from app.database_pg import MAX_DELIVERY_TOTAL_BYTES


class BodyLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] not in ('POST', 'PATCH'):
            return await self.app(scope, receive, send)
        upload = scope['method'] == 'POST' and re.fullmatch(r'/(tasks|services)/[^/]+/deliveries/?', scope['path'])
        # Multipart boundaries and headers need space beyond the document total.
        limit = MAX_DELIVERY_TOTAL_BYTES + 1024 * 1024 if upload else 8 * 1024 * 1024
        document_limit = 20 if upload else 5
        body = bytearray()
        while True:
            event = await receive()
            if event['type'] == 'http.disconnect':
                return
            body.extend(event.get('body', b''))
            if len(body) > limit:
                return await JSONResponse({'detail': f'Solicitação muito grande. Limite total: {document_limit} MB de documentos.'}, status_code=413)(scope, receive, send)
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
