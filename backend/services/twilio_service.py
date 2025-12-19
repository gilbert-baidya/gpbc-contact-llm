from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather
from config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class TwilioService:
    def __init__(self):
        self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        self.phone_number = settings.TWILIO_PHONE_NUMBER
    
    def send_sms(self, to_phone: str, message: str) -> dict:
        """Send SMS message to a phone number"""
        try:
            message_obj = self.client.messages.create(
                body=message,
                from_=self.phone_number,
                to=to_phone
            )
            
            return {
                "success": True,
                "sid": message_obj.sid,
                "status": message_obj.status
            }
        except Exception as e:
            logger.error(f"Failed to send SMS to {to_phone}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def make_call(self, to_phone: str, message: Optional[str] = None) -> dict:
        """Initiate a voice call"""
        try:
            # Create TwiML for the call
            twiml_url = f"{settings.BACKEND_URL}/api/webhooks/twilio/voice-outbound"
            
            call = self.client.calls.create(
                to=to_phone,
                from_=self.phone_number,
                url=twiml_url,
                method='POST',
                status_callback=f"{settings.BACKEND_URL}/api/webhooks/twilio/call-status",
                status_callback_event=['completed']
            )
            
            return {
                "success": True,
                "sid": call.sid,
                "status": call.status
            }
        except Exception as e:
            logger.error(f"Failed to make call to {to_phone}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def generate_greeting_twiml(self, language: str = "en") -> str:
        """Generate TwiML for greeting caller"""
        response = VoiceResponse()
        
        greetings = {
            "en": "Hello! Thank you for calling our church. How may I help you today?",
            "bn": "হ্যালো! আমাদের চার্চে কল করার জন্য ধন্যবাদ। আমি কিভাবে আপনাকে সাহায্য করতে পারি?",
            "hi": "नमस्ते! हमारे चर्च को कॉल करने के लिए धन्यवाद। मैं आज आपकी कैसे मदद कर सकता हूं?",
            "es": "¡Hola! Gracias por llamar a nuestra iglesia. ¿Cómo puedo ayudarte hoy?"
        }
        
        greeting = greetings.get(language, greetings["en"])
        
        # Gather user input
        gather = Gather(
            input='speech',
            action=f"{settings.BACKEND_URL}/api/webhooks/twilio/voice-response",
            method='POST',
            language='en-US',
            speech_timeout='auto'
        )
        gather.say(greeting)
        
        response.append(gather)
        
        # If no input, say goodbye
        response.say("I didn't receive any input. Goodbye!")
        
        return str(response)
    
    def generate_response_twiml(self, response_text: str, continue_conversation: bool = True) -> str:
        """Generate TwiML for responding to user"""
        response = VoiceResponse()
        response.say(response_text)
        
        if continue_conversation:
            # Continue gathering input
            gather = Gather(
                input='speech',
                action=f"{settings.BACKEND_URL}/api/webhooks/twilio/voice-response",
                method='POST',
                language='en-US',
                speech_timeout='auto'
            )
            gather.say("Is there anything else I can help you with?")
            response.append(gather)
        else:
            response.say("Thank you for calling. Goodbye!")
        
        return str(response)


# Create singleton instance
twilio_service = TwilioService()
