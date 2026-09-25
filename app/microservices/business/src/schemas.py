from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


class ProfileOut(BaseModel):
    name: str
    tagline: str | None
    description: str | None


class ContactsOut(BaseModel):
    whatsapp: str | None
    phone: str | None
    email: str | None
    address: str | None
    city: str | None
    hours: str | None
    instagram: str | None
    facebook: str | None


class ServiceOut(BaseModel):
    id: int
    title: str
    description: str
    icon: str


class MediaOut(BaseModel):
    id: int
    kind: str
    title: str | None
    url: str
    alt: str


class BusinessOut(BaseModel):
    profile: ProfileOut
    contacts: ContactsOut
    services: list[ServiceOut]
    media: list[MediaOut]


class ContactMessageCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str | None = Field(default=None, max_length=60)
    email: EmailStr | None = None
    message: str = Field(min_length=5, max_length=2000)

    @model_validator(mode="after")
    def require_phone_or_email(self) -> "ContactMessageCreate":
        if not self.phone and not self.email:
            raise ValueError("Debes indicar un telefono o un correo para poder responderte")
        return self


class ContactMessageOut(BaseModel):
    id: int
    name: str
    phone: str | None
    email: str | None
    message: str
    status: str
    created_at: datetime


class ContactMessageListOut(BaseModel):
    items: list[ContactMessageOut]
    total: int


class ContactMessageStatusPatch(BaseModel):
    status: str

    @model_validator(mode="after")
    def status_must_be_valid(self) -> "ContactMessageStatusPatch":
        if self.status not in {"new", "read", "archived"}:
            raise ValueError("El estado debe ser new, read o archived")
        return self


class ProfilePatch(BaseModel):
    name: str | None = None
    tagline: str | None = None
    description: str | None = None
    whatsapp: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    hours: str | None = None
    instagram: str | None = None
    facebook: str | None = None
