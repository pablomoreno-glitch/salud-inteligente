from datetime import datetime

from pydantic import BaseModel, Field


class OrderLine(BaseModel):
    name: str
    quantity: int = Field(ge=1)


class OrderCreatedEvent(BaseModel):
    order_code: str
    customer_name: str
    customer_phone: str
    customer_city: str
    items: list[OrderLine] = Field(min_length=1)
    total: int | None = None
    has_unpriced: bool = False


class NotificationOut(BaseModel):
    id: int
    channel: str
    event: str
    recipient: str
    body: str
    order_code: str | None
    status: str
    provider_id: str | None
    error: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
