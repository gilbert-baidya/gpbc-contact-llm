from openai import OpenAI
from config import settings
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        
        self.system_prompt = """You are a friendly and helpful AI assistant for a church community.
Your role is to:
1. Greet callers warmly and ask for their name
2. Answer questions about church services, events, and activities
3. Take prayer requests and messages
4. Provide information about service times, locations, and contact details
5. Be respectful, compassionate, and supportive
6. Detect the caller's language and respond in the same language (support English, Bengali, Hindi, Spanish)

Church Information:
- Sunday Service: 10:00 AM
- Wednesday Prayer Meeting: 7:00 PM
- Address: Various locations in Southern California
- Contact: Available through this system

Keep responses concise and natural for voice conversation. If you don't know something, offer to take a message or suggest calling back."""
    
    def get_response(self, user_message: str, conversation_history: List[Dict] = None) -> str:
        """Get response from LLM for user message"""
        try:
            messages = [{"role": "system", "content": self.system_prompt}]
            
            if conversation_history:
                messages.extend(conversation_history)
            
            messages.append({"role": "user", "content": user_message})
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=200  # Keep responses concise for voice
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"LLM error: {str(e)}")
            return "I apologize, but I'm having trouble processing your request. Could you please try again?"
    
    def detect_language(self, text: str) -> str:
        """Detect the language of the text"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "Detect the language of the following text. Respond with only the language code: 'en' for English, 'bn' for Bengali, 'hi' for Hindi, 'es' for Spanish, or 'other'."
                    },
                    {"role": "user", "content": text}
                ],
                temperature=0,
                max_tokens=10
            )
            
            return response.choices[0].message.content.strip().lower()
            
        except Exception as e:
            logger.error(f"Language detection error: {str(e)}")
            return "en"  # Default to English
    
    def summarize_conversation(self, conversation_history: List[Dict]) -> str:
        """Create a summary of the conversation"""
        try:
            messages = [
                {
                    "role": "system",
                    "content": "Summarize this conversation in 2-3 sentences, highlighting key points, requests, or information shared."
                }
            ]
            
            conversation_text = "\n".join([
                f"{msg['role']}: {msg['content']}" 
                for msg in conversation_history
            ])
            
            messages.append({"role": "user", "content": conversation_text})
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.5,
                max_tokens=150
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Summarization error: {str(e)}")
            return "Conversation summary unavailable"


# Create singleton instance
llm_service = LLMService()
