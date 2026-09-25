from fastapi import Header, HTTPException

from src.config import settings


async def require_internal(x_internal_token: str | None = Header(default=None, alias="X-Internal-Token")) -> None:
    """Guard for internal-only endpoints: rejects any call without the shared internal token."""
    if x_internal_token != settings.INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="No autorizado")
