from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from models import MessageStatus, MessageType


# Contact Schemas
class ContactBase(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state_zip: Optional[str] = None
    phone: str
    preferred_language: str = "english"
    active: bool = True


class ContactCreate(ContactBase):
    sl_no: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state_zip: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
    active: Optional[bool] = None


class ContactResponse(ContactBase):
    id: int
    sl_no: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Message Schemas
class MessageBase(BaseModel):
    content: str
    message_type: MessageType = MessageType.SMS


class MessageCreate(MessageBase):
    contact_id: Optional[int] = None
    contact_ids: Optional[List[int]] = None
    phone_numbers: Optional[List[dict]] = None  # [{id, name, phone}, ...]
    send_to_all: bool = False
    scheduled_at: Optional[datetime] = None


class MessageResponse(MessageBase):
    id: int
    contact_id: int
    status: MessageStatus
    scheduled_at: Optional[datetime]
    sent_at: Optional[datetime]
    twilio_sid: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Scheduled Reminder Schemas
class ScheduledReminderCreate(BaseModel):
    name: str
    message_content: str
    message_type: MessageType = MessageType.SMS
    schedule_type: str  # weekly, once, monthly
    schedule_day: Optional[str] = None
    schedule_time: str
    schedule_date: Optional[datetime] = None
    send_to_all: bool = True


class ScheduledReminderResponse(ScheduledReminderCreate):
    id: int
    active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Call Log Schemas
class CallLogResponse(BaseModel):
    id: int
    contact_id: Optional[int]
    caller_phone: str
    caller_name: Optional[str]
    direction: str
    duration: int
    conversation_summary: Optional[str]
    language_detected: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Bulk Import Schema
class BulkContactImport(BaseModel):
    contacts: List[ContactCreate]


# Voice Call Request
class VoiceCallRequest(BaseModel):
    contact_id: Optional[int] = None
    contact_ids: Optional[List[int]] = None
    phone_number: Optional[str] = None
    message: Optional[str] = None


# Statistics Response
class StatisticsResponse(BaseModel):
    total_contacts: int
    active_contacts: int
    total_messages_sent: int
    total_calls_made: int
    scheduled_reminders: int
