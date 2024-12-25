from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
import os
from dotenv import load_dotenv
import os
from mistralai import Mistral

# Load environment variables
load_dotenv()
mistral_api_key = os.getenv("MISTRAL_API_KEY")

if not mistral_api_key:
    raise ValueError("MISTRAL_API_KEY not found in environment variables")

# Initialize Mistral client with the new syntax
client = Mistral(api_key=mistral_api_key)

app = FastAPI()

# Configure CORS
origins = [
    "https://codeforces.com",
    "http://codeforces.com",
    "chrome-extension://*",
    "*"  # Temporarily allow all origins for testing
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

class CodeAnalysisRequest(BaseModel):
    code: str
    problem_data: dict

class CodeAnalysisResponse(BaseModel):
    suggestions: List[str]
    hints: List[str]

@app.get("/")
async def read_root():
    return JSONResponse(
        content={"message": "Codeforces Helper API is running!"},
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.options("/analyze")
async def options_analyze():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    )

@app.post("/analyze", response_model=CodeAnalysisResponse)
async def analyze_code(request: CodeAnalysisRequest):
    try:
        chat_response = client.chat.complete(
            model="mistral-medium",
            messages=[
                {"role": "system",
            "content": "You are a competitive program solver assistant. Analyze the given code and provide helpful suggestions and improvements, in context of the given problem that you need to solve. Adhere to the instructions given to you by the user. If the request made to you is not related to the problem, refuse to answer.",
                },
                {"role": "user",
                 "content": f"""
            Problem Statement:
            {request.problem_data.get('statement', '')}
            
            Input Specification:
            {request.problem_data.get('inputSpec', '')}
            
            Output Specification:
            {request.problem_data.get('outputSpec', '')}
            
            User's Code:
            {request.code}
            
            Please use this context to answer the user's question concisely.
            """}

            ]
        )

        # Process Mistral's response
        analysis = chat_response.choices[0].message.content
        suggestions_and_hints = [line.strip('- ') for line in analysis.split('\n') if line.strip()]

        # Split into suggestions and hints
        midpoint = len(suggestions_and_hints) // 2
        suggestions = suggestions_and_hints[:midpoint]
        hints = suggestions_and_hints[midpoint:]

        return JSONResponse(
            content={
                "suggestions": suggestions or ["No suggestions available"],
                "hints": hints or ["No hints available"]
            },
            headers={"Access-Control-Allow-Origin": "*"}
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
            headers={"Access-Control-Allow-Origin": "*"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)