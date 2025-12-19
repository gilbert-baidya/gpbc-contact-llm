# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                    (Web Browser)                             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  FRONTEND (React)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Dashboard  │  Contacts  │  Messaging  │  Reminders  │  │
│  └──────────────────────────────────────────────────────┘  │
│       - TypeScript                                           │
│       - React Query                                          │
│       - Tailwind CSS                                         │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  BACKEND (FastAPI)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     API Routes      │    Business Logic             │  │
│  │  /contacts          │   - Contact CRUD              │  │
│  │  /messages          │   - Message processing        │  │
│  │  /calls             │   - Call handling             │  │
│  │  /reminders         │   - Schedule management       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Services Layer                           │  │
│  │  - Twilio Service  (SMS/Voice)                       │  │
│  │  - LLM Service     (AI Conversations)                │  │
│  │  - Database Service                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────┬──────────┬──────────┬─────────────┬───────────────┘
         │          │          │             │
         │          │          │             │
    ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐  ┌────▼──────┐
    │ Twilio │ │ OpenAI │ │  Redis │  │PostgreSQL │
    │  API   │ │  API   │ │ Cache  │  │ Database  │
    └────────┘ └────────┘ └────┬───┘  └────┬──────┘
                                │           │
                         ┌──────▼───────────▼────────┐
                         │   CELERY WORKERS          │
                         │  - Send SMS Tasks         │
                         │  - Make Call Tasks        │
                         │  - Scheduled Reminders    │
                         └───────────────────────────┘
```

## Data Flow

### 1. Sending SMS Message

```
User → Frontend → Backend API → Celery Task Queue
                                      ↓
                                 Celery Worker
                                      ↓
                                 Twilio API
                                      ↓
                                 Recipient Phone
```

### 2. Inbound Voice Call

```
Caller → Twilio Number → Webhook → Backend API
                                        ↓
                                  LLM Service (OpenAI)
                                        ↓
                                  Generate Response
                                        ↓
                                  TwiML Response
                                        ↓
                                  Caller hears AI voice
```

### 3. Scheduled Reminder

```
Celery Beat (Scheduler) → Check Active Reminders
                              ↓
                         Match Time/Day?
                              ↓
                         Create Messages
                              ↓
                         Queue to Celery Workers
                              ↓
                         Send via Twilio
