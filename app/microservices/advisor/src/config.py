from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the advisor service, sourced from the environment."""

    DATABASE_URL: str = "postgresql+asyncpg://salud:salud@postgres:5432/salud_advisor"
    INTERNAL_TOKEN: str = "local-internal-token"
    CATALOG_URL: str = "http://catalog:9202"
    INVENTORY_URL: str = "http://inventory:9203"
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-5"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
