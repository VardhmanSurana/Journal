from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes import router
import asyncio
import os
from api.database import init_db, engine
from api.sync import run_sync
from api.ws_client import connect as ws_connect
from sqlmodel import Session
from contextlib import asynccontextmanager

async def background_heartbeat():
    """Periodic background sync every hour."""
    while True:
        try:
            print("Running periodic background sync...")
            with Session(engine) as session:
                run_sync(session)
        except Exception as e:
            print(f"Background heartbeat sync failed: {e}")
        
        # Wait for 1 hour (3600 seconds)
        await asyncio.sleep(3600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    init_db()
    # Trigger initial sync in the background so startup isn't blocked
    def initial_sync():
        try:
            print("Running initial startup sync...")
            with Session(engine) as session:
                run_sync(session)
        except Exception as e:
            print(f"Initial startup sync failed: {e}")
    
    # Trigger WebSocket connection for real-time data
    asyncio.create_task(ws_connect())

    # Run initial sync and start heartbeat
    asyncio.create_task(background_heartbeat())
    asyncio.create_task(asyncio.to_thread(initial_sync))
    yield

app = FastAPI(title="Delta Journal API", lifespan=lifespan)

# Ensure static and screenshots folders exist
os.makedirs("static/screenshots", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# Setup CORS for the React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cache-Control"] = "no-store"
    return response

@app.get("/")
def read_root():
    return {"message": "Delta Journal API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
