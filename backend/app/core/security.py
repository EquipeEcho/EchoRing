"""Password hashing and in-process authentication rate limits."""
import hashlib
import hmac
import secrets
import threading
import time
from fastapi import HTTPException, Request

_lock = threading.Lock()
_attempts: dict[tuple[str, str], list[float]] = {}
PASSWORD_ITERATIONS = 600_000
SESSION_SECONDS = 8 * 60 * 60


def throttle(request: Request, category: str, maximum: int):
    """Limita tentativas por IP e categoria dentro de uma janela de um minuto."""
    key = (request.client.host if request.client else 'unknown', category)
    timestamp = time.time()
    with _lock:
        for old_key in list(_attempts):
            _attempts[old_key] = [value for value in _attempts[old_key] if value > timestamp - 60]
            if not _attempts[old_key]:
                del _attempts[old_key]
        values = _attempts.setdefault(key, [])
        if len(values) >= maximum:
            raise HTTPException(429, 'Muitas tentativas. Aguarde um minuto e tente novamente.')
        values.append(timestamp)


def hash_password(password: str):
    """Gera um hash PBKDF2 com salt próprio para nunca guardar a senha original."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, PASSWORD_ITERATIONS)
    return f'pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}'


def password_matches(password: str, encoded: str):
    """Compara a senha recebida com o hash salvo sem expor diferenças de tempo."""
    try:
        algorithm, iterations, salt, expected = encoded.split('$', 3)
        if algorithm != 'pbkdf2_sha256':
            return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (TypeError, ValueError):
        return False
