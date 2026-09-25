from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the business service, loaded from the environment."""

    database_url: str = "postgresql+asyncpg://salud:salud@postgres:5432/salud_business"
    internal_token: str = "change-me"

    business_whatsapp: str | None = None
    business_phone: str | None = None
    business_email: str | None = None
    business_address: str | None = None
    business_city: str | None = None
    business_hours: str | None = None
    business_instagram: str | None = None
    business_facebook: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator(
        "business_whatsapp",
        "business_phone",
        "business_email",
        "business_address",
        "business_city",
        "business_hours",
        "business_instagram",
        "business_facebook",
        mode="before",
    )
    @classmethod
    def blank_means_unset(cls, value: str | None) -> str | None:
        # docker compose passes unset variables as empty strings; the API contract is null.
        if isinstance(value, str) and not value.strip():
            return None
        return value.strip() if isinstance(value, str) else value


settings = Settings()
