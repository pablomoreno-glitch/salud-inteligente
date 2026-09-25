from datetime import datetime

from pydantic import BaseModel, Field


class AvailabilityOut(BaseModel):
    ref: str
    status: str


class StockOut(BaseModel):
    ref: str
    quantity: int | None
    low_stock_threshold: int
    status: str
    tracked: bool
    updated_at: datetime


class StockListOut(BaseModel):
    items: list[StockOut]
    total: int


class StockPatch(BaseModel):
    quantity: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)


class ReserveItem(BaseModel):
    ref: str
    quantity: int = Field(gt=0)


class ReserveRequest(BaseModel):
    order_code: str
    items: list[ReserveItem] = Field(min_length=1)


class ReleaseRequest(BaseModel):
    order_code: str


class MovementOut(BaseModel):
    id: int
    ref: str
    delta: int
    reason: str
    order_code: str | None
    created_at: datetime


class SummaryOut(BaseModel):
    tracked: int
    untracked: int
    low: int
    out: int
