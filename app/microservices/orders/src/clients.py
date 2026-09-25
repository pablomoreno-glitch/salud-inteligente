import logging

import httpx

from src.config import settings

logger = logging.getLogger("orders.clients")

TIMEOUT = 5.0


def _headers() -> dict[str, str]:
    return {"X-Internal-Token": settings.INTERNAL_TOKEN}


class StockConflict(Exception):
    """Raised when inventory cannot reserve stock for one or more refs."""

    def __init__(self, refs: list[str]):
        self.refs = refs
        super().__init__(f"Stock insuficiente para: {', '.join(refs)}")


async def get_products_by_refs(refs: list[str]) -> list[dict]:
    """Fetch product snapshots for a set of refs from the catalog service."""
    if not refs:
        return []
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(
            f"{settings.CATALOG_URL}/products/by-refs",
            params={"refs": ",".join(refs)},
            headers=_headers(),
        )
        response.raise_for_status()
        return response.json()


async def reserve_stock(order_code: str, items: list[dict]) -> None:
    """Reserve stock for an order. Raises StockConflict on 409, propagates other errors."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{settings.INVENTORY_URL}/stock/reserve",
            json={"order_code": order_code, "items": items},
            headers=_headers(),
        )
        if response.status_code == 409:
            body = response.json()
            raise StockConflict(body.get("refs", []))
        response.raise_for_status()


async def release_stock(order_code: str) -> None:
    """Compensating call: release whatever stock the order had reserved. Best-effort."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{settings.INVENTORY_URL}/stock/release",
                json={"order_code": order_code},
                headers=_headers(),
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("No se pudo liberar el stock del pedido %s: %s", order_code, exc)


async def get_whatsapp_number() -> str | None:
    """Fetch the configured business WhatsApp number. Never raises: returns None if unreachable."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(f"{settings.BUSINESS_URL}/contacts", headers=_headers())
            response.raise_for_status()
            return response.json().get("whatsapp")
    except httpx.HTTPError as exc:
        logger.warning("No se pudo obtener el WhatsApp del negocio: %s", exc)
        return None
