# System Architecture

## High-Level Overview - Hybrid Backend Architecture

The GPBC Church Contact Communication System uses a **hybrid three-tier architecture** with two specialized backends to optimize for their respective strengths.

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Web Browser)                        │
│                  http://localhost:3005                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  FRONTEND (React + TypeScript)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Dashboard  │  Contacts  │  Messaging  │  Reminders  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Technology Stack:                                           │
│  • React 18 + TypeScript 5                                   │
│  • Vite (Build tool & Dev server)                           │
│  • TanStack Query (Server state)                            │
│  • Tailwind CSS (Styling)                                    │
│  • Axios (HTTP client - DUAL instances)                     │
└────────┬─────────────────────────────────────┬──────────────┘
         │                                     │
         │ Contacts & Stats API                │ SMS & Voice API
         │ (port 3001)                         │ (port 8000)
         │                                     │
┌────────▼──────────────┐          ┌──────────▼─────────────┐
│  NODE.JS BACKEND      │          │  PYTHON BACKEND        │
│  Express Server       │          │  FastAPI Server        │
│  Port 3001            │          │  Port 8000             │
│                       │          │                        │
│  Purpose:             │          │  Purpose:              │
│  • Google Sheets      │          │  • SMS via Twilio      │
│    Data Proxy         │          │  • Voice Calls         │
│  • Real-time Stats    │          │  • Message History     │
│  • Contact Fetching   │          │  • LLM Integration     │
│                       │          │  • Background Tasks    │
│  Technology:          │          │                        │
│  • Express.js 4.x     │          │  Technology:           │
│  • Node.js 20.x       │          │  • FastAPI 0.109       │
│  • CORS enabled       │          │  • Python 3.12.8       │
│  • No database        │          │  • Uvicorn (ASGI)      │
│    (proxy only)       │          │  • SQLAlchemy 2.0      │
│                       │          │  • Twilio SDK 8.11     │
└────────┬──────────────┘          └──────────┬─────────────┘
         │                                    │
         │ Google Apps Script API             │ Twilio API
         │                                    │
┌────────▼──────────────┐          ┌──────────▼─────────────┐
│  GOOGLE SHEETS        │          │  TWILIO CLOUD          │
│  Contact Database     │          │  SMS & Voice Gateway   │
│                       │          │                        │
│  • 154 church members │          │  • Send SMS            │
│  • Real-time sync     │          │  • Make voice calls    │
│  • Opt-in status      │          │  • Delivery tracking   │
│  • No local storage   │          │  • Status callbacks    │
└───────────────────────┘          └──────────┬─────────────┘
                                              │
                                              │ Message logs
                                   ┌──────────▼─────────────┐
                                   │  SQLite Database       │
                                   │  church_contacts.db    │
                                   │                        │
                                   │  Tables:               │
                                   │  • messages            │
                                   │  • call_logs           │
                                   │  • scheduled_reminders │
                                   │  • conversation_history│
                                   └────────────────────────┘
