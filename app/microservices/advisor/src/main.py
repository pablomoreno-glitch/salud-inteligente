import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.advisor import (
    build_system_prompt,
    enrich_recommendations,
    mentioned_products,
    parse_recommendations,
    validate_messages,
)
from src.catalog_cache import catalog_cache
from src.clients import AnthropicError, call_anthropic, fetch_availability
from src.config import settings
from src.database import get_db, init_db
from src.errors import register_error_handlers
from src.models import AdvisorEvent
from src.security import require_internal

logger = logging.getLogger("advisor")

GENERIC_UPSTREAM_ERROR = "El asesor no está disponible en este momento. Intenta de nuevo en unos minutos."


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)
register_error_handlers(app)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "advisor"}


@app.post("/chat")
async def chat(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "El cuerpo de la petición no es un JSON válido.")

    messages = validate_messages(body)

    if not settings.ANTHROPIC_API_KEY:
        logger.error("Falta la variable de entorno ANTHROPIC_API_KEY")
        raise HTTPException(500, "El asesor no está configurado en el servidor. Intenta más tarde.")

    try:
        catalog_text, products_by_ref = await catalog_cache.get()
    except Exception as exc:
        logger.error("No se pudo obtener el catálogo para el asesor: %s", exc)
        raise HTTPException(502, GENERIC_UPSTREAM_ERROR)

    system_prompt = build_system_prompt(catalog_text)

    try:
        raw_reply = await call_anthropic(system_prompt, messages)
    except (AnthropicError, httpx.HTTPError) as exc:
        logger.error("Error al contactar la API de Anthropic: %s", exc)
        raise HTTPException(502, GENERIC_UPSTREAM_ERROR)

    reply, raw_recs = parse_recommendations(raw_reply)
    if not raw_recs:
        # The model named products but forgot the RECS block: still show them as cards.
        raw_recs = mentioned_products(reply, products_by_ref)
    recommendations = enrich_recommendations(raw_recs, products_by_ref)
    availability = await fetch_availability([r["ref"] for r in recommendations])
    for rec in recommendations:
        rec["availability"] = availability.get(rec["ref"], "available")

    event = AdvisorEvent(
        message_count=len(messages),
        recommended_refs=json.dumps([r["ref"] for r in recommendations]),
    )
    db.add(event)
    await db.commit()

    return {"reply": reply, "recommendations": recommendations, "model": settings.CLAUDE_MODEL}


@app.get("/stats", dependencies=[Depends(require_internal)])
async def stats(days: int = Query(30, ge=1, le=365), db: AsyncSession = Depends(get_db)):
    start_dt = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    result = await db.execute(select(AdvisorEvent).where(AdvisorEvent.created_at >= start_dt))
    events = result.scalars().all()

    conversations = len(events)
    counts: dict[str, int] = {}
    for event in events:
        for ref in json.loads(event.recommended_refs):
            counts[ref] = counts.get(ref, 0) + 1
    total_recommendations = sum(counts.values())

    _, products_by_ref = catalog_cache.snapshot()
    top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:5]
    top_recommended = [
        {"ref": ref, "name": products_by_ref.get(ref, {}).get("name", ref), "count": count}
        for ref, count in top
    ]

    return {
        "conversations": conversations,
        "recommendations": total_recommendations,
        "top_recommended": top_recommended,
    }
