"""Connection to the shared Postgres + ParadeDB catalogue.

The same instance `live/consumer-bot-live` searches. Writing here is what
closes the loop: a product the merchant confirms becomes findable by the
consumer agent, rather than the two halves being connected by narration.
"""

from __future__ import annotations

import os
from pathlib import Path

import psycopg

_DATABASE_URL_ENV = "CATALOG_DATABASE_URL"
_RAILWAY_DATABASE_URL_ENV = "DATABASE_PUBLIC_URL"

SCHEMA_DIR = Path(__file__).resolve().parents[1] / "schema"


def database_url() -> str:
    url = os.environ.get(_DATABASE_URL_ENV) or os.environ.get(_RAILWAY_DATABASE_URL_ENV)
    if not url:
        raise RuntimeError(
            f"{_DATABASE_URL_ENV} is not set. Copy .env.example to .env and "
            "fill it in with the Railway Postgres+ParadeDB service's "
            "DATABASE_PUBLIC_URL."
        )
    return url


def get_connection() -> psycopg.Connection:
    """Open a connection to the catalogue. Caller closes it."""
    return psycopg.connect(database_url())


def apply_schema() -> None:
    """Apply this app's migrations. Idempotent, safe to run on every boot."""
    statements = sorted(SCHEMA_DIR.glob("*.sql"))
    with get_connection() as conn:
        with conn.cursor() as cur:
            for path in statements:
                cur.execute(path.read_text(encoding="utf-8"))
        conn.commit()


def ping() -> bool:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1")
        return cur.fetchone() == (1,)
