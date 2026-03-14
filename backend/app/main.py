from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from .routers.auth import router as auth_router
from .routers.profile import router as profile_router
from .routers.categories import router as categories_router

app = FastAPI(title="Wellness API")

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(categories_router)


@app.get("/")
def root():
    return {"message": "Wellness API is running"}