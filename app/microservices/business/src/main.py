from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db, init_db
from .errors import install_error_handlers
from .models import ContactMessage, Media, Profile, Service
from .schemas import (
    BusinessOut,
    ContactMessageCreate,
    ContactMessageListOut,
    ContactMessageOut,
    ContactMessageStatusPatch,
    ContactsOut,
    MediaOut,
    ProfileOut,
    ProfilePatch,
    ServiceOut,
)
from .security import require_internal
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_if_empty()
    yield


app = FastAPI(title="Salud Inteligente - Business", lifespan=lifespan)
install_error_handlers(app)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "business"}


async def _get_profile(db: AsyncSession) -> Profile:
    profile = await db.get(Profile, 1)
    if profile is None:
        raise HTTPException(status_code=500, detail="El perfil del negocio no esta inicializado")
    return profile


def to_profile_out(profile: Profile) -> ProfileOut:
    return ProfileOut(name=profile.name, tagline=profile.tagline, description=profile.description)


def to_contacts_out(profile: Profile) -> ContactsOut:
    return ContactsOut(
        whatsapp=profile.whatsapp,
        phone=profile.phone,
        email=profile.email,
        address=profile.address,
        city=profile.city,
        hours=profile.hours,
        instagram=profile.instagram,
        facebook=profile.facebook,
    )


def to_service_out(service: Service) -> ServiceOut:
    return ServiceOut(id=service.id, title=service.title, description=service.description, icon=service.icon)


def to_media_out(media: Media) -> MediaOut:
    return MediaOut(id=media.id, kind=media.kind, title=media.title, url=media.url, alt=media.alt)


@app.get("/business", response_model=BusinessOut)
async def get_business(db: AsyncSession = Depends(get_db)) -> BusinessOut:
    profile = await _get_profile(db)
    services = (await db.execute(select(Service).order_by(Service.sort_order))).scalars().all()
    media = (await db.execute(select(Media).order_by(Media.sort_order))).scalars().all()

    return BusinessOut(
        profile=to_profile_out(profile),
        contacts=to_contacts_out(profile),
        services=[to_service_out(s) for s in services],
        media=[to_media_out(m) for m in media],
    )


@app.get("/contacts", response_model=ContactsOut)
async def get_contacts(db: AsyncSession = Depends(get_db)) -> ContactsOut:
    profile = await _get_profile(db)
    return to_contacts_out(profile)


@app.get("/services", response_model=list[ServiceOut])
async def list_services(db: AsyncSession = Depends(get_db)) -> list[ServiceOut]:
    services = (await db.execute(select(Service).order_by(Service.sort_order))).scalars().all()
    return [to_service_out(s) for s in services]


@app.get("/media", response_model=list[MediaOut])
async def list_media(kind: str | None = None, db: AsyncSession = Depends(get_db)) -> list[MediaOut]:
    stmt = select(Media).order_by(Media.sort_order)
    if kind:
        stmt = stmt.where(Media.kind == kind)
    media = (await db.execute(stmt)).scalars().all()
    return [to_media_out(m) for m in media]


@app.post("/contact-messages", response_model=ContactMessageOut, status_code=201)
async def create_contact_message(
    payload: ContactMessageCreate, db: AsyncSession = Depends(get_db)
) -> ContactMessageOut:
    message = ContactMessage(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        message=payload.message,
        status="new",
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return ContactMessageOut.model_validate(message, from_attributes=True)


@app.get(
    "/contact-messages",
    response_model=ContactMessageListOut,
    dependencies=[Depends(require_internal)],
)
async def list_contact_messages(
    status: str | None = Query(default=None), db: AsyncSession = Depends(get_db)
) -> ContactMessageListOut:
    stmt = select(ContactMessage)
    if status:
        stmt = stmt.where(ContactMessage.status == status)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    items = (await db.execute(stmt.order_by(ContactMessage.created_at.desc()))).scalars().all()

    return ContactMessageListOut(
        items=[ContactMessageOut.model_validate(item, from_attributes=True) for item in items],
        total=total,
    )


@app.patch(
    "/contact-messages/{message_id}",
    response_model=ContactMessageOut,
    dependencies=[Depends(require_internal)],
)
async def update_contact_message_status(
    message_id: int, payload: ContactMessageStatusPatch, db: AsyncSession = Depends(get_db)
) -> ContactMessageOut:
    message = await db.get(ContactMessage, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")

    message.status = payload.status
    await db.commit()
    await db.refresh(message)
    return ContactMessageOut.model_validate(message, from_attributes=True)


@app.patch("/profile", response_model=BusinessOut, dependencies=[Depends(require_internal)])
async def patch_profile(payload: ProfilePatch, db: AsyncSession = Depends(get_db)) -> BusinessOut:
    profile = await _get_profile(db)

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)

    services = (await db.execute(select(Service).order_by(Service.sort_order))).scalars().all()
    media = (await db.execute(select(Media).order_by(Media.sort_order))).scalars().all()

    return BusinessOut(
        profile=to_profile_out(profile),
        contacts=to_contacts_out(profile),
        services=[to_service_out(s) for s in services],
        media=[to_media_out(m) for m in media],
    )
