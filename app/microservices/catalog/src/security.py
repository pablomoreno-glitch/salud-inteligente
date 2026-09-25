from fastapi import Header, HTTPException

from .config import settings


async def require_internal(x_internal_token: str | None = Header(default=None)) -> None:
    """Reject any call that does not carry the shared internal token.

    This is defense in depth behind the Docker network boundary: the gateway
    is the only caller expected to reach internal endpoints directly.
    """
    if x_internal_token != settings.internal_token:
        raise HTTPException(status_code=401, detail="No autorizado")
