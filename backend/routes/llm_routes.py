from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
from services.llm_service import llm_service
from models import Conversation, Contact
from database import get_db
from sqlalchemy.orm import Session
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["LLM"])


class MessageInterpretRequest(BaseModel):
    message: str
    contact_id: Optional[int] = None
    language: Optional[str] = None


class MessageInterpretResponse(BaseModel):
    intent: str
    reply: str
    language: str
    confidence: float
    needs_pastoral_care: bool


class GenerateReplyRequest(BaseModel):
    message: str
    contact_id: int
    include_context: bool = True


class GenerateReplyResponse(BaseModel):
    reply: str
    language: str
    conversation_context: List[Dict]


class TranslateRequest(BaseModel):
    text: str
    to_language: str
    maintain_tone: str = "warm_and_pastoral"


@router.post("/interpret", response_model=MessageInterpretResponse)
async def interpret_message(
    request: MessageInterpretRequest,
    db: Session = Depends(get_db)
):
    """
    Interpret a message using LLM to detect intent, language, and generate appropriate reply.
    This replaces the basic rule-based interpretation in frontend.
    """
    try:
        # Get conversation history if contact_id provided
        conversation_history = []
        if request.contact_id:
            conversations = db.query(Conversation).filter(
                Conversation.contact_id == request.contact_id
            ).order_by(Conversation.timestamp.desc()).limit(10).all()
            
            conversation_history = [
                {
                    "role": "user" if conv.direction == "inbound" else "assistant",
                    "content": conv.message
                }
                for conv in reversed(conversations)
            ]
        
        # Detect language
        detected_language = await llm_service.detect_language(request.message)
        language = request.language or detected_language
        
        # Analyze message with LLM for intent detection
        analysis_prompt = f"""Analyze this message and determine:
1. Intent (prayer_request, question, greeting, confirmation, complaint, other)
2. Urgency (urgent, normal, low)
3. Requires pastoral care (true/false)
4. Emotional tone (distressed, happy, neutral, confused)

Message: {request.message}

Respond in JSON format:
{{"intent": "...", "urgency": "...", "needs_pastoral_care": true/false, "emotional_tone": "...", "confidence": 0.95}}
"""
        
        analysis = await llm_service.get_response(
            analysis_prompt,
            conversation_history=conversation_history
        )
        
        # Parse analysis (simplified - in production, use structured output)
        import json
        try:
            analysis_data = json.loads(analysis)
        except:
            # Fallback if LLM doesn't return valid JSON
            analysis_data = {
                "intent": "other",
                "urgency": "normal",
                "needs_pastoral_care": False,
                "emotional_tone": "neutral",
                "confidence": 0.5
            }
        
        # Generate appropriate reply based on intent
        reply_context = f"""
Previous conversation: {len(conversation_history)} messages
Detected intent: {analysis_data['intent']}
Urgency: {analysis_data['urgency']}
Language: {language}

Generate a compassionate, culturally appropriate reply in {language}.
Keep it concise (under 160 characters for SMS compatibility).
"""
        
        reply = await llm_service.get_response(
            request.message,
            conversation_history=conversation_history + [
                {"role": "system", "content": reply_context}
            ]
        )
        
        return MessageInterpretResponse(
            intent=analysis_data['intent'],
            reply=reply,
            language=language,
            confidence=analysis_data.get('confidence', 0.8),
            needs_pastoral_care=analysis_data.get('needs_pastoral_care', False)
        )
        
    except Exception as e:
        logger.error(f"Error interpreting message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to interpret message: {str(e)}")


