from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from services.chatbot import chat_with_fallback

router = APIRouter(prefix="/ai", tags=["chat"])

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    # Convert Pydantic messages list to list of dicts for the chatbot service
    messages_dict = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    success, content, provider, error_message = await chat_with_fallback(
        messages_dict, 
        temperature=request.temperature
    )
    
    # We always return 200 even if the providers fail, but set success=False and include error_message.
    # This prevents backend crashing and allows backend to handle the fallback error gracefully.
    return ChatResponse(
        success=success,
        content=content,
        provider=provider,
        error=error_message
    )