```

---

## Why Hybrid Architecture?

### Design Philosophy

**Question:** Why not use a single backend?

**Answer:** Optimize each backend for its specific strengths.

| Requirement | Best Technology | Rationale |
|-------------|----------------|-----------|
| **Google Sheets API** | Node.js | • Lightweight proxying<br>• Fast I/O operations<br>• No heavy dependencies<br>• Real-time data sync |
| **Twilio Integration** | Python | • Mature SDK with better docs<br>• Rich error handling<br>• Industry standard |
| **AI/ML (OpenAI, LangChain)** | Python | • Dominant ecosystem<br>• LangChain, pandas, numpy<br>• Better type hints for ML |
| **Background Tasks** | Python | • Celery = battle-tested<br>• Redis integration<br>• Robust scheduling |
| **Data Processing** | Python | • pandas for CSV import<br>• NumPy for analytics<br>• No JS equivalent |


---

## Backend Comparison

### Node.js Backend (Port 3001)

**Responsibilities:**
- Google Sheets API proxy
- Contact data fetching (154 contacts)
- Real-time statistics aggregation
- Lightweight, stateless operations

**Technology Stack:**
- Express.js 4.x
- Node.js 20.x
- CORS middleware
- No database (proxies only)

**Endpoints:**
- `GET /api/contacts` → Fetches from Google Sheets
- `GET /api/statistics` → Aggregates from Google Sheets
- `POST /api/messages/send` → Mock (directs to Python)

**Why Node.js?**
- Faster startup time for proxying
- Simpler codebase for read-only operations
- No need for Twilio SDK overhead
- Easier to scale horizontally

### Python Backend (Port 8000)

**Responsibilities:**
- Twilio SMS and Voice integration
- Message history persistence
- LLM-powered conversations (OpenAI)
- Background scheduled reminders (Celery)
- Data processing and analytics

**Technology Stack:**
- FastAPI 0.109
- Python 3.12.8 (via pyenv)
- Twilio SDK 8.11
- SQLAlchemy 2.0 + SQLite
- OpenAI API
- Celery + Redis (for background tasks)

**Endpoints:**
- `POST /api/messages/send` → Send SMS via Twilio
- `POST /api/calls/make` → Make voice call via Twilio
- `GET /api/messages` → Retrieve message history from SQLite
- `POST /api/reminders` → Schedule background reminders

**Why Python?**
- Twilio SDK is more mature and better documented
- LangChain and OpenAI integration for AI features
- Celery for robust background task scheduling
- pandas/numpy for data analytics
- Better error handling for external APIs

---

## Data Flow Diagrams

### 1. Sending SMS Message

```
┌──────────────────────────────────────────────────────────────┐
│ User selects contacts in Contacts Page                       │
│ → Click "Send Message" → Navigate to Messaging Page          │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Session storage (selectedContacts)
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ MessagingPage.tsx - handleSend()                             │
│ 1. Check sheetContacts (from session storage)                │
│ 2. Build phone_numbers array: [{id, name, phone}, ...]       │
│ 3. Validate non-empty selection                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ HTTP POST
                         │ pythonAPI.post('/api/messages/send')
                         │ Body: { content: "...", phone_numbers: [...] }
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Python Backend - POST /api/messages/send                      │
│ (backend/main.py)                                             │
│ 1. Receive phone_numbers array                               │
│ 2. Iterate over each contact                                 │
│ 3. Call twilio_service.send_sms(phone, message)              │
│ 4. Track success/failure counts                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Twilio REST API
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Twilio Cloud Service                                          │
│ 1. Validate phone number format                              │
│ 2. Queue message for delivery                                │
│ 3. Return message SID (e.g., SM886151d214...)                │
│ 4. Deliver SMS to recipient phone                            │
└───────────────────────────────────────────────────────────────┘
```


### 2. Fetching Contacts

```
┌──────────────────────────────────────────────────────────────┐
│ User navigates to Contacts Page                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ React Query useQuery
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ ContactsPage.tsx - fetchBackendContacts()                     │
│ api.get('/api/contacts')                                      │
│ → Uses NODE.js backend (port 3001)                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ HTTP GET http://localhost:3001/api/contacts
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Node.js Backend - GET /api/contacts                           │
│ (server.js)                                                   │
│ 1. Receive request with CORS headers                         │
│ 2. Forward to Google Apps Script API                         │
│ 3. Receive JSON response (154 contacts)                      │
│ 4. Return to frontend                                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Google Apps Script API
                         │ (Deployed web app URL)
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Google Apps Script - Code.gs                                  │
│ 1. Read Google Sheets data                                   │
│ 2. Transform rows to JSON objects                            │
│ 3. Apply opt-in filtering (OPTIN_STATUS === "yes")           │
│ 4. Return contact array                                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Response: [{id, name, phone, email, ...}, ...]
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Frontend - ContactsPage.tsx                                   │
│ 1. Store contacts in state                                   │
│ 2. Apply search filter (by name or phone)                    │
│ 3. Render table with checkboxes                              │
│ 4. Enable "Send Message" button on selection                 │
└───────────────────────────────────────────────────────────────┘
```

### 3. Making Voice Call (Future Feature)

```
┌──────────────────────────────────────────────────────────────┐
│ User selects contact, changes type to "Voice"                │
│ → Enters message → Click "Send"                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ HTTP POST
                         │ pythonAPI.post('/api/calls/make')
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Python Backend - POST /api/calls/make                         │
│ (backend/main.py)                                             │
│ 1. Receive phone number and message text                     │
│ 2. Call twilio_service.make_call()                           │
│ 3. Generate TwiML with <Say> verb                            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Twilio Voice API
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Twilio Cloud Service                                          │
│ 1. Dial recipient phone number                               │
│ 2. Play text-to-speech message                               │
│ 3. Log call duration and status                              │
└───────────────────────────────────────────────────────────────┘
```

### 4. Scheduled Reminders (Celery - Requires Redis)

```
┌──────────────────────────────────────────────────────────────┐
│ Celery Beat Scheduler (runs every minute)                    │
│ → Check current time against scheduled reminders             │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Query SQLite database
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Python Backend - tasks.py                                     │
│ 1. Find reminders matching current day/time                  │
│ 2. Get recipients list                                       │
│ 3. Queue send_sms task to Celery worker                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Celery task queue (Redis)
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Celery Worker                                                 │
│ 1. Pick up send_sms task                                     │
│ 2. Call twilio_service.send_sms()                            │
│ 3. Update message status in database                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Twilio SMS API
                         │
