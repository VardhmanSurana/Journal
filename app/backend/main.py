from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.database import init_db

app = FastAPI(title="Delta Journal API")

# Setup CORS for the React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for local development to prevent port mismatch errors
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Delta Journal API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
