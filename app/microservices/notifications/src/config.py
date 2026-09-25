from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the notifications service, loaded from the environment."""

    database_url: str = "postgresql+asyncpg://salud:salud@postgres:5432/salud_notifications"
    internal_token: str = "change-me"

    # Twilio. While the account SID or token is missing, messages are recorded as
    # "skipped" instead of sent, so orders never depend on SMS being configured.
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    # Either a Twilio phone number (E.164) or a Messaging Service SID (MG...).
    twilio_from_number: str = ""
    twilio_messaging_service_sid: str = ""
    twilio_api_base: str = "https://api.twilio.com"

    # Who gets the "new order" SMS: the business phone, in E.164.
    order_sms_to: str = "+573018000324"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def sms_configured(self) -> bool:
        has_sender = bool(self.twilio_from_number or self.twilio_messaging_service_sid)
        return bool(self.twilio_account_sid and self.twilio_auth_token and has_sender)


settings = Settings()