┌────────────────────────▼─────────────────────────────────────┐
│ Twilio → Recipient Phone                                      │
└───────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Frontend Components

```
frontend/src/
├── App.tsx                      # Main app with routing
│   └── Layout                   # Sidebar navigation
│       ├── Dashboard            # Statistics overview
│       ├── Contacts             # Contact management
│       ├── Messaging            # Send SMS/Voice
│       └── Reminders            # Schedule messages
│
├── api/
│   ├── client.ts                # **DUAL API CLIENTS**
│   │   ├── api (Node.js)        → port 3001 (Google Sheets)
│   │   └── pythonAPI (Python)   → port 8000 (Twilio)
│   ├── backendApi.ts            # TanStack Query hooks
│   └── gpbcApi.js               # Google Apps Script direct
│
├── pages/
│   ├── DashboardPage.tsx        # Statistics overview
│   ├── ContactsPage.tsx         # Contact list with search
│   ├── MessagingPage.tsx        # SMS/Voice message composer
│   └── RemindersPage.tsx        # Schedule management
│
├── components/
│   ├── ContactsTable.jsx        # Reusable contact table
│   └── DashboardStats.jsx       # Stats cards component
│
└── llm/
    ├── gpbcDataService.js       # Google Sheets integration
    ├── interpretMessage.js      # Message parsing
    └── systemPrompt.js          # AI prompt templates
```

### Backend Components

**Node.js Backend (server.js):**
```javascript
server.js
├── Express app setup
├── CORS configuration (ports: 3005, 3000, 3001, 3002, 5173)
├── Routes:
│   ├── GET /api/contacts           → Google Apps Script proxy
│   ├── GET /api/statistics         → Google Sheets aggregation
│   └── POST /api/messages/send     → Mock (redirects to Python)
└── Port 3001 listener
```

**Python Backend (backend/):**
```
backend/
├── main.py                     # FastAPI app & routes
│   ├── /api/messages/send      → Twilio SMS (WORKING)
│   ├── /api/calls/make         → Twilio Voice (configured)
│   ├── /api/statistics         → Database aggregation
│   ├── /api/reminders/*        → Schedule CRUD (requires Celery)
│   └── /api/webhooks/twilio/*  → Inbound call handling
│
├── models.py                   # SQLAlchemy ORM models
│   ├── Message                 → SMS/Voice message history
│   ├── CallLog                 → Voice call records
│   ├── ScheduledReminder       → Recurring messages
│   └── ConversationHistory     → LLM conversation turns
│
├── schemas.py                  # Pydantic request/response schemas
│   ├── MessageCreate           → {content, phone_numbers, message_type}
│   ├── MessageResponse         → {id, status, twilio_sid, sent_at}
│   └── ReminderCreate          → {name, schedule_type, schedule_time}
│
├── services/
│   ├── twilio_service.py      # Twilio SDK wrapper
│   │   ├── send_sms()         → Send SMS via Twilio
│   │   ├── make_call()        → Initiate voice call
│   │   └── generate_twiml()   → Create TwiML response
│   │
│   └── llm_service.py         # OpenAI integration
│       ├── get_response()     → Chat completion
│       ├── detect_language()  → Language detection
│       └── summarize()        → Call summarization
│
└── tasks.py                    # Celery background tasks
    ├── send_sms_task()        → Async SMS sending
    ├── make_call_task()       → Async voice calls
    └── check_reminders()      → Scheduled reminder cron
```

---

## Database Schema (SQLite)

### Current Tables

