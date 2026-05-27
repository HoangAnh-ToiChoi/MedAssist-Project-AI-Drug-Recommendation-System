import os
import sys
import asyncio
from unittest.mock import patch, AsyncMock

# Add parent directory to sys.path so we can import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.chatbot import chat_with_fallback, try_gemini, try_groq, try_zhipu

async def test_successful_gemini():
    print("Running Test 1: Gemini succeeds...")
    
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = lambda: {
        "candidates": [{
            "content": {
                "parts": [{"text": "Hello from Gemini"}]
            }
        }]
    }

    with patch('httpx.AsyncClient.post', return_value=mock_response):
        with patch('services.chatbot.GEMINI_API_KEY', 'fake-key'):
            success, content, provider, error = await chat_with_fallback([{"role": "user", "content": "hi"}])
            assert success is True, "Test 1 Failed: Succeeded should be True"
            assert content == "Hello from Gemini", f"Test 1 Failed: Got {content}"
            assert provider == "gemini", f"Test 1 Failed: Got provider {provider}"
            print("✅ Test 1 Passed!")

async def test_fallback_to_groq():
    print("Running Test 2: Gemini fails, Groq succeeds...")
    
    # Mock Gemini to fail (status code 500)
    gemini_response = AsyncMock()
    gemini_response.status_code = 500
    gemini_response.text = "Internal Server Error"
    
    # Mock Groq to succeed
    groq_response = AsyncMock()
    groq_response.status_code = 200
    groq_response.json = lambda: {
        "choices": [{
            "message": {"content": "Hello from Groq"}
        }]
    }

    # Side effect function to return different mock responses based on URL
    async def side_effect(url, **kwargs):
        if "generativelanguage.googleapis.com" in url:
            return gemini_response
        elif "api.groq.com" in url:
            return groq_response
        return AsyncMock(status_code=404)

    with patch('httpx.AsyncClient.post', side_effect=side_effect):
        with patch('services.chatbot.GEMINI_API_KEY', 'fake-key'):
            with patch('services.chatbot.GROQ_API_KEY', 'fake-key'):
                success, content, provider, error = await chat_with_fallback([{"role": "user", "content": "hi"}])
                assert success is True, "Test 2 Failed: Succeeded should be True"
                assert content == "Hello from Groq", f"Test 2 Failed: Got {content}"
                assert provider == "groq", f"Test 2 Failed: Got provider {provider}"
                print("✅ Test 2 Passed!")

async def test_fallback_to_zhipu():
    print("Running Test 3: Gemini and Groq fail, Zhipu succeeds...")
    
    fail_response = AsyncMock()
    fail_response.status_code = 500
    fail_response.text = "API Error"
    
    zhipu_response = AsyncMock()
    zhipu_response.status_code = 200
    zhipu_response.json = lambda: {
        "choices": [{
            "message": {"content": "Hello from Zhipu"}
        }]
    }

    async def side_effect(url, **kwargs):
        if "generativelanguage.googleapis.com" in url or "api.groq.com" in url:
            return fail_response
        elif "open.bigmodel.cn" in url:
            return zhipu_response
        return AsyncMock(status_code=404)

    with patch('httpx.AsyncClient.post', side_effect=side_effect):
        with patch('services.chatbot.GEMINI_API_KEY', 'fake-key'):
            with patch('services.chatbot.GROQ_API_KEY', 'fake-key'):
                with patch('services.chatbot.ZHIPU_API_KEY', 'fake-key'):
                    success, content, provider, error = await chat_with_fallback([{"role": "user", "content": "hi"}])
                    assert success is True, "Test 3 Failed: Succeeded should be True"
                    assert content == "Hello from Zhipu", f"Test 3 Failed: Got {content}"
                    assert provider == "zhipu", f"Test 3 Failed: Got provider {provider}"
                    print("✅ Test 3 Passed!")

async def test_all_fail():
    print("Running Test 4: All providers fail...")
    
    fail_response = AsyncMock()
    fail_response.status_code = 500
    fail_response.text = "API Error"

    with patch('httpx.AsyncClient.post', return_value=fail_response):
        with patch('services.chatbot.GEMINI_API_KEY', 'fake-key'):
            with patch('services.chatbot.GROQ_API_KEY', 'fake-key'):
                with patch('services.chatbot.ZHIPU_API_KEY', 'fake-key'):
                    success, content, provider, error = await chat_with_fallback([{"role": "user", "content": "hi"}])
                    assert success is False, "Test 4 Failed: Succeeded should be False"
                    assert "gặp sự cố kết nối" in content, f"Test 4 Failed: Got {content}"
                    assert provider == "none", f"Test 4 Failed: Got provider {provider}"
                    assert error is not None, "Test 4 Failed: Error should not be None"
                    print("✅ Test 4 Passed!")

async def main():
    print("--- Starting Chatbot Fallback Tests ---")
    await test_successful_gemini()
    print("-" * 40)
    await test_fallback_to_groq()
    print("-" * 40)
    await test_fallback_to_zhipu()
    print("-" * 40)
    await test_all_fail()
    print("--- All Tests Completed Successfully! ---")

if __name__ == "__main__":
    asyncio.run(main())
