"""Approved document catalog with codes and aliases for legacy language labels."""

import json
import unicodedata
from pathlib import Path


def normalized(value):
    return ''.join(char for char in unicodedata.normalize('NFKD', value.strip().casefold())
                   if not unicodedata.combining(char))


LANGUAGES = json.loads((Path(__file__).resolve().parents[1] / 'data' / 'languages.json').read_text(encoding='utf-8'))
ALIASES = {normalized(alias): item['code'] for item in LANGUAGES for alias in [*item['aliases'], item['name']]}
# A canonical UI label takes precedence over a legacy spelling of another language.
ALIASES.update({normalized(item['name']): item['code'] for item in LANGUAGES})
SUPPORTED_CODES = {item['code'] for item in LANGUAGES}


def language(value):
    return ALIASES.get(normalized(value), normalized(value))
