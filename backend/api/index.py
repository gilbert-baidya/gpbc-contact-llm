# Vercel serverless entry point for FastAPI
from main import app

# Export the FastAPI app for Vercel
handler = app
