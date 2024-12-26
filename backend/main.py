from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv
from mistralai import Mistral

# Load environment variables
load_dotenv()
mistral_api_key = os.getenv("MISTRAL_API_KEY")

if not mistral_api_key:
    raise ValueError("MISTRAL_API_KEY not found in environment variables")

# Initialize Mistral client
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

# Store conversations in memory
conversations: Dict[str, List[Dict]] = {}

class ChatRequest(BaseModel):
    code: Optional[str] = None
    message: str
    problem_id: str
    problem_data: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    conversation_history: List[Dict[str, str]]

@app.get("/")
async def read_root():
    return JSONResponse(
        content={"message": "Codeforces Helper API is running!"},
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.get("/conversation/{problem_id}")
async def get_conversation(problem_id: str):
    if problem_id not in conversations:
        return JSONResponse({"conversation_history": []})
    
    return JSONResponse({
        "conversation_history": conversations[problem_id]
    })

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Initialize conversation if it doesn't exist
        if request.problem_id not in conversations:
            conversations[request.problem_id] = []
            
            # If this is first message, add problem context
            if request.problem_data:
                system_message = {
                    "role": "system",
                    "content": f"""You are a competitive programming assistant. Your aim is to help the user learn how to solve the problem on their own. You are only there to help them by giving you hints/ answering questions they might have/ giving them edge cases, refrain from giving them the solution code to the problem. Only give solution code if they explicitly ask for it. Even then, ask them to confirm before sharing solution with them. Be concise in your responses. Don't give them the solution. Don't give them the solution please. Be concise, dont give solution. Be concise!!!! 
                    Problem Statement: {request.problem_data.get('statement', '')}
                    Input Specification: {request.problem_data.get('inputSpec', '')}
                    Output Specification: {request.problem_data.get('outputSpec', '')}"""
                }
                conversations[request.problem_id].append(system_message)

        # Add new code if provided
        if request.code:
            code_message = {
                "role": "user",
                "content": f"Here's my code:\n{request.code}"
            }
            conversations[request.problem_id].append(code_message)

        # Add the new message
        user_message = {
            "role": "user",
            "content": request.message
        }
        conversations[request.problem_id].append(user_message)

        # Get response from Mistral
        chat_response = client.chat.complete(
            model="mistral-medium",
            messages=conversations[request.problem_id]
        )

        # Store assistant's response
        assistant_message = {
            "role": "assistant",
            "content": chat_response.choices[0].message.content
        }
        conversations[request.problem_id].append(assistant_message)

        return JSONResponse({
            "response": assistant_message["content"],
            "conversation_history": conversations[request.problem_id]
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
            headers={"Access-Control-Allow-Origin": "*"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)