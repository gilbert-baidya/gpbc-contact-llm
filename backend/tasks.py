from celery import Celery
from config import settings
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Message, Contact, MessageStatus, ScheduledReminder
from services.twilio_service import twilio_service
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Create Celery app
celery_app = Celery(
    "church_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Los_Angeles',
    enable_utc=True,
)


@celery_app.task(name="send_sms_task")
def send_sms_task(message_id: int):
    """Send SMS message"""
    db = SessionLocal()
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            logger.error(f"Message {message_id} not found")
            return
        
        contact = db.query(Contact).filter(Contact.id == message.contact_id).first()
        if not contact:
            logger.error(f"Contact {message.contact_id} not found")
            message.status = MessageStatus.FAILED
            message.error_message = "Contact not found"
            db.commit()
            return
        
        # Send SMS
        result = twilio_service.send_sms(contact.phone, message.content)
        
        if result["success"]:
            message.status = MessageStatus.SENT
            message.twilio_sid = result["sid"]
            message.sent_at = datetime.utcnow()
        else:
            message.status = MessageStatus.FAILED
            message.error_message = result.get("error", "Unknown error")
        
        db.commit()
        logger.info(f"SMS sent to {contact.phone}: {result}")
        
    except Exception as e:
        logger.error(f"Error sending SMS for message {message_id}: {str(e)}")
        if message:
            message.status = MessageStatus.FAILED
            message.error_message = str(e)
            db.commit()
    finally:
        db.close()


@celery_app.task(name="make_call_task")
def make_call_task(contact_id: int, message: str = None):
    """Make voice call"""
    db = SessionLocal()
    try:
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            logger.error(f"Contact {contact_id} not found")
            return
        
        # Make call
        result = twilio_service.make_call(contact.phone, message)
        
        logger.info(f"Call initiated to {contact.phone}: {result}")
        
    except Exception as e:
        logger.error(f"Error making call to contact {contact_id}: {str(e)}")
    finally:
        db.close()


@celery_app.task(name="process_scheduled_reminders")
def process_scheduled_reminders():
    """Process scheduled reminders (runs periodically)"""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        current_time = now.strftime("%H:%M")
        current_day = now.strftime("%A").lower()
        
        # Find active reminders that should be sent
        reminders = db.query(ScheduledReminder).filter(
            ScheduledReminder.active == True,
            ScheduledReminder.schedule_time == current_time
        ).all()
        
        for reminder in reminders:
            # Check if it's the right day for weekly reminders
            if reminder.schedule_type == "weekly":
                if reminder.schedule_day.lower() != current_day:
                    continue
            
            # Check if it's the right date for one-time reminders
            elif reminder.schedule_type == "once":
                if not reminder.schedule_date or reminder.schedule_date.date() != now.date():
                    continue
                # Deactivate after sending
                reminder.active = False
            
            # Get contacts to send to
            if reminder.send_to_all:
                contacts = db.query(Contact).filter(Contact.active == True).all()
            else:
                # TODO: Add contact selection for specific groups
                contacts = []
            
            # Create and queue messages
            for contact in contacts:
                message = Message(
                    contact_id=contact.id,
                    message_type=reminder.message_type,
                    content=reminder.message_content,
                    status=MessageStatus.QUEUED,
                    scheduled_at=now
                )
                db.add(message)
                db.flush()
                
                # Queue the message
                if reminder.message_type.value == "sms":
                    send_sms_task.delay(message.id)
                else:
                    make_call_task.delay(contact.id, reminder.message_content)
        
        db.commit()
        logger.info(f"Processed scheduled reminders at {current_time}")
        
    except Exception as e:
        logger.error(f"Error processing scheduled reminders: {str(e)}")
    finally:
        db.close()


# Configure periodic tasks
celery_app.conf.beat_schedule = {
    'process-reminders-every-minute': {
        'task': 'process_scheduled_reminders',
        'schedule': 60.0,  # Run every minute
    },
}
