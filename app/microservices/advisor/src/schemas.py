from pydantic import BaseModel


class Recommendation(BaseModel):
    ref: str
    slug: str | None = None
    name: str | None = None
    reason: str | None = None
    image_url: str | None = None
    price: int | None = None


class ChatResponse(BaseModel):
    reply: str
    recommendations: list[Recommendation]
    model: str
