from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import engine
from app.routers import webhook, reminders, internal, saves, categories, digest, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="ReelVault API", lifespan=lifespan)
app.include_router(webhook.router)
app.include_router(saves.router)
app.include_router(reminders.router)
app.include_router(categories.router)
app.include_router(digest.router)
app.include_router(auth.router)
app.include_router(internal.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
