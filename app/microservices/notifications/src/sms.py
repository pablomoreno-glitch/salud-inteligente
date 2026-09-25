import logging
from dataclasses import dataclass

import httpx

from .config import settings

logger = logging.getLogger("notifications.sms")

# Two SMS segments. Twilio splits longer bodies, and every segment is billed.
MAX_BODY = 300


@dataclass
class SendResult:
    status: str  # sent | failed | skipped
    provider_id: str | None = None
    error: str | None = None


def format_pesos(value: int) -> str:
    return "$" + f"{value:,}".replace(",", ".")


def order_created_body(event) -> str:
    """Short Spanish summary of a new order for the business phone."""
    lines = ", ".join(f"{line.quantity}x {line.name}" for line in event.items)
    if event.total:
        total = format_pesos(event.total) + (" + por confirmar" if event.has_unpriced else "")
    else:
        total = "por confirmar"
    head = (
        f"Nuevo pedido {event.order_code} de {event.customer_name} "
        f"({event.customer_city}) Tel {event.customer_phone}. Total {total}. "
    )
    body = head + lines
    if len(body) > MAX_BODY:
        body = body[: MAX_BODY - 3].rstrip(" ,") + "..."
    return body


async def send_sms(to: str, body: str) -> SendResult:
    """Send one SMS through the Twilio Messages API. Never raises."""
    if not settings.sms_configured:
        return SendResult(status="skipped", error="Twilio no está configurado")

    data = {"To": to, "Body": body}
    if settings.twilio_messaging_service_sid:
        data["MessagingServiceSid"] = settings.twilio_messaging_service_sid
    else:
        data["From"] = settings.twilio_from_number

    url = f"{settings.twilio_api_base}/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url, data=data, auth=(settings.twilio_account_sid, settings.twilio_auth_token)
            )
    except httpx.HTTPError as exc:
        logger.error("Twilio no respondió: %s", exc)
        return SendResult(status="failed", error="No se pudo contactar a Twilio")

    payload = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
    if response.status_code >= 400:
        # Twilio error bodies carry a numeric code and a message, never our credentials.
        message = f"Twilio {response.status_code}: {payload.get('code')} {payload.get('message')}"
        logger.error(message)
        return SendResult(status="failed", error=message)
    return SendResult(status="sent", provider_id=payload.get("sid"))