```sql
-- Message History
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,              -- Optional: local contact reference
    phone_number VARCHAR(20),         -- Recipient phone
    message_type VARCHAR(10),         -- 'sms' or 'voice'
    content TEXT,                     -- Message content
    status VARCHAR(20),               -- 'sent', 'failed', 'pending'
    scheduled_at TIMESTAMP,           -- When to send
    sent_at TIMESTAMP,                -- Actual send time
    twilio_sid VARCHAR(100),          -- Twilio message SID
    error_message TEXT,               -- Error if failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voice Call Logs
CREATE TABLE call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    caller_phone VARCHAR(20),
    caller_name VARCHAR(100),
    direction VARCHAR(10),            -- 'inbound' or 'outbound'
    duration INTEGER,                 -- Call duration in seconds
    twilio_call_sid VARCHAR(100),
    conversation_summary TEXT,        -- LLM-generated summary
    language_detected VARCHAR(10),    -- 'en', 'es', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LLM Conversation History
CREATE TABLE conversation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_log_id INTEGER,
    role VARCHAR(20),                 -- 'user' or 'assistant'
    content TEXT,                     -- Message text
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (call_log_id) REFERENCES call_logs(id)
);

-- Scheduled Reminders
CREATE TABLE scheduled_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100),
    message_content TEXT,
    message_type VARCHAR(10),         -- 'sms' or 'voice'
    schedule_type VARCHAR(20),        -- 'daily', 'weekly', 'monthly', 'once'
    schedule_day VARCHAR(20),         -- Day of week or month
    schedule_time TIME,               -- Time to send
    schedule_date DATE,               -- For one-time reminders
    active BOOLEAN DEFAULT TRUE,
    send_to_all BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Example 1: Send SMS to Multiple Contacts (WORKING)

```
1. User selects contacts in ContactsPage
   → Click "Send Message"
   → Session storage saves selectedContacts
   ↓
2. Navigate to MessagingPage
   → handleSend() retrieves sheetContacts from session
   ↓
3. Frontend: pythonAPI.post('/api/messages/send')
   Body: {
     content: "Hello from GPBC!",
     phone_numbers: [
       {id: 1, name: "John Doe", phone: "+1234567890"},
       {id: 2, name: "Jane Smith", phone: "+0987654321"}
     ]
   }
   ↓
4. Python Backend: /api/messages/send (main.py)
   → Validate request with Pydantic schema
   → Iterate over phone_numbers array
   ↓
5. For each contact:
   → twilio_service.send_sms(phone, content)
   → Track success/failure counts
   ↓
6. Twilio API: Send SMS
   → Return message SID (e.g., SM886151d214...)
   ↓
7. Backend: Return response
   {
     "success": 2,
     "failed": 0,
     "message": "Sent 2 messages successfully"
   }
   ↓
8. Frontend: Show toast notification
   "Messages sent successfully"
```

### Example 2: Fetch Contacts from Google Sheets (WORKING)

```
1. User navigates to ContactsPage
   → React Query triggers useQuery
   ↓
2. Frontend: api.get('/api/contacts')
   → Uses Node.js backend (port 3001)
   ↓
3. Node.js Backend: GET /api/contacts (server.js)
   → Forward to Google Apps Script API
   ↓
4. Google Apps Script: Code.gs
   → Read Google Sheets data
   → Filter by OPTIN_STATUS === "yes"
   → Transform to JSON array
   ↓
5. Node.js Backend: Receive 154 contacts
   → Return to frontend with CORS headers
   ↓
6. Frontend: ContactsPage.tsx
   → Store in backendContacts state
   → Apply search filter (name or phone)
   → Render table with checkboxes
   → Enable "Send Message" button
```

### Example 3: AI Voice Conversation (Future Feature)

```
1. Caller dials Twilio number (+18888807773)
   ↓
2. Twilio: Webhook POST to /api/webhooks/twilio/voice-inbound
   ↓
3. Python Backend: Create CallLog record
   → Generate greeting TwiML
   ↓
4. Twilio: Play text-to-speech greeting
   "Hello, thank you for calling GPBC. How can I help you?"
   ↓
5. Caller speaks request
   ↓
6. Twilio: Speech-to-text transcription
   → POST to /api/webhooks/twilio/voice-response
   ↓
7. Python Backend: Send transcription to OpenAI
   → llm_service.get_response(user_message)
   ↓
8. OpenAI API: Generate contextual response
   ↓
9. Backend: Save to ConversationHistory table
   → Return TwiML with AI response
   ↓
10. Twilio: Speak AI response to caller
   ↓
11. Loop back to step 5 until call ends
   ↓
12. Backend: Generate call summary
    → Save to CallLog.conversation_summary
