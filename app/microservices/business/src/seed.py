from sqlalchemy import select

from .config import settings
from .database import AsyncSessionLocal
from .models import Media, Profile, Service

DEFAULT_NAME = "Salud Inteligente"
DEFAULT_TAGLINE = "Suplementos naturales con asesoría inteligente"
DEFAULT_DESCRIPTION = (
    "Salud Inteligente es un catálogo de suplementos alimenticios con registro INVIMA, "
    "pensado para distribuidoras y clientes finales en Colombia. Un asesor con inteligencia "
    "artificial ayuda a encontrar el producto adecuado dentro del catálogo, sin reemplazar "
    "una consulta médica."
)

CONTACT_FIELDS = (
    "whatsapp",
    "phone",
    "email",
    "address",
    "city",
    "hours",
    "instagram",
    "facebook",
)

DEFAULT_SERVICES = [
    {
        "title": "Asesor IA de bienestar",
        "description": (
            "Un asesor con inteligencia artificial recomienda productos del catálogo según lo "
            "que cuentas, sin diagnosticar ni reemplazar una consulta médica."
        ),
        "icon": "sparkles",
        "sort_order": 0,
    },
    {
        "title": "Catálogo con registro INVIMA",
        "description": "Suplementos dietarios con registro sanitario INVIMA, visible en la ficha de cada producto.",
        "icon": "shield-check",
        "sort_order": 1,
    },
    {
        "title": "Pedidos por WhatsApp",
        "description": "Arma tu pedido en el sitio y confirma los detalles directamente por WhatsApp.",
        "icon": "message-circle",
        "sort_order": 2,
    },
    {
        "title": "Atención a distribuidoras",
        "description": "Atención dedicada para distribuidoras que quieren vender el catálogo completo.",
        "icon": "store",
        "sort_order": 3,
    },
]

NEED_MEDIA_SLUGS = [
    "sueno",
    "energia",
    "huesos",
    "digestion",
    "belleza",
    "mente",
    "defensas",
    "mujer",
    "masculina",
]

NEED_MEDIA_ALT = {
    "sueno": "Ilustracion de sueno, estres y ansiedad",
    "energia": "Ilustracion de energia y vitalidad",
    "huesos": "Ilustracion de huesos y articulaciones",
    "digestion": "Ilustracion de salud digestiva",
    "belleza": "Ilustracion de belleza y piel",
    "mente": "Ilustracion de salud mental y concentracion",
    "defensas": "Ilustracion de defensas e inmunidad",
    "mujer": "Ilustracion de salud femenina",
    "masculina": "Ilustracion de salud masculina",
}


async def seed_if_empty() -> None:
    async with AsyncSessionLocal() as session:
        await _seed_profile(session)
        await _seed_services(session)
        await _seed_media(session)
        await session.commit()


async def _seed_profile(session) -> None:
    profile = await session.get(Profile, 1)

    if profile is None:
        profile = Profile(id=1, name=DEFAULT_NAME, tagline=DEFAULT_TAGLINE, description=DEFAULT_DESCRIPTION)
        for field in CONTACT_FIELDS:
            setattr(profile, field, getattr(settings, f"business_{field}"))
        session.add(profile)
        return

    for field in CONTACT_FIELDS:
        if getattr(profile, field) is None:
            env_value = getattr(settings, f"business_{field}")
            if env_value is not None:
                setattr(profile, field, env_value)


async def _seed_services(session) -> None:
    total = (await session.execute(select(Service.id))).first()
    if total is not None:
        return
    for item in DEFAULT_SERVICES:
        session.add(Service(**item))


async def _seed_media(session) -> None:
    total = (await session.execute(select(Media.id))).first()
    if total is not None:
        return

    session.add(
        Media(kind="hero", title="Salud Inteligente", url="/media/site/hero.webp", alt="Salud Inteligente", sort_order=0)
    )
    session.add(
        Media(
            kind="gallery",
            title="Nosotros",
            url="/media/site/nosotros.webp",
            alt="Equipo de Salud Inteligente",
            sort_order=1,
        )
    )

    for index, slug in enumerate(NEED_MEDIA_SLUGS, start=2):
        session.add(
            Media(
                kind="need",
                title=None,
                url=f"/media/site/need-{slug}.webp",
                alt=NEED_MEDIA_ALT[slug],
                sort_order=index,
            )
        )
