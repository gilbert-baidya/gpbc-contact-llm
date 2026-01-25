from fastapi import APIRouter, Request, Form, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Contact, Conversation
from services.llm_service import llm_service
from services.twilio_service import twilio_service
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/twilio", tags=["Webhooks"])


@router.post("/sms", response_class=PlainTextResponse)
async def handle_incoming_sms(
    From: str = Form(...),
    Body: str = Form(...),
    MessageSid: str = Form(...),
    To: Optional[str] = Form(None)
):
    """
    Handle incoming SMS from Twilio webhook.
    Uses LLM to generate intelligent responses to member messages.
    """
    try:
        from database import SessionLocal
        db = SessionLocal()
        
        try:
            logger.info(f"Incoming SMS from {From}: {Body}")
            
            # Normalize phone number
            sender_phone = From.strip()
            
            # Find contact by phone
            contact = db.query(Contact).filter(Contact.phone == sender_phone).first()
            
            if not contact:
                # Unknown number - log and send generic response
                logger.warning(f"Unknown number: {sender_phone}")
                response_text = "Thank you for contacting our church! Please share your name so we can assist you better."
                
                # Store conversation without contact_id
                conv = Conversation(
                    contact_id=None,
                    direction="inbound",
                    message=Body,
                    language="en"
                )
                db.add(conv)
                db.commit()
                
                # Return TwiML response
                return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{response_text}</Message>
</Response>"""
            
            # Store incoming message
            incoming_conv = Conversation(
                contact_id=contact.id,
                direction="inbound",
                message=Body,
                language=contact.preferred_language
            )
            db.add(incoming_conv)
            db.flush()
            
            # Get conversation history (last 10 messages)
            conversations = db.query(Conversation).filter(
                Conversation.contact_id == contact.id
            ).order_by(Conversation.timestamp.desc()).limit(10).all()
            
            conversation_history = [
                {
                    "role": "user" if conv.direction == "inbound" else "assistant",
                    "content": conv.message
                }
                for conv in reversed(conversations[1:])  # Exclude the one we just added
            ]
            
            # Detect language
            detected_language = await llm_service.detect_language(Body)
            
            # Check for prayer request or urgent need
            analysis_prompt = f"""Analyze this message from {contact.name} and determine:
1. Is this a prayer request? (true/false)
2. Does this need immediate pastoral attention? (true/false)
3. What is the emotional tone? (urgent, distressed, happy, neutral, questioning)
4. What is the primary intent? (prayer_request, question, greeting, update, complaint)

Message: {Body}

Respond in JSON format:
{{"is_prayer_request": true/false, "needs_pastoral_care": true/false, "emotional_tone": "...", "intent": "..."}}
"""
            
            analysis = await llm_service.get_response(
                analysis_prompt,
                conversation_history=conversation_history
            )
            
            # Parse analysis (simplified - in production use structured output)
            needs_pastoral_care = False
            intent = "other"
            try:
                import json
                analysis_data = json.loads(analysis)
                needs_pastoral_care = analysis_data.get('needs_pastoral_care', False) or analysis_data.get('is_prayer_request', False)
                intent = analysis_data.get('intent', 'other')
            except:
                # Check for keywords as fallback
                prayer_keywords = ['pray', 'prayer', 'help', 'urgent', 'sick', 'hospital', 'death', 'emergency']
                if any(keyword in Body.lower() for keyword in prayer_keywords):
                    needs_pastoral_care = True
                    intent = 'prayer_request'
            
            # Generate intelligent response
            enhanced_prompt = f"""You are responding to {contact.name}, a member of our church community.

Contact Information:
- Name: {contact.name}
- Preferred Language: {contact.preferred_language}
- Previous conversations: {len(conversation_history)}

Message from {contact.name}: {Body}

