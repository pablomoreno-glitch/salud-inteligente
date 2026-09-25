import json
import re

from fastapi import HTTPException

MAX_HISTORY = 20
MAX_CONTENT_LENGTH = 4000
MAX_RECOMMENDATIONS = 4

SYSTEM_TEMPLATE = """Eres un asesor de bienestar natural amigable para una tienda de suplementos en Colombia. Tu trabajo es escuchar síntomas o necesidades del cliente y recomendar productos del catálogo.

AVISO DE SALUD (obligatorio, normativa INVIMA):
- Los productos del catálogo son SUPLEMENTOS DIETARIOS, NO son medicamentos. Nunca digas que curan, tratan o previenen enfermedades.
- No diagnosticas enfermedades ni reemplazas la consulta médica.
- Si el cliente menciona síntomas graves o persistentes, embarazo o lactancia, que toma medicamentos, o si la consulta es para un niño o niña, recomiéndale expresamente consultar a un profesional de la salud antes de tomar cualquier suplemento.

REGLAS IMPORTANTES:
1. NUNCA diagnostiques enfermedades ni reemplaces al médico. Ante condiciones médicas serias, recomienda siempre ver un profesional de salud.
2. Recomienda MÁXIMO 3 o 4 productos — los más relevantes para lo que describe el cliente.
3. Sé cálido, empático y usa lenguaje colombiano natural y cercano.
4. Para cada producto explica brevemente POR QUÉ es bueno para lo que describió el cliente.
5. SIEMPRE termina tu respuesta con el bloque JSON en este formato exacto (sin espacios extra):
RECS:[{"ref":"VW-158","nombre":"Magnesium Complex 8 en 1","razon":"Reduce el estrés y mejora la calidad del sueño"},{"ref":"CM-14","nombre":"Ashwagandha Colon Max","razon":"Equilibra el cortisol, ideal para ansiedad y descanso"}]
6. Si el cliente saluda o hace preguntas generales sin síntomas, responde con amabilidad y pide que describa qué busca. En ese caso NO incluyas el bloque RECS.
7. Responde siempre en español colombiano.
8. No atribuyas a un producto beneficios sin respaldo (por ejemplo, aumento de tamaño corporal o crecimiento de pestañas por colágeno).

__CATALOG__"""


def build_system_prompt(catalog_text: str) -> str:
    return SYSTEM_TEMPLATE.replace("__CATALOG__", catalog_text)


def validate_messages(body: dict) -> list[dict]:
    """Validate and trim the chat history, mirroring the legacy chat.js contract."""
    if not isinstance(body, dict) or not isinstance(body.get("messages"), list) or len(body.get("messages")) == 0:
        raise HTTPException(400, 'El campo "messages" es obligatorio y debe ser un arreglo con al menos un mensaje.')

    raw_messages = body["messages"]

    def is_valid(message) -> bool:
        return (
            isinstance(message, dict)
            and message.get("role") in ("user", "assistant")
            and isinstance(message.get("content"), str)
            and 0 < len(message.get("content")) <= MAX_CONTENT_LENGTH
        )

    if not all(is_valid(m) for m in raw_messages):
        raise HTTPException(
            400,
            'Cada mensaje debe tener "role" (user | assistant) y "content" (texto no vacío, máximo '
            f"{MAX_CONTENT_LENGTH} caracteres).",
        )

    messages = [{"role": m["role"], "content": m["content"]} for m in raw_messages[-MAX_HISTORY:]]
    while messages and messages[0]["role"] != "user":
        messages.pop(0)
    if not messages:
        raise HTTPException(400, "La conversación debe incluir al menos un mensaje del usuario.")

    return messages


def parse_recommendations(reply: str) -> tuple[str, list[dict]]:
    """Split the RECS:[...] block from the reply. Tolerates trailing whitespace and code fences."""
    marker = "RECS:"
    idx = reply.rfind(marker)
    if idx == -1:
        return reply.strip(), []

    clean_reply = reply[:idx].rstrip()
    tail = reply[idx + len(marker):]

    match = re.search(r"\[.*\]", tail, re.DOTALL)
    if not match:
        return clean_reply, []

    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return clean_reply, []

    if not isinstance(data, list):
        return clean_reply, []

    return clean_reply, data


def enrich_recommendations(raw_recs: list[dict], products_by_ref: dict[str, dict]) -> list[dict]:
    """Keep only real, active refs, cap at MAX_RECOMMENDATIONS, dedupe and enrich with catalog data."""
    seen: set[str] = set()
    enriched = []
    for item in raw_recs:
        if not isinstance(item, dict):
            continue
        ref = item.get("ref")
        if not isinstance(ref, str) or ref in seen:
            continue
        product = products_by_ref.get(ref)
        if product is None:
            continue
        seen.add(ref)
        enriched.append(
            {
                "ref": ref,
                "slug": product.get("slug"),
                "name": product.get("name"),
                "reason": item.get("razon"),
                "image_url": product.get("image_url"),
                "price": product.get("price"),
            }
        )
        if len(enriched) >= MAX_RECOMMENDATIONS:
            break
    return enriched
