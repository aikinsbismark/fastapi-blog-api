from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict



class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    secret_key: SecretStr
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    database_url: str

    s3_bucket_name: str
    s3_region: str = "eu-north-1"
    s3_access_key_id: SecretStr | None = None
    s3_secret_access_key: SecretStr | None = None
    s3_endpoint_url: str | None = None

    max_upload_size_bytes: int = 5 * 1024 * 1024

    posts_per_page: int = 10

    reset_token_expire_minutes: int = 60

    mail_server: str = "localhost"
    mail_port: int = 8025
    mail_username: str = ""
    mail_password: SecretStr = SecretStr("")
    mail_from: str = "noreply@example.com"
    mail_use_tls: bool = False

    frontend_url: str = "http://localhost:8000"


settings = Settings()