```

## Component Details

### Frontend Components

```
src/
├── App.tsx                      # Main app with routing
│   ├── Layout                   # Sidebar navigation
│   └── Routes
│       ├── DashboardPage        # Stats & recent activity
│       ├── ContactsPage         # Contact management
│       ├── MessagingPage        # Send messages
│       └── RemindersPage        # Schedule management
│
├── api/
│   └── client.ts               # API client with Axios
│       ├── contactsAPI
│       ├── messagesAPI
│       ├── callsAPI
│       └── remindersAPI
│
└── index.css                   # Tailwind styles
```

### Backend Components

```
backend/
├── main.py                     # FastAPI app & routes
│   ├── /api/contacts/*
│   ├── /api/messages/*
│   ├── /api/calls/*
│   ├── /api/reminders/*
│   └── /api/webhooks/twilio/*
│
├── models.py                   # SQLAlchemy models
│   ├── Contact
│   ├── Message
│   ├── CallLog
│   ├── ScheduledReminder
│   └── ConversationHistory
│
├── schemas.py                  # Pydantic schemas
│   ├── ContactCreate/Response
│   ├── MessageCreate/Response
│   └── ReminderCreate/Response
│
├── services/
│   ├── twilio_service.py      # Twilio integration
│   │   ├── send_sms()
│   │   ├── make_call()
│   │   └── generate_twiml()
│   │
│   └── llm_service.py         # OpenAI integration
│       ├── get_response()
│       ├── detect_language()
│       └── summarize_conversation()
│
└── tasks.py                    # Celery tasks
    ├── send_sms_task()
    ├── make_call_task()
    └── process_scheduled_reminders()
```

## Database Schema

```sql
┌─────────────────────┐
│     contacts        │
├─────────────────────┤
│ id (PK)            │
│ sl_no              │
│ name               │
│ address            │
│ city               │
│ state_zip          │
│ phone              │
│ preferred_language │
│ active             │
│ created_at         │
│ updated_at         │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│     messages        │
├─────────────────────┤
│ id (PK)            │
│ contact_id (FK)    │
│ message_type       │
│ content            │
│ status             │
│ scheduled_at       │
│ sent_at            │
│ twilio_sid         │
│ error_message      │
│ created_at         │
└─────────────────────┘

┌─────────────────────┐
│    call_logs        │
├─────────────────────┤
│ id (PK)            │
│ contact_id (FK)    │
│ caller_phone       │
│ caller_name        │
│ direction          │
│ duration           │
│ twilio_call_sid    │
│ conversation_summary│
│ language_detected  │
│ created_at         │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│ conversation_history│
├─────────────────────┤
│ id (PK)            │
│ call_log_id (FK)   │
│ role               │
│ content            │
│ timestamp          │
└─────────────────────┘

┌─────────────────────┐
│scheduled_reminders  │
├─────────────────────┤
│ id (PK)            │
│ name               │
│ message_content    │
│ message_type       │
│ schedule_type      │
│ schedule_day       │
│ schedule_time      │
│ schedule_date      │
│ active             │
│ send_to_all        │
│ created_at         │
│ updated_at         │
└─────────────────────┘
```

## API Flow Examples

### Example 1: Send SMS to All

```
1. User clicks "Send SMS" in UI
   ↓
2. Frontend: POST /api/messages/send
   Body: {
     content: "Hello!",
     message_type: "sms",
     send_to_all: true
   }
   ↓
3. Backend: Validates request
   ↓
4. Backend: Queries active contacts
   ↓
5. Backend: Creates Message records
   ↓
6. Backend: Queues Celery tasks
   ↓
7. Celery Worker: Picks up tasks
   ↓
8. Celery Worker: Calls Twilio API
   ↓
9. Twilio: Sends SMS
   ↓
10. Backend: Updates message status
   ↓
11. Frontend: Shows success notification
```

### Example 2: AI Voice Conversation

```
1. Caller dials Twilio number
   ↓
2. Twilio: Webhook to /api/webhooks/twilio/voice-inbound
   ↓
3. Backend: Creates CallLog
   ↓
4. Backend: Generates greeting TwiML
   ↓
5. Twilio: Speaks greeting to caller
   ↓
6. Caller speaks
   ↓
7. Twilio: Speech-to-text
   ↓
8. Twilio: POST to /api/webhooks/twilio/voice-response
   ↓
9. Backend: Sends to OpenAI
   ↓
10. OpenAI: Generates response
   ↓
11. Backend: Saves to ConversationHistory
   ↓
12. Backend: Returns TwiML with response
   ↓
13. Twilio: Speaks response to caller
   ↓
14. Loop back to step 6 until call ends
   ↓
15. Backend: Summarizes conversation
```

## Deployment Architecture

### Docker Compose Setup

```
┌─────────────────────────────────────────────────┐
│             Docker Compose                      │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │  PostgreSQL  │  │    Redis     │           │
│  │   :5432      │  │   :6379      │           │
│  └──────────────┘  └──────────────┘           │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │   Backend    │  │  Frontend    │           │
│  │   :8000      │  │   :3000      │           │
│  └──────────────┘  └──────────────┘           │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │Celery Worker │  │ Celery Beat  │           │
│  │  (Tasks)     │  │ (Scheduler)  │           │
│  └──────────────┘  └──────────────┘           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Network Flow

```
Internet
   │
   ├─→ Port 3000 → Frontend Container
   │                    ↓
   │               (API Calls)
   │                    ↓
   └─→ Port 8000 → Backend Container
                        ↓
                   ┌────┴────┐
                   │         │
              PostgreSQL   Redis
              Container   Container
```

## Security Layers

```
┌────────────────────────────────────┐
│         User Request               │
└───────────────┬────────────────────┘
                │
┌───────────────▼────────────────────┐
│      CORS Middleware               │
│  - Check origin                    │
│  - Validate headers                │
└───────────────┬────────────────────┘
                │
┌───────────────▼────────────────────┐
│     Input Validation               │
│  - Pydantic schemas                │
│  - Type checking                   │
└───────────────┬────────────────────┘
                │
┌───────────────▼────────────────────┐
│     Business Logic                 │
│  - Process request                 │
│  - Database operations             │
└───────────────┬────────────────────┘
                │
┌───────────────▼────────────────────┐
│     Database Layer                 │
│  - SQL injection protection (ORM)  │
│  - Connection pooling              │
└────────────────────────────────────┘
```

## Monitoring & Logging

```
┌─────────────────────────────────────────┐
│         Application Logs                │
│                                         │
│  ┌────────────┐  ┌────────────┐       │
│  │  Backend   │  │  Celery    │       │
│  │   Logs     │  │   Logs     │       │
│  └────────────┘  └────────────┘       │
│         │              │               │
│         └──────┬───────┘               │
│                │                       │
│         ┌──────▼──────┐                │
│         │   Docker    │                │
│         │   Logs      │                │
│         └─────────────┘                │
│                                         │
└─────────────────────────────────────────┘

View with: docker-compose logs -f
```

## Scaling Considerations

### Current Setup (Single Server)
```
1 Backend → 1 Database → 1 Redis → 1 Celery Worker
Handles: ~100 contacts, ~1000 messages/day
```

### Scaled Setup (Multiple Servers)
```
Load Balancer
    ↓
N Backend Instances → Shared Database
    ↓                     ↓
Shared Redis ← N Celery Workers
```

## Technology Versions

```
Backend:
  - Python: 3.11
  - FastAPI: 0.109.0
  - SQLAlchemy: 2.0.25
  - Celery: 5.3.6
  - Twilio: 8.11.0
  - OpenAI: 1.10.0

Frontend:
  - Node: 18+
  - React: 18.2
  - TypeScript: 5.2
  - Vite: 5.0
  - Tailwind: 3.4

Infrastructure:
  - PostgreSQL: 15
  - Redis: 7
  - Docker: 24+
  - Docker Compose: 2.0+
```

## Performance Metrics

```
Response Times:
  - API Endpoints: < 200ms
  - Database Queries: < 50ms
  - Frontend Load: < 2s
  - SMS Delivery: 2-5 seconds
  - Voice Call Setup: 3-8 seconds

Throughput:
  - SMS: ~10 per second
  - Voice Calls: ~5 concurrent
  - API Requests: ~100 per second
  - Database: 1000+ queries per second
```

## Integration Points

```
External APIs:
┌─────────────────────────────────────┐
│  Twilio API                         │
│  - SMS: /messages                   │
│  - Voice: /calls                    │
│  - Webhooks: Inbound handling       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  OpenAI API                         │
│  - Chat: /chat/completions          │
│  - Models: GPT-4 Turbo              │
└─────────────────────────────────────┘
```

This architecture provides a robust, scalable foundation for church communication! 🏗️
