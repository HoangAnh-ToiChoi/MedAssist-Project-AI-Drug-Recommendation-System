import os
import logging
import httpx
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger("chatbot")

# Load environment variables (just in case they are not loaded yet)
from dotenv import load_dotenv
load_dotenv()

# API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# Support both ZHIPU_API_KEY and ZHIHU_API_KEY from user request
ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY") or os.getenv("ZHIHU_API_KEY")

# Default Models
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3-8b-8192")
ZHIPU_MODEL = os.getenv("ZHIPU_MODEL", "glm-4-flash")

async def try_gemini(messages: List[Dict[str, str]], temperature: float) -> Optional[str]:
    if not GEMINI_API_KEY:
        logger.warning("Gemini API key is not set. Skipping.")
        return None

    # Map roles for Gemini API (user and model) and extract system instructions
    contents = []
    system_instruction = None

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            system_instruction = {"parts": [{"text": content}]}
        else:
            gemini_role = "model" if role == "assistant" else "user"
            contents.append({
                "role": gemini_role,
                "parts": [{"text": content}]
            })

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature
        }
    }
    if system_instruction:
        payload["systemInstruction"] = system_instruction

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            logger.info("Attempting chat with Gemini Flash...")
            response = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
            if response.status_code == 200:
                res_data = response.json()
                # Parse Gemini response structure
                candidates = res_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "")
                        if text:
                            return text
                logger.error(f"Gemini responded with success but invalid structure: {res_data}")
            else:
                logger.error(f"Gemini API returned status code {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
    
    return None

async def try_groq(messages: List[Dict[str, str]], temperature: float) -> Optional[str]:
    if not GROQ_API_KEY:
        logger.warning("Groq API key is not set. Skipping.")
        return None

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            logger.info("Attempting chat with Groq...")
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                res_data = response.json()
                choices = res_data.get("choices", [])
                if choices:
                    text = choices[0].get("message", {}).get("content", "")
                    if text:
                        return text
                logger.error(f"Groq responded with success but invalid structure: {res_data}")
            else:
                logger.error(f"Groq API returned status code {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Error calling Groq API: {str(e)}")

    return None

async def try_zhipu(messages: List[Dict[str, str]], temperature: float) -> Optional[str]:
    if not ZHIPU_API_KEY:
        logger.warning("Zhipu/Zhihu API key is not set. Skipping.")
        return None

    url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    headers = {
        "Authorization": f"Bearer {ZHIPU_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": ZHIPU_MODEL,
        "messages": messages,
        "temperature": temperature
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            logger.info("Attempting chat with Zhipu AI...")
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                res_data = response.json()
                choices = res_data.get("choices", [])
                if choices:
                    text = choices[0].get("message", {}).get("content", "")
                    if text:
                        return text
                logger.error(f"Zhipu AI responded with success but invalid structure: {res_data}")
            else:
                logger.error(f"Zhipu AI API returned status code {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Error calling Zhipu AI API: {str(e)}")

    return None

async def chat_with_fallback(messages: List[Dict[str, str]], temperature: float = 0.7) -> Tuple[bool, str, str, Optional[str]]:
    """
    Executes a chat generation request by trying models in sequence:
    Gemini Flash -> Groq -> Zhipu AI.
    
    Returns:
        Tuple[success (bool), content (str), provider (str), error_message (str|None)]
    """
    # 1. Try Gemini Flash
    content = await try_gemini(messages, temperature)
    if content:
        return True, content, "gemini", None
    
    # 2. Try Groq (Llama)
    content = await try_groq(messages, temperature)
    if content:
        return True, content, "groq", None

    # 3. Try Zhipu AI (GLM)
    content = await try_zhipu(messages, temperature)
    if content:
        return True, content, "zhipu", None

    # 4. All providers failed
    err_msg = "All AI chatbot providers (Gemini, Groq, Zhipu) failed or keys are missing."
    logger.error(err_msg)
    
    friendly_fallback = (
        "Xin lỗi, hiện tại dịch vụ kết nối với các mô hình trí tuệ nhân tạo (Gemini, Groq, Zhipu) "
        "đang gặp sự cố kết nối hoặc thiếu cấu hình API key. Vui lòng thử lại sau ít phút."
    )
    return False, friendly_fallback, "none", err_msg
