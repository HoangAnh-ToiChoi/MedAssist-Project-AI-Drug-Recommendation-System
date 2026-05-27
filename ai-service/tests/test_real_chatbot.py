import os
import sys
import asyncio
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.chatbot import try_gemini, try_groq, try_zhipu, chat_with_fallback

load_dotenv()

async def test_live_apis():
    print("=== LIVE CHATBOT API KEYS VERIFICATION ===")
    
    # Check loaded keys
    gemini_key = os.getenv("GEMINI_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")
    zhipu_key = os.getenv("ZHIPU_API_KEY") or os.getenv("ZHIHU_API_KEY")
    
    print(f"Gemini Key Present: {'Yes' if gemini_key else 'No'}")
    print(f"Groq Key Present: {'Yes' if groq_key else 'No'}")
    print(f"Zhipu Key Present: {'Yes' if zhipu_key else 'No'}")
    
    messages = [
        {"role": "system", "content": "Bạn là trợ lý y khoa MedAssist AI, trả lời ngắn gọn trong 1 câu."},
        {"role": "user", "content": "Tác dụng chính của thuốc Paracetamol là gì?"}
      ]
    
    # 1. Test live Gemini Flash
    print("\n--- Testing Live Gemini Flash ---")
    if gemini_key:
        res = await try_gemini(messages, 0.7)
        if res:
            print(f"✅ Gemini Response Success:\n{res.strip()}")
        else:
            print("❌ Gemini Failed to respond.")
    else:
        print("Skipped (No Key)")

    # 2. Test live Groq
    print("\n--- Testing Live Groq (Llama) ---")
    if groq_key:
        res = await try_groq(messages, 0.7)
        if res:
            print(f"✅ Groq Response Success:\n{res.strip()}")
        else:
            print("❌ Groq Failed to respond.")
    else:
        print("Skipped (No Key)")

    # 3. Test live Zhipu AI
    print("\n--- Testing Live Zhipu AI (GLM) ---")
    if zhipu_key:
        res = await try_zhipu(messages, 0.7)
        if res:
            print(f"✅ Zhipu Response Success:\n{res.strip()}")
        else:
            print("❌ Zhipu Failed to respond.")
    else:
        print("Skipped (No Key)")

    # 4. Test fallback chain
    print("\n--- Testing Fallback Chain Functionality ---")
    success, content, provider, error = await chat_with_fallback(messages)
    print(f"Fallback result: Success={success}, Provider={provider}")
    print(f"Content: {content.strip()}")
    if error:
        print(f"Error: {error}")

if __name__ == "__main__":
    asyncio.run(test_live_apis())
