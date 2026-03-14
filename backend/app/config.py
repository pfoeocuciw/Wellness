from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/wellness"
    JWT_SECRET: str = "super_secret_key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 дней

    SMTP_HOST: str = "smtp.mail.ru"
    SMTP_PORT: int = 587
    SMTP_USER: str = "your_email@mail.ru"
    SMTP_PASS: str = "your_password"
    SMTP_FROM: str = "your_email@mail.ru"

    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()