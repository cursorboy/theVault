from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.routers import webhook, reminders, internal, saves, categories, digest, auth, waitlist


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="theVault API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(webhook.router)
app.include_router(saves.router)
app.include_router(reminders.router)
app.include_router(categories.router)
app.include_router(digest.router)
app.include_router(auth.router)
app.include_router(waitlist.router)
app.include_router(internal.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
