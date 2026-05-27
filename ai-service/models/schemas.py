from pydantic import BaseModel, Field
from typing import List, Optional

class Message(BaseModel):
    role: str = Field(..., description="Role of the message author: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="The content of the message")

class ChatRequest(BaseModel):
    messages: List[Message] = Field(..., description="The chat history messages to be sent to the LLM")
    temperature: Optional[float] = Field(0.7, description="Sampling temperature for LLM generation")

class ChatResponse(BaseModel):
    success: bool = Field(..., description="Flag indicating if the call succeeded")
    content: str = Field(..., description="The message response from the AI chatbot")
    provider: str = Field(..., description="The name of the API provider that successfully responded ('gemini', 'groq', 'zhipu', or 'none')")
    error: Optional[str] = Field(None, description="Detailed error message if the call failed")
