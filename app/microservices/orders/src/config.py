from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the orders service, sourced from the environment."""

    DATABASE_URL: str = "postgresql+asyncpg://salud:salud@postgres:5432/salud_orders"
    INTERNAL_TOKEN: str = "local-internal-token"
    CATALOG_URL: str = "http://catalog:9202"
    INVENTORY_URL: str = "http://inventory:9203"
    BUSINESS_URL: str = "http://business:9201"
    NOTIFICATIONS_URL: str = "http://notifications:9206"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
