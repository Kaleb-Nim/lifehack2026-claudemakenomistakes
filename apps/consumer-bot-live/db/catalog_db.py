"""Connection to the Postgres + ParadeDB catalog instance (hosted on Railway).

ParadeDB adds BM25 lexical search (`pg_search`) and vector search on top of
plain Postgres, which is what the `product discovery` tool's hybrid
lexical+semantic search runs against.

This module only owns the connection. Query shapes depend on the catalog
schema already loaded on Railway (tables/columns, which extensions are
enabled, embedding dimensions) — confirm that schema before writing search
queries in tools/product_discovery.py.
"""

from __future__ import annotations

import os

import psycopg

_CATALOG_DATABASE_URL_ENV = "CATALOG_DATABASE_URL"


def get_connection() -> psycopg.Connection:
    """Open a new connection to the ParadeDB catalog instance.

    Callers are responsible for closing the connection (or using it as a
    context manager: `with get_connection() as conn: ...`).
    """
    database_url = os.environ.get(_CATALOG_DATABASE_URL_ENV)
    if not database_url:
        raise RuntimeError(
            f"{_CATALOG_DATABASE_URL_ENV} is not set. Copy .env.example to "
            ".env and fill it in with the Railway Postgres+ParadeDB "
            "service's DATABASE_PUBLIC_URL."
        )
    return psycopg.connect(database_url)


def ping() -> bool:
    """Return True if the catalog database is reachable."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1")
        return cur.fetchone() == (1,)


def execute(sql: str, params: tuple | None = None) -> list[tuple]:
    """Run a read query against the catalog DB and return all rows.

    Generic passthrough for now — replace with typed query functions
    (e.g. `search_products_lexical`, `search_products_semantic`) once the
    catalog schema is confirmed.
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()
