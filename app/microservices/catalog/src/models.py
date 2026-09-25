from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Category(Base):
    __tablename__ = "categories"

    slug: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    tagline: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Need(Base):
    __tablename__ = "needs"

    slug: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))


class Product(Base):
    __tablename__ = "products"

    ref: Mapped[str] = mapped_column(String(32), primary_key=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    category_slug: Mapped[str] = mapped_column(ForeignKey("categories.slug"))
    need_slug: Mapped[str] = mapped_column(ForeignKey("needs.slug"))
    type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    format: Mapped[str | None] = mapped_column(String(120), nullable=True)
    presentation: Mapped[str | None] = mapped_column(String(120), nullable=True)
    invima: Mapped[str | None] = mapped_column(String(60), nullable=True)
    benefits: Mapped[list] = mapped_column(JSON, default=list)
    advisor_tags: Mapped[list] = mapped_column(JSON, default=list)
    image: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_viral: Mapped[bool] = mapped_column(Boolean, default=False)
    is_trending: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    search_text: Mapped[str] = mapped_column(String(4000), default="")

    category: Mapped[Category] = relationship(lazy="joined")
    need: Mapped[Need] = relationship(lazy="joined")
