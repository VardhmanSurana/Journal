from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
import asyncio
from api.database import init_db, engine
from api.sync import run_sync
from sqlmodel import Session

app = FastAPI(title="Delta Journal API")

# Setup CORS for the React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.on_event("startup")
async def on_startup():
    init_db()
    # Trigger initial sync in the background so startup isn't blocked
    def initial_sync():
        try:
            print("Running initial startup sync...")
            with Session(engine) as session:
                run_sync(session)
        except Exception as e:
            print(f"Initial startup sync failed: {e}")
    
    # Run initial sync and start heartbeat
    asyncio.create_task(background_heartbeat())
    asyncio.create_task(asyncio.to_thread(initial_sync))

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
