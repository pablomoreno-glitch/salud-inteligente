from pydantic import BaseModel, Field, field_validator


class CategoryRef(BaseModel):
    slug: str
    name: str


class NeedRef(BaseModel):
    slug: str
    name: str


class CategoryOut(BaseModel):
    slug: str
    name: str
    tagline: str | None
    product_count: int


class NeedOut(BaseModel):
    slug: str
    name: str
    image_url: str
    product_count: int


class ProductOut(BaseModel):
    ref: str
    slug: str
    name: str
    category: CategoryRef
    need: NeedRef
    type: str | None
    format: str | None
    presentation: str | None
    invima: str | None
    benefits: list[str]
    description: str
    advisor_tags: list[str]
    image_url: str
    price: int | None
    is_viral: bool
    is_trending: bool
    is_active: bool


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int
    limit: int
    offset: int


class ProductPatch(BaseModel):
    price: int | None = None
    description: str | None = None
    is_active: bool | None = None
    name: str | None = None
    benefits: list[str] | None = None

    @field_validator("price")
    @classmethod
    def price_must_be_positive_or_null(cls, value: int | None) -> int | None:
        if value is not None and value <= 0:
            raise ValueError("el precio debe ser nulo o un entero positivo")
        return value


class SummaryOut(BaseModel):
    products: int
    active: int
    unpriced: int
