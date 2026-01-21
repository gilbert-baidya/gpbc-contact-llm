from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str
    
    # Twilio
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str
    TWILIO_WEBHOOK_URL: str = ""
    
    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    
    # Application
    SECRET_KEY: str
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "https://gpbc-contact-beryl.vercel.app,http://localhost:3000,http://localhost:5173"
    
    # URLs
    BACKEND_URL: str = "https://gpbc-backend.up.railway.app"
    FRONTEND_URL: str = "https://gpbc-contact-beryl.vercel.app"
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
