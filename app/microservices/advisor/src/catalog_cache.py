import asyncio
import time

from src.clients import fetch_active_products

CACHE_TTL_SECONDS = 600  # 10 minutes


def format_price(value: int) -> str:
    return "$" + format(value, ",").replace(",", ".")


def build_catalog_text(products: list[dict]) -> str:
    """Group active products by need and render one descriptive line per product."""
    needs: dict[str, list[dict]] = {}
    for product in products:
        if not product.get("is_active", True):
            continue
        need = product.get("need") or {}
        need_name = need.get("name", "Otros")
        needs.setdefault(need_name, []).append(product)

    sections = []
    for need_name, items in needs.items():
        lines = [f"{need_name}:"]
        for product in items:
            benefits = "; ".join(product.get("benefits", [])[:3]) or "Suplemento dietario"
            price = product.get("price")
            price_part = f"; {format_price(price)}" if price else ""
            lines.append(f"- {product['name']} (REF. {product['ref']}) - {benefits}{price_part}")
        sections.append("\n".join(lines))

    body = "\n\n".join(sections)
    return f"CATÁLOGO DE SUPLEMENTOS DISPONIBLES:\n\n{body}"


class CatalogCache:
    """In-memory cache of the advisor's catalog context, refreshed at most every 10 minutes."""

    def __init__(self, ttl_seconds: int = CACHE_TTL_SECONDS):
        self._ttl = ttl_seconds
        self._lock = asyncio.Lock()
        self._text: str | None = None
        self._products_by_ref: dict[str, dict] = {}
        self._fetched_at: float | None = None

    def snapshot(self) -> tuple[str | None, dict[str, dict]]:
        """Return whatever is currently cached, without triggering a fetch."""
        return self._text, self._products_by_ref

    async def get(self) -> tuple[str, dict[str, dict]]:
        """Return the cached catalog text and ref->product map, refreshing if stale."""
        now = time.monotonic()
        async with self._lock:
            is_fresh = self._text is not None and self._fetched_at is not None and (now - self._fetched_at) < self._ttl
            if is_fresh:
                return self._text, self._products_by_ref

            try:
                products = await fetch_active_products()
            except Exception:
                if self._text is not None:
                    # Serve the stale cache rather than failing a chat because of a transient blip.
                    return self._text, self._products_by_ref
                raise

            self._text = build_catalog_text(products)
            self._products_by_ref = {p["ref"]: p for p in products if p.get("is_active", True)}
            self._fetched_at = now
            return self._text, self._products_by_ref


catalog_cache = CatalogCache()
