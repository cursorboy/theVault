from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import engine
from app.routers import webhook


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="ReelVault API", lifespan=lifespan)
app.include_router(webhook.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
