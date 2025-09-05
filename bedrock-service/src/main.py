from fastapi import FastAPI
from handlers import chat, telegram, health, openai
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import deep_research
import event_composer

app = FastAPI()

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(chat.router)
app.include_router(telegram.router)
app.include_router(health.router)
app.include_router(openai.router)
# Include deep_research app as a sub-application
app.mount("/research", deep_research.app)
app.mount("/event-composer", event_composer.app)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)