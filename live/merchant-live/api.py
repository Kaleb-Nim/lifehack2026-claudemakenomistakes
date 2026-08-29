"""HTTP seam between the merchant onboarding app and the live catalogue.

`demo/merchant` is a Next.js app and this is Python, so the integration point
is HTTP rather than an import. Deliberately tiny: one endpoint to publish
confirmed products, one to read back what a merchant has live, one health
check.

Run it:

    uvicorn api:app --port 8090

Then from the merchant app:

    await fetch("http://localhost:8090/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ merchant_name, products }),
    })
"""

from __future__ import annotations

import logging
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from catalog import db, writer

load_dotenv()

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Pluto merchant catalogue")


class Product(BaseModel):
    title: str
    # Cents throughout, matching the consumer bot's tool contract, so a price
    # never crosses this boundary as a float.
    price_cents: int
    category: str | None = None
    description: str | None = None
    brand: str | None = None
    product_type: str | None = None
    sku: str | None = None
    tags: list[str] = Field(default_factory=list)
    currency: str = "SGD"
    available: bool = True
    image_url: str | None = None
    product_url: str | None = None


class PublishRequest(BaseModel):
    merchant_name: str
    products: list[Product]


@app.on_event("startup")
def _startup() -> None:
    # Idempotent, so the widening migration is applied wherever this runs.
    db.apply_schema()
    logger.info("Catalogue schema applied; merchant-live ready.")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": db.ping()}


@app.post("/publish")
def publish(request: PublishRequest) -> dict[str, Any]:
    """Publish confirmed products so the consumer agent can find them."""
    try:
        published = writer.publish(
            [p.model_dump() for p in request.products],
            merchant_name=request.merchant_name,
        )
    except ValueError as exc:
        # A bad product is the caller's mistake; say which one and why.
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Publish failed")
        raise HTTPException(
            status_code=502, detail="Could not reach the catalogue."
        ) from exc

    logger.info("Published %d product(s) for %s", len(published), request.merchant_name)
    return {"published": published, "count": len(published)}


@app.get("/products")
def products(merchant_name: str) -> dict[str, Any]:
    """What this merchant currently has live."""
    listed = writer.list_published(merchant_name)
    return {"products": listed, "count": len(listed)}
