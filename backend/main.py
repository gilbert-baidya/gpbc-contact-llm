from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
import logging

from config import settings
from database import engine, get_db, Base
from models import Contact, Message, CallLog, ScheduledReminder, MessageStatus, ConversationHistory
from schemas import (
    ContactCreate, ContactResponse, ContactUpdate,
    MessageCreate, MessageResponse,
    ScheduledReminderCreate, ScheduledReminderResponse,
    CallLogResponse, VoiceCallRequest, StatisticsResponse
)
from services.twilio_service import twilio_service
from services.llm_service import llm_service
from tasks import send_sms_task, make_call_task

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import authentication
try:
    from auth_routes import router as auth_router
    from auth_models import Base as AuthBase
    AUTH_AVAILABLE = True
    # Create auth tables
    AuthBase.metadata.create_all(bind=engine)
except ImportError as e:
    AUTH_AVAILABLE = False
    logger.warning(f"Authentication module not available: {e}")

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Church Contact Communication System",
    description="LLM-powered communication platform for church contact management",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes if available
if AUTH_AVAILABLE:
    app.include_router(auth_router)
    logger.info("✅ Authentication system enabled")


# ==================== Health Check ====================

@app.get("/")
def read_root():
    return {
        "message": "Church Contact Communication System API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# ==================== Contact Management ====================

@app.post("/api/contacts", response_model=ContactResponse)
def create_contact(contact: ContactCreate, db: Session = Depends(get_db)):
    """Create a new contact"""
    db_contact = Contact(**contact.dict())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact


@app.get("/api/contacts", response_model=List[ContactResponse])
def list_contacts(
    skip: int = 0,
    limit: int = 1000,
    active_only: bool = True,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all contacts with optional filtering"""
    query = db.query(Contact)
    
    if active_only:
        query = query.filter(Contact.active == True)
    
    if search:
        query = query.filter(
            (Contact.name.ilike(f"%{search}%")) |
            (Contact.phone.ilike(f"%{search}%"))
        )
    
    contacts = query.offset(skip).limit(limit).all()
    return contacts


@app.get("/api/contacts/{contact_id}", response_model=ContactResponse)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    """Get a specific contact"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@app.put("/api/contacts/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: int, contact_update: ContactUpdate, db: Session = Depends(get_db)):
    """Update a contact"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    for key, value in contact_update.dict(exclude_unset=True).items():
        setattr(contact, key, value)
    
    db.commit()
    db.refresh(contact)
    return contact


@app.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    """Delete a contact (soft delete by setting active=False)"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact.active = False
    db.commit()
    return {"message": "Contact deactivated successfully"}


@app.post("/api/contacts/import")
async def import_contacts(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import contacts from CSV file"""
    import re
    
    def clean_phone(phone):
        """Convert phone to E.164 format"""
        digits = re.sub(r'\D', '', str(phone))
        if len(digits) == 10:
            return f"+1{digits}"
        elif len(digits) == 11 and digits[0] == '1':
            return f"+{digits}"
        elif len(digits) == 7:
            return f"+1909{digits}"  # Add 909 area code for 7-digit numbers
        return f"+{digits}"
    
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        imported_count = 0
        errors = []
        
        # Detect CSV format based on column names
        has_phone_e164 = 'Phone_E164' in df.columns
        has_tel_nos = 'Tel.Nos.' in df.columns
        
        logger.info(f"CSV columns: {df.columns.tolist()}")
        logger.info(f"Detected format - Phone_E164: {has_phone_e164}, Tel.Nos: {has_tel_nos}")
        logger.info(f"Total rows in CSV: {len(df)}")
        
        for index, row in df.iterrows():
            try:
                # Determine which columns to use based on CSV format
                if has_phone_e164:
                    # New format: ID, Name, Phone_E164, City, Language, etc.
                    name_col = 'Name'
                    phone_col = 'Phone_E164'
                    city_col = 'City'
                    language_col = 'Language'
                    id_col = 'ID'
                    
                    name_val = row.get(name_col)
                    phone_val = row.get(phone_col)
                    
                    # Skip empty rows - check for both NaN and empty strings
                    if pd.isna(name_val) or pd.isna(phone_val) or str(phone_val).strip() == '':
                        logger.info(f"Skipping row {index + 1}: name={name_val}, phone={phone_val}")
                        continue
                    
                    # Map language codes
                    lang = str(row.get(language_col, 'EN')).lower()
                    if lang == 'en':
                        preferred_language = 'english'
                    elif lang == 'bn':
                        preferred_language = 'bengali'
                    else:
                        preferred_language = 'english'
                    
                    contact = Contact(
                        sl_no=str(row.get(id_col, '')),
                        name=str(name_val).strip(),
                        address=None,
                        city=row.get(city_col, '').strip() if not pd.isna(row.get(city_col)) else None,
                        state_zip=None,
                        phone=str(phone_val).strip(),
                        preferred_language=preferred_language,
                        active=True
                    )
                    
                elif has_tel_nos:
                    # Old format: Sl.Nos., Name, Tel.Nos., Address, City, StateZip
                    name_col = 'Name'
                    phone_col = 'Tel.Nos.'
                    
                    # Skip empty rows
                    if pd.isna(row.get(name_col)) or pd.isna(row.get(phone_col)):
                        continue
                    
                    contact = Contact(
                        sl_no=str(row.get('Sl.Nos.', '')),
                        name=row[name_col].strip(),
                        address=row.get('Address', '').strip() if not pd.isna(row.get('Address')) else None,
                        city=row.get('City', '').strip() if not pd.isna(row.get('City')) else None,
                        state_zip=row.get('StateZip', '').strip() if not pd.isna(row.get('StateZip')) else None,
                        phone=clean_phone(row[phone_col]),
                        preferred_language='bengali',
                        active=True
                    )
                else:
                    raise ValueError("Unsupported CSV format. Please ensure CSV has either 'Phone_E164' or 'Tel.Nos.' column")
                
                db.add(contact)
                imported_count += 1
                
            except Exception as e:
                error_msg = f"Row {index + 1}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        db.commit()
        
        logger.info(f"Import complete: {imported_count} contacts imported, {len(errors)} errors")
        
        return {
            "success": True,
            "imported": imported_count,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        logger.error(f"Import error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


# ==================== Messaging ====================

@app.post("/api/messages/send", response_model=dict)
def send_message(message: MessageCreate, db: Session = Depends(get_db)):
    """Send message to contacts"""
    try:
        sent_results = []
        
        # Handle phone_numbers from Google Sheets (via Node.js)
        if message.phone_numbers:
            logger.info(f"Sending to {len(message.phone_numbers)} contacts from Google Sheets")
            for contact_data in message.phone_numbers:
                phone = contact_data.get('phone')
                name = contact_data.get('name', 'Unknown')
                
                if not phone:
                    continue
                
                # Send SMS directly without storing in DB
                if message.message_type.value == "sms":
                    result = twilio_service.send_sms(phone, message.content)
                    sent_results.append({
                        "name": name,
                        "phone": phone,
                        "success": result.get("success"),
                        "sid": result.get("sid"),
                        "error": result.get("error")
                    })
                    logger.info(f"SMS to {name} ({phone}): {result}")
                else:
                    result = twilio_service.make_call(phone, message.content)
                    sent_results.append({
                        "name": name,
                        "phone": phone,
                        "success": result.get("success"),
                        "sid": result.get("sid"),
                        "error": result.get("error")
                    })
                    logger.info(f"Call to {name} ({phone}): {result}")
            
            successful = sum(1 for r in sent_results if r.get("success"))
            failed = len(sent_results) - successful
            
            return {
                "success": True,
                "message": f"Sent {successful} messages, {failed} failed",
                "total": len(sent_results),
                "successful": successful,
                "failed": failed,
                "results": sent_results
            }
        
        # Handle contact_ids from local database (legacy)
        contact_ids = []
        
        if message.send_to_all:
            contacts = db.query(Contact).filter(Contact.active == True).all()
            contact_ids = [c.id for c in contacts]
        elif message.contact_ids:
            contact_ids = message.contact_ids
        elif message.contact_id:
            contact_ids = [message.contact_id]
        else:
            raise HTTPException(status_code=400, detail="No contacts specified")
        
        sent_messages = []
        
        for contact_id in contact_ids:
            contact = db.query(Contact).filter(Contact.id == contact_id).first()
            if not contact:
                continue
                
            msg = Message(
                contact_id=contact_id,
                message_type=message.message_type,
                content=message.content,
                status=MessageStatus.QUEUED,
                scheduled_at=message.scheduled_at
            )
            db.add(msg)
            db.flush()
            
            # Queue message for sending
            if message.message_type.value == "sms":
                send_sms_task.delay(msg.id)
            else:
                make_call_task.delay(contact_id, message.content)
            
            sent_messages.append(msg.id)
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Queued {len(sent_messages)} messages",
            "message_ids": sent_messages
        }
        
    except Exception as e:
        logger.error(f"Send message error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/messages", response_model=List[MessageResponse])
def list_messages(
    skip: int = 0,
    limit: int = 100,
    contact_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List messages with optional filtering"""
    query = db.query(Message)
    
    if contact_id:
        query = query.filter(Message.contact_id == contact_id)
    
    messages = query.order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
    return messages


# ==================== Voice Calls ====================

@app.post("/api/calls/make")
def make_voice_call(call_request: VoiceCallRequest, db: Session = Depends(get_db)):
    """Initiate voice calls"""
    try:
        contact_ids = []
        
        if call_request.phone_number:
            # Direct phone call
            result = twilio_service.make_call(call_request.phone_number, call_request.message)
            return {"success": True, "result": result}
        
        if call_request.contact_ids:
            contact_ids = call_request.contact_ids
        elif call_request.contact_id:
            contact_ids = [call_request.contact_id]
        else:
            raise HTTPException(status_code=400, detail="No contacts or phone specified")
        
        results = []
        for contact_id in contact_ids:
            make_call_task.delay(contact_id, call_request.message)
            results.append(contact_id)
        
        return {
            "success": True,
            "message": f"Queued {len(results)} calls",
            "contact_ids": results
        }
        
    except Exception as e:
        logger.error(f"Make call error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/calls", response_model=List[CallLogResponse])
def list_call_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List call logs"""
    call_logs = db.query(CallLog).order_by(CallLog.created_at.desc()).offset(skip).limit(limit).all()
    return call_logs


# ==================== Scheduled Reminders ====================

@app.post("/api/reminders", response_model=ScheduledReminderResponse)
def create_reminder(reminder: ScheduledReminderCreate, db: Session = Depends(get_db)):
    """Create a scheduled reminder"""
    db_reminder = ScheduledReminder(**reminder.dict())
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder


@app.get("/api/reminders", response_model=List[ScheduledReminderResponse])
def list_reminders(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List scheduled reminders"""
    query = db.query(ScheduledReminder)
    
    if active_only:
        query = query.filter(ScheduledReminder.active == True)
    
    reminders = query.offset(skip).limit(limit).all()
    return reminders


@app.delete("/api/reminders/{reminder_id}")
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Delete a reminder"""
    reminder = db.query(ScheduledReminder).filter(ScheduledReminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    reminder.active = False
    db.commit()
    return {"message": "Reminder deactivated successfully"}


# ==================== Statistics ====================

@app.get("/api/statistics", response_model=StatisticsResponse)
def get_statistics(db: Session = Depends(get_db)):
    """Get system statistics"""
    total_contacts = db.query(Contact).count()
    active_contacts = db.query(Contact).filter(Contact.active == True).count()
    total_messages = db.query(Message).filter(Message.status == MessageStatus.SENT).count()
    total_calls = db.query(CallLog).count()
    scheduled_reminders = db.query(ScheduledReminder).filter(ScheduledReminder.active == True).count()
    
    return {
        "total_contacts": total_contacts,
        "active_contacts": active_contacts,
        "total_messages_sent": total_messages,
        "total_calls_made": total_calls,
        "scheduled_reminders": scheduled_reminders
    }


# ==================== Twilio Webhooks ====================

@app.post("/api/webhooks/twilio/voice-inbound")
async def handle_inbound_call(request: Request, db: Session = Depends(get_db)):
    """Handle inbound voice calls"""
    form_data = await request.form()
    caller_phone = form_data.get("From")
    call_sid = form_data.get("CallSid")
    
    # Create call log
    call_log = CallLog(
        caller_phone=caller_phone,
        direction="inbound",
        twilio_call_sid=call_sid
    )
    db.add(call_log)
    db.commit()
    
    # Generate greeting TwiML
    twiml = twilio_service.generate_greeting_twiml()
    
    return Response(content=twiml, media_type="application/xml")


@app.post("/api/webhooks/twilio/voice-outbound")
async def handle_outbound_call(request: Request):
    """Handle outbound voice calls"""
    twiml = twilio_service.generate_greeting_twiml()
    return Response(content=twiml, media_type="application/xml")


@app.post("/api/webhooks/twilio/voice-response")
async def handle_voice_response(request: Request, db: Session = Depends(get_db)):
    """Handle voice conversation responses"""
    form_data = await request.form()
    speech_result = form_data.get("SpeechResult", "")
    call_sid = form_data.get("CallSid")
    
    if not speech_result:
        twiml = twilio_service.generate_response_twiml(
            "I didn't catch that. Could you please repeat?",
            continue_conversation=True
        )
        return Response(content=twiml, media_type="application/xml")
    
    # Get call log
    call_log = db.query(CallLog).filter(CallLog.twilio_call_sid == call_sid).first()
    
    # Get conversation history
    conversation_history = []
    if call_log:
        history = db.query(ConversationHistory).filter(
            ConversationHistory.call_log_id == call_log.id
        ).all()
        conversation_history = [{"role": h.role, "content": h.content} for h in history]
    
    # Get LLM response
    llm_response = llm_service.get_response(speech_result, conversation_history)
    
    # Save conversation
    if call_log:
        db.add(ConversationHistory(
            call_log_id=call_log.id,
            role="user",
            content=speech_result
        ))
        db.add(ConversationHistory(
            call_log_id=call_log.id,
            role="assistant",
            content=llm_response
        ))
        db.commit()
    
    # Generate response TwiML
    twiml = twilio_service.generate_response_twiml(llm_response, continue_conversation=True)
    
    return Response(content=twiml, media_type="application/xml")


@app.post("/api/webhooks/twilio/call-status")
async def handle_call_status(request: Request, db: Session = Depends(get_db)):
    """Handle call status updates"""
    form_data = await request.form()
    call_sid = form_data.get("CallSid")
    call_status = form_data.get("CallStatus")
    call_duration = form_data.get("CallDuration", 0)
    
    call_log = db.query(CallLog).filter(CallLog.twilio_call_sid == call_sid).first()
    
    if call_log:
        call_log.duration = int(call_duration)
        
        # Generate conversation summary if call completed
        if call_status == "completed":
            history = db.query(ConversationHistory).filter(
                ConversationHistory.call_log_id == call_log.id
            ).all()
            
            if history:
                conversation_history = [{"role": h.role, "content": h.content} for h in history]
                summary = llm_service.summarize_conversation(conversation_history)
                call_log.conversation_summary = summary
        
        db.commit()
    
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
