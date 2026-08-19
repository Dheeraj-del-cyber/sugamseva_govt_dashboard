"""
Sugam Seva - Configuration
All secrets/API keys are read from environment variables. Sensible local
defaults are provided so the project runs out of the box in DEMO_MODE,
where DigiLocker / Bhashini / real biometric hardware / SMS gateways are
replaced by mock services (see app/services/*). Swap DEMO_MODE=false and
fill in the real credentials once your organisation has been onboarded to
those government APIs.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Sugam Seva - Digital Citizen Assistant"

    # --- Database ---------------------------------------------------
    # Defaults to local SQLite for zero-config local dev. In production,
    # point this at PostgreSQL, e.g.
    # postgresql://sugamseva:password@localhost:5432/sugamseva
    DATABASE_URL: str = "sqlite:///./sugamseva.db"

    # --- Auth ---------------------------------------------------------
    JWT_SECRET: str = "CHANGE_ME_super_secret_dev_key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 12

    # --- Demo / mock toggle -------------------------------------------
    # When True, DigiLocker, Bhashini, Biometric device, SMS gateway and
    # AI calls are simulated so the whole app runs without any government
    # or third-party credentials. Flip to False once real API keys below
    # are supplied.
    DEMO_MODE: bool = True

    # --- Government + third-party integrations (fill in for prod) -----
    DIGILOCKER_CLIENT_ID: str = ""
    DIGILOCKER_CLIENT_SECRET: str = ""
    DIGILOCKER_BASE_URL: str = "https://api.digitallocker.gov.in"

    BHASHINI_API_KEY: str = ""
    BHASHINI_USER_ID: str = ""
    BHASHINI_BASE_URL: str = "https://bhashini.gov.in/api"

    BIOMETRIC_DEVICE_API_URL: str = ""  # e.g. local RD-service URL for Aadhaar biometric device

    SMS_GATEWAY_API_KEY: str = ""
    SMS_GATEWAY_BASE_URL: str = ""

    FIREBASE_SERVER_KEY: str = ""

    # Claude API key for AI scheme summarisation / suggestions.
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-6"

    class Config:
        env_file = ".env"


settings = Settings()
