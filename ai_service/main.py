from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app =FastAPI(title="Share-All media AI Microservice")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=['*'],
)

@app.get("/")
def health_check():
  return{
    "status": "OK",
    "service": "Python AI Microservice is running on port 5000!"
  }