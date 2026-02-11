from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def health():
    return {"status": "AI service running"}