Respond in a warm, pastoral manner in {contact.preferred_language or detected_language}.
Keep it concise (under 160 characters for SMS).
If this is a prayer request, acknowledge it with compassion and assure them of prayer support.
"""
            
            ai_response = await llm_service.get_response(
                Body,
                conversation_history=[
                    {"role": "system", "content": enhanced_prompt}
                ] + conversation_history
            )
            
            # Store outbound response
            outgoing_conv = Conversation(
                contact_id=contact.id,
                direction="outbound",
                message=ai_response,
                intent=intent,
                language=detected_language,
                needs_pastoral_care=needs_pastoral_care
            )
            db.add(outgoing_conv)
            
            # If prayer request or needs pastoral care, alert pastor
            if needs_pastoral_care:
                logger.info(f"Prayer request detected from {contact.name}")
                
                # Send alert to pastors (you can configure pastor numbers in settings)
                pastor_numbers = ['+19097630454']  # Configure this in settings
                alert_message = f"🙏 Prayer Request from {contact.name}:\n\n{Body}\n\nAI Response sent: {ai_response}"
                
                for pastor_phone in pastor_numbers:
                    try:
                        twilio_service.send_sms(pastor_phone, alert_message)
                        logger.info(f"Pastor alert sent to {pastor_phone}")
                    except Exception as e:
                        logger.error(f"Failed to alert pastor {pastor_phone}: {e}")
            
            db.commit()
            
            # Return TwiML response with AI-generated message
            return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{ai_response}</Message>
</Response>"""
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error handling incoming SMS: {str(e)}", exc_info=True)
        
        # Return generic error response
        return """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Thank you for your message. We'll get back to you soon!</Message>
</Response>"""


@router.post("/voice", response_class=PlainTextResponse)
async def handle_incoming_voice(
    From: str = Form(...),
    CallSid: str = Form(...)
):
    """
    Handle incoming voice calls from Twilio.
    Currently returns basic TwiML - could be enhanced with AI voice responses.
    """
    try:
        logger.info(f"Incoming call from {From}, CallSid: {CallSid}")
        
        # Basic voice response
        return """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Thank you for calling. Please leave a message after the beep, and someone from our church will get back to you soon.</Say>
    <Record maxLength="120" transcribe="true" transcribeCallback="/webhooks/twilio/transcription"/>
    <Say voice="alice">Thank you. God bless you!</Say>
</Response>"""
        
    except Exception as e:
        logger.error(f"Error handling incoming voice call: {str(e)}", exc_info=True)
        return """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">We're sorry, but we're having technical difficulties. Please try again later.</Say>
</Response>"""


@router.post("/transcription")
async def handle_transcription(
    TranscriptionText: str = Form(...),
    CallSid: str = Form(...),
    From: str = Form(...)
):
    """
    Handle voice message transcriptions from Twilio.
    Store and optionally process with LLM for insights.
    """
    try:
        logger.info(f"Transcription received from {From}: {TranscriptionText}")
        
        from database import SessionLocal
        db = SessionLocal()
        
        try:
            # Find contact
            contact = db.query(Contact).filter(Contact.phone == From).first()
            
            if contact:
                # Store as conversation
                conv = Conversation(
                    contact_id=contact.id,
                    direction="inbound",
                    message=f"[Voicemail] {TranscriptionText}",
                    language="en"
                )
                db.add(conv)
                
                # Check if it's a prayer request
                if any(word in TranscriptionText.lower() for word in ['pray', 'prayer', 'help', 'urgent']):
                    conv.needs_pastoral_care = True
                    conv.intent = 'prayer_request'
                    
                    # Alert pastor
                    pastor_numbers = ['+19097630454']
                    alert_message = f"🙏 Prayer Request (Voicemail) from {contact.name}:\n\n{TranscriptionText}"
                    
                    for pastor_phone in pastor_numbers:
                        try:
                            twilio_service.send_sms(pastor_phone, alert_message)
                        except Exception as e:
                            logger.error(f"Failed to alert pastor: {e}")
                
                db.commit()
            
            return {"success": True, "message": "Transcription processed"}
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error processing transcription: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}
