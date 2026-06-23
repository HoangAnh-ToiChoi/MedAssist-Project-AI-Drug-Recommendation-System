from fastapi import APIRouter

from models.schemas import GroundedChatRequest, GroundedChatResponse
from services.grounded_chatbot import grounded_chat_with_fallback

router = APIRouter(prefix="/ai/chat", tags=["grounded-chat"])


@router.post("/recommendation", response_model=GroundedChatResponse)
async def grounded_chat_endpoint(request: GroundedChatRequest):
    return await grounded_chat_with_fallback(request)
