"""Exercise streamed body limits without a database or large HTTP fixtures."""
import unittest
from app.middleware.body_limit import BodyLimitMiddleware


class BodyLimitTests(unittest.IsolatedAsyncioTestCase):
    async def request(self, path, size):
        messages = []
        remaining = size

        async def receive():
            nonlocal remaining
            chunk = min(1024 * 1024, remaining)
            remaining -= chunk
            return {'type': 'http.request', 'body': b'x' * chunk, 'more_body': remaining > 0}

        async def send(message):
            messages.append(message)

        async def application(scope, receive, send):
            message = await receive()
            self.assertEqual(len(message['body']), size)
            await send({'type': 'http.response.start', 'status': 200, 'headers': []})

        await BodyLimitMiddleware(application)({'type': 'http', 'method': 'POST', 'path': path}, receive, send)
        return messages[0]['status']

    async def test_delivery_limit_allows_twenty_megabytes_and_multipart_overhead(self):
        for path in ('/tasks/TRD-TEST/deliveries', '/services/TRD-TEST/deliveries'):
            self.assertEqual(await self.request(path, 20 * 1024 * 1024 + 10000), 200)
            self.assertEqual(await self.request(path, 21 * 1024 * 1024 + 1), 413)

    async def test_public_intake_and_other_posts_keep_the_smaller_limit(self):
        self.assertEqual(await self.request('/requests', 8 * 1024 * 1024), 200)
        self.assertEqual(await self.request('/requests', 8 * 1024 * 1024 + 1), 413)
        self.assertEqual(await self.request('/auth/login', 8 * 1024 * 1024 + 1), 413)
