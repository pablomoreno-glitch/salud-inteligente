from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the inventory service, loaded from the environment."""

    database_url: str = "postgresql+asyncpg://salud:salud@postgres:5432/salud_inventory"
    internal_token: str = "change-me"

    default_low_stock_threshold: int = 5

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
