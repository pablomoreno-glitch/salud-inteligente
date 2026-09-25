from typing import Any

from pydantic import BaseModel


class CartItemUpdate(BaseModel):
    quantity: int
    source: str | None = None


class CheckoutRequest(BaseModel):
    cart_token: str
    customer_name: str
    customer_phone: str
    customer_city: str
    notes: str | None = None


class StatusUpdate(BaseModel):
    status: str


AnyDict = dict[str, Any]
