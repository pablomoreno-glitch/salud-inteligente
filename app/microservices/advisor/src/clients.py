import httpx

from src.config import settings

CATALOG_TIMEOUT = 5.0
ANTHROPIC_TIMEOUT = 60.0
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


async def fetch_active_products() -> list[dict]:
    """Fetch the full product list from the catalog service (used to build advisor context)."""
    async with httpx.AsyncClient(timeout=CATALOG_TIMEOUT) as client:
        response = await client.get(
            f"{settings.CATALOG_URL}/products",
            params={"limit": 1000},
            headers={"X-Internal-Token": settings.INTERNAL_TOKEN},
        )
        response.raise_for_status()
        return response.json().get("items", [])


async def fetch_availability(refs: list[str]) -> dict[str, str]:
    """Public availability (available | low | out) per ref. Never raises: an inventory
    outage must not break the chat, so unknown refs are simply left out."""
    if not refs:
        return {}
    try:
        async with httpx.AsyncClient(timeout=CATALOG_TIMEOUT) as client:
            response = await client.get(
                f"{settings.INVENTORY_URL}/availability",
                params={"refs": ",".join(refs)},
                headers={"X-Internal-Token": settings.INTERNAL_TOKEN},
            )
            response.raise_for_status()
            return {row["ref"]: row["status"] for row in response.json()}
    except Exception:  # noqa: BLE001 - availability is a nicety; the chat must still answer
        return {}


class AnthropicError(Exception):
    """Raised when the Anthropic Messages API cannot be reached or returns an error."""


async def call_anthropic(system: str, messages: list[dict]) -> str:
    """Call the Anthropic Messages API and return the assistant's text reply."""
    async with httpx.AsyncClient(timeout=ANTHROPIC_TIMEOUT) as client:
        response = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.CLAUDE_MODEL,
                "max_tokens": 1024,
                "system": system,
                "messages": messages,
            },
        )
        data = response.json() if response.content else None
        if response.status_code >= 300 or data is None:
            raise AnthropicError(
                f"status={response.status_code} type={(data or {}).get('error', {}).get('type')} "
                f"message={(data or {}).get('error', {}).get('message')}"
            )
        blocks = data.get("content", [])
        text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
        return text