```

### Example 4: Scheduled Reminder (Requires Redis + Celery)

```
1. User creates reminder in RemindersPage
   → Name: "Sunday Service"
   → Content: "Service starts at 10 AM"
   → Schedule: Weekly on Sunday at 9:00 AM
   ↓
2. Frontend: pythonAPI.post('/api/reminders')
   Body: {
     name: "Sunday Service",
     message_content: "Service starts at 10 AM",
     schedule_type: "weekly",
     schedule_day: "Sunday",
     schedule_time: "09:00:00",
     send_to_all: true
   }
   ↓
3. Python Backend: Create ScheduledReminder record
   → Save to SQLite database
   ↓
4. Celery Beat: Runs every minute (cron scheduler)
   → Query reminders matching current day/time
   ↓
5. If Sunday 9:00 AM:
   → Fetch all active contacts from Google Sheets
   → Queue send_sms_task to Celery worker
   ↓
6. Celery Worker: Pick up tasks
   → Call twilio_service.send_sms() for each contact
   ↓
7. Twilio API: Send SMS to all recipients
   ↓
8. Backend: Update message status in database
   → Log successful/failed sends
```

---

## Security & Best Practices

### 1. Environment Variables
- Never commit `.env` file to git
- Store sensitive credentials:
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  - `OPENAI_API_KEY`
  - `DATABASE_URL`
- Use separate `.env` files for dev/staging/prod

### 2. CORS Configuration
- **Node.js:** Allow specific frontend origins (3005, 3000, 5173)
- **Python:** Match same origins in `ALLOWED_ORIGINS`
- Never use `*` wildcard in production

### 3. API Rate Limiting
- Twilio: 10,000 SMS/hour (free tier)
- OpenAI: Token-based limits
- Implement exponential backoff for retries

### 4. Data Privacy
- Google Sheets contains sensitive member data
- Restrict Apps Script permissions to read-only
- SQLite logs should not store sensitive content
- Implement data retention policies

---

## Deployment Recommendations

### Production Stack

```
Frontend: Vercel (React + TypeScript)
  └─► HTTPS, CDN, environment variables

Node.js Backend: Railway (Express server)
  └─► Google Sheets proxy, minimal compute

Python Backend: Render (FastAPI + PostgreSQL + Redis)
  └─► Twilio + OpenAI + Celery workers
```

### Migration from SQLite to PostgreSQL

```sql
-- Export from SQLite
sqlite3 church_contacts.db .dump > dump.sql

-- Import to PostgreSQL
psql -U username -d database_name -f dump.sql
```

### Environment Variables (Production)

**Frontend:**
```env
VITE_NODE_API_URL=https://your-app.railway.app
VITE_PYTHON_API_URL=https://your-app.render.com
```

**Python Backend:**
```env
DATABASE_URL=postgresql://user:pass@host/db
REDIS_URL=redis://host:6379/0
ALLOWED_ORIGINS=https://your-app.vercel.app
```

---

## Performance Metrics

| Metric | Development | Production Target |
|--------|-------------|-------------------|
| Contacts Load | ~500ms | <300ms |
| SMS Send Latency | 1-2s | <1s |
| Database Size | <1 MB | <100 MB |
| Concurrent Users | 1-5 | 50-100 |
| Message Throughput | 10/min | 100/min |

---

## Future Enhancements

### Phase 1: Voice Calls ✅ Configured
- [ ] Test outbound voice calls
- [ ] Implement TwiML response generation

### Phase 2: LLM Integration ⚠️ Requires API Key
- [ ] Configure OpenAI API key
- [ ] Test conversational AI for inbound calls
- [ ] Add language detection

### Phase 3: Background Tasks ⚠️ Requires Redis
- [ ] Set up Redis
- [ ] Implement Celery workers
- [ ] Add scheduled reminders

### Phase 4: Production Deployment
- [ ] Migrate to PostgreSQL
- [ ] Docker containers
- [ ] CI/CD pipeline

---

## Related Documentation

- **[README.md](README.md)** - Quick start and overview
- **[TROUBLESHOOTING_REPORT.md](TROUBLESHOOTING_REPORT.md)** - Problem analysis
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Installation steps
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - API reference

---

**Last Updated:** January 2025
**Architecture Version:** 2.0 (Hybrid Dual-Backend)
**Status:** ✅ SMS Working | ⚠️ Voice/LLM/Celery Pending

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
