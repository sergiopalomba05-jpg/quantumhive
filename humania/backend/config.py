from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Vertex AI / Gemini
    gemini_api_key: str = ""
    google_cloud_project: str = "project-aa5fb956-b08a-4e13-869"
    google_cloud_location: str = "us-central1"
    gemini_model: str = "gemini-live-2.5-flash-native-audio"

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # Avatar
    avatar_image_path: str = "config/avatar_default.jpg"
    avatar_fps: int = 31
    avatar_resolution: tuple = (512, 512)

    # Audio
    audio_sample_rate_input: int = 16000
    audio_sample_rate_gemini: int = 24000

    # Server
    host: str = "0.0.0.0"
    port: int = 8080

    # CORS
    cors_origins: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://humania.app",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
