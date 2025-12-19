from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class MessageStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    QUEUED = "queued"


class MessageType(str, enum.Enum):
    SMS = "sms"
    VOICE = "voice"


class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    sl_no = Column(String, unique=True, index=True)
    name = Column(String, nullable=False, index=True)
    address = Column(String)
    city = Column(String)
    state_zip = Column(String)
    phone = Column(String, nullable=False, index=True)
    preferred_language = Column(String, default="english")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    messages = relationship("Message", back_populates="contact")
    call_logs = relationship("CallLog", back_populates="contact")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    message_type = Column(Enum(MessageType), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(Enum(MessageStatus), default=MessageStatus.PENDING)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    twilio_sid = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    contact = relationship("Contact", back_populates="messages")


class CallLog(Base):
    __tablename__ = "call_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    caller_phone = Column(String, nullable=False)
    caller_name = Column(String, nullable=True)
    direction = Column(String, nullable=False)  # inbound or outbound
    duration = Column(Integer, default=0)  # in seconds
    twilio_call_sid = Column(String, nullable=True)
    conversation_summary = Column(Text, nullable=True)
    language_detected = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    contact = relationship("Contact", back_populates="call_logs")


class ScheduledReminder(Base):
    __tablename__ = "scheduled_reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    message_content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.SMS)
    schedule_type = Column(String, nullable=False)  # weekly, once, monthly
    schedule_day = Column(String, nullable=True)  # monday, tuesday, etc.
    schedule_time = Column(String, nullable=False)  # HH:MM format
    schedule_date = Column(DateTime(timezone=True), nullable=True)  # for one-time
    active = Column(Boolean, default=True)
    send_to_all = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ConversationHistory(Base):
    __tablename__ = "conversation_history"
    
    id = Column(Integer, primary_key=True, index=True)
    call_log_id = Column(Integer, ForeignKey("call_logs.id"))
    role = Column(String, nullable=False)  # user or assistant
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
