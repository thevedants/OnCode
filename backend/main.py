from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv
from mistralai.models.chat_completion import ChatMessage
from mistralai.client import MistralClient

# Load environment variables
load_dotenv()
mistral_api_key = os.getenv("MISTRAL_API_KEY")

# Initialize Mistral client
client = MistralClient(api_key=mistral_api_key)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store conversations in memory (you might want to use a database in production)
conversations: Dict[str, List[ChatMessage]] = {}

class Message(BaseModel):
    content: str
    role: str = "user"

class ConversationRequest(BaseModel):
    code: Optional[str] = None
    message: str
    problem_id: str  # Unique identifier for the Codeforces problem
    problem_data: Optional[dict] = None

@app.post("/chat")
async def chat(request: ConversationRequest):
    try:
        # Initialize conversation history if it doesn't exist
        if request.problem_id not in conversations:
            conversations[request.problem_id] = []
            
            # If this is first message, add problem context
            if request.problem_data:
                system_context = f"""
                Problem Statement:
                {request.problem_data.get('statement', '')}
                
                Input Specification:
                {request.problem_data.get('inputSpec', '')}
                
                Output Specification:
                {request.problem_data.get('outputSpec', '')}
                
                Sample Tests:
                {request.problem_data.get('sampleTests', {})}
                """
                
                conversations[request.problem_id].append(
                    ChatMessage(role="system", content=system_context)
                )

        # Add new code if provided
        if request.code:
            conversations[request.problem_id].append(
                ChatMessage(role="user", content=f"Here's my code:\n{request.code}")
            )

        # Add the new message
        conversations[request.problem_id].append(
            ChatMessage(role="user", content=request.message)
        )

        # Get response from Mistral
        chat_response = client.chat(
            model="mistral-medium",
            messages=conversations[request.problem_id]
        )

        # Store assistant's response in conversation history
        assistant_message = chat_response.messages[0]
        conversations[request.problem_id].append(assistant_message)

        return JSONResponse({
            "response": assistant_message.content,
            "conversation_history": [
                {"role": msg.role, "content": msg.content}
                for msg in conversations[request.problem_id]
            ]
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/conversation/{problem_id}")
async def get_conversation(problem_id: str):
    if problem_id not in conversations:
        return JSONResponse({"conversation_history": []})
    
    return JSONResponse({
        "conversation_history": [
            {"role": msg.role, "content": msg.content}
            for msg in conversations[problem_id]
        ]
    })