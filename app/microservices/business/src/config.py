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


settings = Settings()
