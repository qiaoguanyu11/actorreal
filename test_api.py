#!/usr/bin/env python3
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/api/info")
async def info():
    return {
        "app_name": "测试应用",
        "version": "0.1.0",
        "status": "running"
    }

if __name__ == "__main__":
    uvicorn.run("test_api:app", host="0.0.0.0", port=8000, reload=True) 