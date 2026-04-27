from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    database_sync_url: str
    redis_url: str = "redis://localhost:6379"

    anthropic_api_key: str
    openai_api_key: str

    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket: str
    r2_public_url: str

    sendblue_api_key: str
    sendblue_api_secret: str
    sendblue_webhook_secret: str
    sendblue_from_number: str = "+17862139361"

    instagram_username: str = ""
    instagram_password: str = ""
    instagram_verification_code: str = ""
    instagram_session_dir: str = "./ig_sessions"
    instagram_poll_seconds: int = 5

    tiktok_username: str = ""
    tiktok_password: str = ""
    tiktok_profile_dir: str = "./tt_profile"
    tiktok_poll_seconds: int = 5
    tiktok_headless: bool = True
    tiktok_proxy: str = ""

    app_url: str
    internal_cron_secret: str


settings = Settings()
