"""Background worker lifecycle for the portal API."""

import asyncio
import logging
from contextlib import asynccontextmanager, suppress


@asynccontextmanager
async def lifespan(app):
    from app.services.offers_service import expire_pending_offers

    async def expiration_worker():
        while True:
            await asyncio.sleep(60)
            try:
                await asyncio.to_thread(expire_pending_offers)
            except Exception:
                logging.getLogger(__name__).exception('Falha ao atualizar ofertas expiradas; nova tentativa em 60 segundos.')

    worker = asyncio.create_task(expiration_worker())
    try:
        yield
    finally:
        worker.cancel()
        with suppress(asyncio.CancelledError):
            await worker