@router.post("/reply", response_model=GenerateReplyResponse)
async def generate_reply(
    request: GenerateReplyRequest,
    db: Session = Depends(get_db)
):
    """
    Generate an intelligent, context-aware reply for a contact's message.
    Uses conversation history and contact information for personalization.
    """
    try:
        # Get contact details
        contact = db.query(Contact).filter(Contact.id == request.contact_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        # Get conversation history
        conversation_history = []
        if request.include_context:
            conversations = db.query(Conversation).filter(
                Conversation.contact_id == request.contact_id
            ).order_by(Conversation.timestamp.desc()).limit(10).all()
            
            conversation_history = [
                {
                    "role": "user" if conv.direction == "inbound" else "assistant",
                    "content": conv.message,
                    "timestamp": conv.timestamp.isoformat()
                }
                for conv in reversed(conversations)
            ]
        
        # Enhance system prompt with contact context
        enhanced_prompt = f"""You are responding to {contact.name}, a member of our church community.

Contact Information:
- Name: {contact.name}
- Preferred Language: {contact.language}
- Group: {contact.group if hasattr(contact, 'group') else 'General'}
- Previous conversations: {len(conversation_history)}

Respond in a warm, pastoral manner in their preferred language ({contact.language}).
Reference previous conversations when relevant to show you remember them.
Keep responses concise and appropriate for SMS/text messaging.
"""
        
        # Add enhanced context to conversation history
        history_with_context = [
            {"role": "system", "content": enhanced_prompt}
        ] + conversation_history
        
        # Generate reply
        reply = await llm_service.get_response(
            request.message,
            conversation_history=history_with_context
        )
        
        # Detect language of reply
        reply_language = await llm_service.detect_language(reply)
        
        return GenerateReplyResponse(
            reply=reply,
            language=reply_language,
            conversation_context=conversation_history
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating reply: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate reply: {str(e)}")


@router.post("/translate")
async def translate_message(request: TranslateRequest):
    """
    Translate a message to another language while maintaining pastoral tone.
    """
    try:
        translation_prompt = f"""Translate the following text to {request.to_language}.
Maintain a {request.maintain_tone} tone.
Keep the translation natural and culturally appropriate.

Text to translate: {request.text}

Return only the translation, no explanations.
"""
        
        translated = await llm_service.get_response(translation_prompt)
        
        return {
            "original": request.text,
            "translated": translated,
            "to_language": request.to_language,
            "tone": request.maintain_tone
        }
        
    except Exception as e:
        logger.error(f"Error translating message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


@router.post("/personalize")
async def personalize_message(
    template: str,
    contact_id: int,
    db: Session = Depends(get_db)
):
    """
    Personalize a message template for a specific contact.
    Useful for bulk messaging with personal touches.
    """
    try:
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        personalization_prompt = f"""Personalize this message template for {contact.name}.

Template: {template}

Contact details:
- Name: {contact.name}
- Language: {contact.language}
- Group: {contact.group if hasattr(contact, 'group') else 'General'}

Instructions:
1. Replace generic greetings with their name
2. Translate to {contact.language} if needed
3. Add culturally appropriate touches
4. Keep the core message the same
5. Keep it concise (under 160 characters if possible)

Return only the personalized message.
"""
        
        personalized = await llm_service.get_response(personalization_prompt)
        
        return {
            "original_template": template,
            "personalized_message": personalized,
            "contact_name": contact.name,
            "language": contact.language
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error personalizing message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Personalization failed: {str(e)}")


@router.get("/conversation/{contact_id}")
async def get_conversation_summary(
    contact_id: int,
    db: Session = Depends(get_db)
):
    """
    Get an AI-generated summary of conversations with a contact.
    Useful for pastoral review and context understanding.
    """
    try:
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        conversations = db.query(Conversation).filter(
            Conversation.contact_id == contact_id
        ).order_by(Conversation.timestamp.desc()).limit(50).all()
        
        if not conversations:
            return {
                "summary": f"No conversations recorded with {contact.name} yet.",
                "message_count": 0,
                "topics": [],
                "sentiment": "neutral"
            }
        
        # Prepare conversation for summarization
        conversation_history = [
            {
                "role": "user" if conv.direction == "inbound" else "assistant",
                "content": conv.message,
                "timestamp": conv.timestamp.isoformat()
            }
            for conv in reversed(conversations)
        ]
        
        # Generate summary
        summary = await llm_service.summarize_conversation(conversation_history)
        
        return {
            "contact_name": contact.name,
            "summary": summary,
            "message_count": len(conversations),
            "date_range": {
                "first": conversations[-1].timestamp.isoformat(),
                "last": conversations[0].timestamp.isoformat()
            },
            "conversation_preview": conversation_history[-5:]  # Last 5 messages
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating conversation summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")
