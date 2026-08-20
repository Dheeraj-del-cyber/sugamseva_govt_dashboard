from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, officials, users, problems, schemes, dashboard, biometric_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Sugam Seva - a digital citizen assistant "
                 "for Government of India services and schemes.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your dashboard's origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(officials.router)
app.include_router(users.router)
app.include_router(users.documents_router)
app.include_router(problems.router)
app.include_router(schemes.router)
app.include_router(dashboard.router)
app.include_router(biometric_router.router)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "demo_mode": settings.DEMO_MODE,
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}