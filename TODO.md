# 🚀 GPBC Church Contact LLM - Development Roadmap & TODO

**Last Updated:** January 23, 2026  
**Current Version:** 1.0 (Basic SMS/Contact Management)  
**Target Version:** 2.0 (AI-Powered Intelligent Communication Platform)

---

## 📋 **PRIORITY LEVELS**
- 🔴 **CRITICAL** - Security issues, must fix before public launch
- 🟠 **HIGH** - Core features that unlock major value
- 🟡 **MEDIUM** - Important enhancements
- 🟢 **LOW** - Nice-to-have features

---

## 🔒 **PHASE 1: SECURITY & AUTHENTICATION** (2-3 weeks)
*Status: NOT STARTED | Priority: 🔴 CRITICAL*

### 1.1 User Authentication System
**Priority:** 🔴 CRITICAL  
**Effort:** 1 week  
**Status:** ❌ Not Started

- [ ] **Implement JWT-based authentication**
  - Install `fastapi-users` or `python-jose`
  - Create `/api/auth/register` endpoint
  - Create `/api/auth/login` endpoint (email + password)
  - Create `/api/auth/logout` endpoint
  - Generate JWT access tokens (1 hour expiry)
  - Generate JWT refresh tokens (7 day expiry)
  - Store refresh tokens in secure HTTP-only cookies

- [ ] **Password Security**
  - Hash passwords with `bcrypt` (already in requirements.txt)
  - Minimum password requirements: 8 characters, 1 uppercase, 1 number
  - Password reset functionality via email
  - Account lockout after 5 failed attempts

- [ ] **Session Management**
  - Store active sessions in Redis
  - Implement session timeout (30 minutes idle)
  - Multi-device session tracking
  - "Sign out all devices" feature

**Files to Create/Modify:**
- `backend/auth_routes.py` ✅ (exists but needs enhancement)
- `backend/auth_service.py` ✅ (exists but needs enhancement)
- `backend/auth_models.py` ✅ (exists but needs enhancement)
- `backend/middleware/auth.py` (new)
- `frontend/src/context/AuthContext.tsx` ✅ (exists, replace mock auth)

---

### 1.2 Role-Based Access Control (RBAC)
**Priority:** 🔴 CRITICAL  
**Effort:** 3 days  
**Status:** ⚠️ Partially Implemented (frontend only)

- [ ] **Define Permission System**
  - Admin: Full access (all CRUD operations)
  - Pastor: Send messages, view contacts, view analytics
  - Member: View-only access (contacts list, events)

- [ ] **Backend Permission Enforcement**
  ```python
  @app.post("/api/messages/send")
  async def send_message(
      message: MessageCreate,
      current_user: User = Depends(require_role(["admin", "pastor"]))
  ):
      # Only admins and pastors can send messages
  ```

- [ ] **API Endpoint Protection**
  - ✅ `/api/contacts` - All authenticated users (read-only for members)
  - ✅ `/api/messages/send` - Admin + Pastor only
  - ✅ `/api/contacts/create` - Admin only
  - ✅ `/api/contacts/update` - Admin only
  - ✅ `/api/contacts/delete` - Admin only
  - ✅ `/api/users/manage` - Admin only
  - ✅ `/api/analytics` - Admin + Pastor

- [ ] **Frontend Role-Based UI**
  - Hide "Send Message" button for members
  - Hide admin settings for non-admins
  - Show role badge in user profile

**Files to Modify:**
- `backend/main.py` (add permission decorators)
- `backend/dependencies.py` (new - create permission helpers)
- `frontend/src/context/AuthContext.tsx` (enhance with real roles)
- `frontend/src/components/ProtectedRoute.tsx` (add role checking)

---

### 1.3 API Security Hardening
**Priority:** 🔴 CRITICAL  
**Effort:** 2 days  
**Status:** ❌ Not Started

- [ ] **Rate Limiting**
  ```python
  from slowapi import Limiter, _rate_limit_exceeded_handler
  from slowapi.util import get_remote_address
  
  limiter = Limiter(key_func=get_remote_address)
  
  # Apply limits
  @app.post("/api/messages/send")
  @limiter.limit("100/hour")  # Max 100 SMS per hour per user
  async def send_message(...):
  ```

- [ ] **CORS Configuration**
  - ✅ Allow only specific origins (localhost:3005, production domain)
  - ✅ No wildcard (*) in production
  - ✅ Credentials enabled for JWT cookies

- [ ] **Input Validation**
  - ✅ Pydantic schemas for all API inputs (already using)
  - ✅ Sanitize user inputs (SQL injection protection via SQLAlchemy)
  - ✅ Phone number validation (E.164 format)
  - ✅ Message length limits (160 chars for SMS)

- [ ] **Environment Variables Protection**
  - ✅ Never commit `.env` file
  - ✅ Use secrets manager in production (AWS Secrets Manager / GCP Secret Manager)
  - ✅ Rotate API keys quarterly

- [ ] **Audit Logging**
  ```python
  class AuditLog(Base):
      id = Column(Integer, primary_key=True)
      user_id = Column(Integer, ForeignKey("users.id"))
      action = Column(String)  # MESSAGE_SENT, CONTACT_CREATED, etc.
      details = Column(JSON)
      ip_address = Column(String)
      timestamp = Column(DateTime, default=datetime.utcnow)
  ```

**Files to Create/Modify:**
- `backend/middleware/rate_limit.py` (new)
- `backend/models.py` (add AuditLog model)
- `backend/config.py` (enhance CORS settings)
- `backend/main.py` (apply middleware)

---

### 1.4 Google Apps Script API Authentication
**Priority:** 🟠 HIGH  
**Effort:** 1 day  
**Status:** ❌ Not Implemented (currently public API)

- [ ] **Add API Key Authentication**
  - Generate unique API key for frontend
  - Store in Google Apps Script properties
  - Validate key in `doGet()` and `doPost()`
  
- [ ] **Implement in Code.gs**
  ```javascript
  function doGet(e) {
    const apiKey = e.parameter.key;
    const storedKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
    
    if (!apiKey || apiKey !== storedKey) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    // ... rest of logic
  }
  ```

- [ ] **Update Frontend to Include API Key**
  ```typescript
  const response = await fetch(
    `${GOOGLE_SCRIPT_URL}?action=getContacts&key=${import.meta.env.VITE_GOOGLE_API_KEY}`
  );
  ```

**Files to Modify:**
- `Code.gs` (add authentication)
- `frontend/.env` (add `VITE_GOOGLE_API_KEY`)
- `frontend/src/api/gpbcApi.js` (include key in requests)

---

## 🧠 **PHASE 2: AI INTELLIGENCE INTEGRATION** (3-4 weeks)
*Status: PARTIALLY IMPLEMENTED | Priority: 🟠 HIGH*

### 2.1 Connect LLM to Message Flow
**Priority:** 🟠 HIGH  
**Effort:** 2 days  
**Status:** ⚠️ LLM service exists but needs full integration

**Current State (As of Jan 24, 2026):** 
- ✅ `backend/services/llm_service.py` EXISTS and is functional
  - Has `get_response()` method for chat completions
  - Has `detect_language()` for multilingual support
  - Has `summarize_conversation()` for call summaries
  - Uses OpenAI GPT-4 Turbo / GPT-3.5-turbo
  - System prompt configured for church pastoral assistant role
  
- ✅ `frontend/src/llm/` directory has LLM integration components:
  - `interpretMessage.js` - Basic rule-based intent detection (EN/BN)
  - `systemPrompt.js` - Church-specific AI personality definition
  - `gpbcDataService.js` - Google Sheets data integration for AI context
  
- ⚠️ **Partially Connected:**
  - Backend LLM service is configured but needs to be wired to API endpoints
  - Frontend has LLM infrastructure but uses simplified rule-based logic
  - No conversation history tracking in database yet
  
- ❌ **Missing Connections:**
  - LLM not used in `/api/messages/send` endpoint
  - Two-way SMS conversations don't use LLM (using Code.gs basic rules)
  - No conversation memory/context retrieval
  - No semantic search or embeddings

**What Needs to Be Done:**

1. **Wire LLM to Outbound Messages** (4 hours)
   ```python
   # backend/main.py - Enhance send_message endpoint
   @app.post("/api/messages/send")
   async def send_message(message: MessageCreate, current_user: User = Depends(get_current_user)):
       for contact in message.recipients:
           # Option 1: Personalize each message with AI
           personalized_msg = await llm_service.generate_personalized_message(
               template=message.content,
               contact_context={
                   "name": contact.name,
                   "language": contact.language,
                   "preferred_greeting": get_cultural_greeting(contact.language)
               }
           )
           
           # Option 2: Translate to recipient's language
           if contact.language != 'EN':
               personalized_msg = await llm_service.translate(
                   message.content,
                   to_language=contact.language,
                   maintain_tone='warm_and_pastoral'
               )
           
           await twilio_service.send_sms(contact.phone, personalized_msg)
   ```

2. **Replace Frontend Rule-Based Logic with LLM API** (3 hours)
   ```typescript
   // frontend/src/api/client.ts - Add LLM endpoint
   export const llmAPI = {
       interpretMessage: (message: string, context?: ConversationContext) =>
           pythonAPI.post('/api/llm/interpret', { message, context }),
       
       generateReply: (message: string, contactId: number) =>
           pythonAPI.post('/api/llm/reply', { message, contactId })
   };
   
   // Replace frontend/src/llm/interpretMessage.js logic:
   // OLD: Rule-based if/else
   // NEW: Call backend LLM API
   ```

3. **Add Conversation Tracking** (4 hours)
   ```python
   # Backend: Create conversation history endpoint
   @app.get("/api/conversations/{contact_id}")
   async def get_conversation_history(contact_id: int, limit: int = 10):
       return await Conversation.query.filter_by(contact_id=contact_id).limit(limit).all()
   
   # Store each message exchange
   await Conversation.create(
       contact_id=contact.id,
       message=incoming_message,
       direction='inbound',
       intent=detected_intent,
       timestamp=datetime.utcnow()
   )
   ```

4. **Enable LLM in Two-Way SMS** (covered in Section 2.2)

**Quick Test After Implementation:**
```bash
# Test LLM response generation
curl -X POST http://localhost:8000/api/llm/reply \
  -H "Content-Type: application/json" \
  -d '{"message": "Please pray for my family", "contactId": 1}'

# Should return: Compassionate AI-generated response in appropriate language
```

**Tasks:**
- [ ] **Create `/api/llm/interpret` endpoint** - Accept message, return intent/reply
- [ ] **Create `/api/llm/reply` endpoint** - Generate contextual responses
- [ ] **Update `send_message()` to use LLM** - Personalize each message
- [ ] **Replace `frontend/src/llm/interpretMessage.js`** - Call backend instead of rules
- [ ] **Add conversation history retrieval** - Pass context to LLM
- [ ] **Implement response caching** - Use Redis to cache common responses
- [ ] **Add LLM usage tracking** - Monitor token usage and costs
- [ ] **Test with real conversations** - Verify responses are appropriate

**Files to Create/Modify:**
- `backend/routes/llm_routes.py` (NEW - dedicated LLM endpoints)
- `backend/main.py` (enhance send_message with LLM)
- `frontend/src/llm/interpretMessage.js` (replace logic with API calls)
- `frontend/src/api/client.ts` (add llmAPI methods)
- `backend/services/llm_service.py` (add caching and tracking)

**Acceptance Criteria:**
✅ Sending a message personalizes it for each recipient
✅ Frontend message interpretation uses OpenAI (not rules)
✅ LLM responses are culturally appropriate (EN/BN)
✅ Token usage is logged and monitored
✅ Common responses are cached to reduce costs

---

### 2.2 Two-Way SMS Conversations
**Priority:** 🟠 HIGH  
**Effort:** 1 week  
**Status:** ⚠️ Webhook handler exists in Code.gs, NOT in Python backend

**Current State:**
- ✅ `Code.gs` has `doPost()` webhook for incoming SMS
- ✅ Basic intent detection (PRAYER_REQUEST, YES, NO, OPT_OUT)
- ❌ NOT connected to Python backend
- ❌ No conversation memory
- ❌ No AI-powered responses

**Implementation:**
- [ ] **Create Twilio Webhook Endpoint in Python Backend**
  ```python
  @app.post("/webhooks/twilio/sms")
  async def handle_incoming_sms(request: Request):
      form_data = await request.form()
      from_number = form_data.get("From")
      message_body = form_data.get("Body")
      
      # Look up contact
      contact = await get_contact_by_phone(from_number)
      
      # Get conversation history
      history = await get_conversation_history(contact.id, limit=10)
      
      # Detect intent with LLM
      intent = await llm_service.detect_intent(message_body, history)
      
      if intent == "PRAYER_REQUEST":
          await handle_prayer_request(contact, message_body)
          reply = "Thank you for sharing. Our pastors are praying for you. 🙏"
      elif intent == "QUESTION":
          reply = await llm_service.get_response(message_body, history)
      else:
          reply = "Thank you for your message. Reply HELP for assistance."
      
      # Log conversation
      await log_conversation(contact.id, "inbound", message_body)
      await log_conversation(contact.id, "outbound", reply)
      
      # Return TwiML
      return create_twiml_response(reply)
  ```

- [ ] **Configure Twilio Webhook URL**
  - Update Twilio console: `https://your-domain.com/webhooks/twilio/sms`
  - Test with ngrok during development: `ngrok http 8000`

- [ ] **Migrate Logic from Code.gs to Python**
  - Move prayer request detection to Python
  - Move opt-in/opt-out handling to Python
  - Keep Code.gs as fallback

**Tasks:**
- [ ] Create `backend/routes/webhooks.py`
- [ ] Implement `handle_incoming_sms()` with LLM integration
- [ ] Add conversation logging to database
- [ ] Set up ngrok tunnel for testing
- [ ] Update Twilio dashboard with webhook URL

**Files to Create/Modify:**
- `backend/routes/webhooks.py` (new)
- `backend/services/twilio_service.py` (add TwiML helper)
- `backend/models.py` (add Conversation model)

---

### 2.3 Conversation Memory & Context
**Priority:** 🟡 MEDIUM  
**Effort:** 1 week  
**Status:** ❌ Not Started

**Goal:** Make AI remember past conversations and provide contextual responses.

**Implementation:**
- [ ] **Add Conversation Model**
  ```python
  class Conversation(Base):
      id = Column(Integer, primary_key=True)
      contact_id = Column(Integer, ForeignKey("contacts.id"))
      message = Column(Text)
      direction = Column(String)  # 'inbound' or 'outbound'
      intent = Column(String)  # 'prayer_request', 'question', 'greeting'
      timestamp = Column(DateTime, default=datetime.utcnow)
      
      # For semantic search
      embedding = Column(Vector(1536))  # OpenAI embedding dimension
  ```

- [ ] **Vector Database for Semantic Search**
  - Option 1: Use PostgreSQL with pgvector extension
  - Option 2: Use Pinecone (free tier: 100K vectors)
  - Store conversation embeddings for similarity search

- [ ] **Context-Aware Responses**
  ```python
  async def get_relevant_context(contact_id: int, current_message: str):
      # Generate embedding for current message
      embedding = await llm_service.create_embedding(current_message)
      
      # Search similar past conversations
      similar_convos = await search_similar_conversations(contact_id, embedding, limit=5)
      
      return {
          "recent_conversations": similar_convos,
          "prayer_requests": await get_prayer_requests(contact_id),
          "last_attendance": await get_last_attendance(contact_id)
      }
  ```

**Tasks:**
- [ ] Set up pgvector extension in PostgreSQL
- [ ] Generate embeddings for all messages using OpenAI
- [ ] Implement semantic search function
- [ ] Enhance LLM prompts with conversation context
- [ ] Add "memory" section in dashboard showing conversation topics

**Files to Create/Modify:**
- `backend/models.py` (add Conversation model with Vector column)
- `backend/services/vector_service.py` (new - embedding & search)
- `backend/services/llm_service.py` (add context to prompts)

---

### 2.4 Sentiment Analysis for Pastoral Care
**Priority:** 🟡 MEDIUM  
**Effort:** 3 days  
**Status:** ❌ Not Started

**Goal:** Automatically detect members in distress and alert pastoral team.

**Implementation:**
- [ ] **Sentiment Analysis Function**
  ```python
  async def analyze_sentiment(message: str, contact: Contact):
      sentiment = await llm_service.analyze_sentiment(message)
      # Returns: { emotion: 'joy|sadness|distress|neutral', confidence: 0.95, keywords: [...] }
      
      if sentiment.emotion == "distress" and sentiment.confidence > 0.8:
          # Alert pastoral team immediately
          await notify_pastors(
              title=f"🆘 {contact.name} may need support",
              message=message,
              sentiment=sentiment,
              priority="high"
          )
      
      # Log emotional journey
      await ContactEmotionalHistory.create(
          contact_id=contact.id,
          emotion=sentiment.emotion,
          confidence=sentiment.confidence,
          message=message
      )
  ```

- [ ] **Pastoral Care Dashboard**
  - Show members with concerning sentiment trends
  - Display emotional journey timeline
  - Suggest outreach priorities

**Tasks:**
- [ ] Add sentiment analysis to LLM service
- [ ] Create emotional history tracking
- [ ] Build pastoral alert system (email/SMS to pastors)
- [ ] Add sentiment dashboard in frontend

**Files to Create/Modify:**
- `backend/services/llm_service.py` (add sentiment analysis)
- `backend/models.py` (add EmotionalHistory model)
- `frontend/src/pages/PastoralCarePage.tsx` (new)

---

## 🤖 **PHASE 3: AUTOMATION & INTELLIGENCE** (2-3 weeks)
*Status: NOT STARTED | Priority: 🟡 MEDIUM*

### 3.1 Smart Prayer Request Management
**Priority:** 🟡 MEDIUM  
**Effort:** 1 week  
**Status:** ⚠️ Basic detection exists in Code.gs

**Enhancements:**
- [ ] **AI-Powered Categorization**
  ```python
  async def categorize_prayer_request(message: str):
      analysis = await llm_service.analyze({
          "message": message,
          "extract": {
              "category": ["health", "family", "financial", "spiritual", "work", "other"],
              "urgency": ["urgent", "normal", "praise"],
              "people_mentioned": [],
              "specific_needs": []
          }
      })
      
      return PrayerRequest(
          content=message,
          category=analysis.category,
          urgency=analysis.urgency,
          people=analysis.people_mentioned,
          auto_follow_up_date=calculate_follow_up_date(analysis.urgency)
      )
  ```

- [ ] **Automatic Follow-Ups**
  - After 1 week: "How is your mother's health?"
  - After 2 weeks: "Still praying for your job situation"
  - Mark as answered when positive update received

- [ ] **Prayer List Generation**
  - Weekly prayer list for small groups
  - Categorized by urgency and type
  - Export to PDF/Email

**Tasks:**
- [ ] Enhance `detectIntent()` in Code.gs with LLM
- [ ] Create PrayerRequest model with auto follow-up
- [ ] Build prayer management dashboard
- [ ] Add email/SMS for weekly prayer lists

**Files to Create/Modify:**
- `backend/models.py` (add PrayerRequest model)
- `backend/services/prayer_service.py` (new)
- `frontend/src/pages/PrayerRequestsPage.tsx` (new)

---

### 3.2 Engagement Prediction & At-Risk Detection
**Priority:** 🟡 MEDIUM  
**Effort:** 2 weeks  
**Status:** ❌ Not Started (requires ML model)

**Goal:** Predict who will attend events and identify members at risk of disengagement.

**Implementation:**
- [ ] **Feature Engineering**
  ```python
  def calculate_engagement_features(contact_id: int):
      return {
          "attendance_rate": calculate_attendance_rate(contact_id, months=6),
          "message_response_rate": get_response_rate(contact_id),
          "days_since_last_attendance": days_since_last(contact_id),
          "prayer_request_count": count_prayer_requests(contact_id),
          "average_response_time": get_avg_response_time(contact_id),
          "group": contact.group,
          "language": contact.language
      }
  ```

- [ ] **Train ML Model**
  - Use scikit-learn or XGBoost
  - Features: attendance history, message engagement, prayer requests
  - Target: Will attend next event (Yes/No)
  - Train on historical data

- [ ] **At-Risk Detection**
  ```python
  async def identify_at_risk_members():
      at_risk = await Contact.query.filter(
          days_since_last_attendance > 30,
          engagement_score < 0.3
      ).all()
      
      for member in at_risk:
          recommendation = {
              "contact": member,
              "risk_level": calculate_risk_level(member),
              "reason": "No attendance in 30+ days",
              "suggested_action": "Personal phone call from pastor",
              "message_template": await llm_service.generate_outreach(member)
          }
          await save_recommendation(recommendation)
  ```

**Tasks:**
- [ ] Collect historical attendance data
- [ ] Build engagement scoring system
- [ ] Train prediction model
- [ ] Create at-risk member dashboard
- [ ] Add automated outreach suggestions

**Files to Create/Modify:**
- `backend/ml/engagement_predictor.py` (new - ML model)
- `backend/models.py` (add EngagementScore model)
- `frontend/src/pages/EngagementPage.tsx` (new)

---

### 3.3 Smart Scheduling & Optimal Send Times
**Priority:** 🟢 LOW  
**Effort:** 1 week  
**Status:** ❌ Not Started

**Goal:** Send messages when each person is most likely to read them.

**Implementation:**
- [ ] **Analyze Open Patterns**
  ```python
  def analyze_engagement_times(contact_id: int):
      engagements = MessageEngagement.query.filter_by(contact_id=contact_id).all()
      
      # Group by hour of day
      hourly_engagement = {}
      for eng in engagements:
          hour = eng.opened_at.hour
          hourly_engagement[hour] = hourly_engagement.get(hour, 0) + 1
      
      # Find peak hours
      peak_hours = sorted(hourly_engagement.items(), key=lambda x: x[1], reverse=True)[:3]
      return [h[0] for h in peak_hours]
  ```

- [ ] **Schedule Messages at Optimal Times**
  ```python
  async def schedule_smart_reminder(event: Event):
      for contact in event.invitees:
          optimal_time = get_optimal_send_time(contact.id)
          message = await llm_service.generate_reminder(event, contact)
          await schedule_message(contact, message, send_at=optimal_time)
  ```

**Tasks:**
- [ ] Track message open times (requires Twilio status callbacks)
- [ ] Build time preference profiler
- [ ] Integrate with Celery scheduler
- [ ] Add "smart schedule" option in messaging UI

**Files to Create/Modify:**
- `backend/services/scheduling_service.py` (new)
- `backend/tasks.py` (add smart scheduling)

---

### 3.4 Birthday & Life Event Automation
**Priority:** 🟢 LOW  
**Effort:** 3 days  
**Status:** ❌ Not Started

**Implementation:**
- [ ] **Add Birthday Field to Contacts**
  ```python
  class Contact(Base):
      # ... existing fields
      birthday = Column(Date, nullable=True)
      anniversary = Column(Date, nullable=True)
  ```

- [ ] **Daily Cron Job**
  ```python
  @celery.task
  def send_birthday_messages():
      today = date.today()
      birthdays = Contact.query.filter(
          extract('month', Contact.birthday) == today.month,
          extract('day', Contact.birthday) == today.day
      ).all()
      
      for contact in birthdays:
          message = await llm_service.generate_birthday_message(contact)
          await twilio_service.send_sms(contact.phone, message)
  ```

**Tasks:**
- [ ] Add birthday/anniversary fields
- [ ] Create daily celebration job
- [ ] Generate personalized messages with LLM
- [ ] Add birthday import from CSV

**Files to Modify:**
- `backend/models.py` (add date fields)
- `backend/tasks.py` (add celebration job)

---

## 📊 **PHASE 4: ANALYTICS & INSIGHTS** (1-2 weeks)
*Status: BASIC | Priority: 🟡 MEDIUM*

### 4.1 Comprehensive Dashboard
**Priority:** 🟡 MEDIUM  
**Effort:** 1 week  
**Status:** ⚠️ Basic stats exist, needs enhancement

**Current Dashboard:** Simple counts (total contacts, messages, calls)

**Enhanced Dashboard:**
- [ ] **Engagement Trends**
  - Line chart: Message open rates over time
  - Heatmap: Best times to send messages
  - Funnel: Message sent → delivered → opened → replied

- [ ] **At-Risk Members Section**
  - List of members with declining engagement
  - "Generate Outreach" button for each member
  - Risk score indicator (red/yellow/green)

- [ ] **Prayer Request Analytics**
  - Category breakdown (health, family, financial)
  - Urgency distribution
  - Average response time to follow-ups

- [ ] **AI Insights Card**
  - "23% increase in SMS engagement this month"
  - "Tuesday 7PM shows highest open rates"
  - "5 members need pastoral check-in"
  - "Youth event next Friday has 85% predicted attendance"

**Tasks:**
- [ ] Create `/api/analytics/comprehensive` endpoint
- [ ] Add Chart.js or Recharts to frontend
- [ ] Build interactive dashboard components
- [ ] Add date range filters

**Files to Create/Modify:**
- `backend/routes/analytics.py` (new - comprehensive analytics)
- `frontend/src/pages/DashboardPage.tsx` (enhance with charts)
- `frontend/package.json` (add charting library)

---

### 4.2 Export & Reporting
**Priority:** 🟢 LOW  
**Effort:** 2 days  
**Status:** ❌ Not Started

**Features:**
- [ ] Export contacts to CSV
- [ ] Export message history to PDF
- [ ] Monthly engagement report (email to admin)
- [ ] Prayer request summary (PDF for pastors)

**Files to Create:**
- `backend/services/export_service.py`

---

## 🌍 **PHASE 5: MULTI-CHANNEL EXPANSION** (2-3 weeks)
*Status: NOT STARTED | Priority: 🟡 MEDIUM*

### 5.1 WhatsApp Integration
**Priority:** 🟡 MEDIUM  
**Effort:** 1 week  
**Status:** ❌ Not Started

**Why:** Many Bangladeshi members prefer WhatsApp over SMS.

**Implementation:**
- [ ] **Set Up Twilio WhatsApp Sandbox** (Free for testing)
  ```python
  def send_whatsapp(to: str, message: str):
      client.messages.create(
          from_='whatsapp:+14155238886',  # Twilio sandbox
          to=f'whatsapp:{to}',
          body=message
      )
  ```

- [ ] **Add Channel Preference to Contacts**
  ```python
  class Contact(Base):
      preferred_channel = Column(String, default='sms')  # 'sms' or 'whatsapp'
  ```

- [ ] **Unified Messaging Interface**
  - Send button automatically uses preferred channel
  - Show WhatsApp icon for WhatsApp contacts

**Tasks:**
- [ ] Set up Twilio WhatsApp Business Account
- [ ] Add channel preference field
- [ ] Update frontend messaging UI
- [ ] Handle WhatsApp-specific features (media, location)

**Files to Modify:**
- `backend/services/twilio_service.py` (add WhatsApp methods)
- `backend/models.py` (add preferred_channel)
- `frontend/src/pages/MessagingPage.tsx` (add channel selector)

**Cost:** WhatsApp Business API costs ~$0.005/message (cheaper than SMS!)

---

### 5.2 Email Integration
**Priority:** 🟢 LOW  
**Effort:** 3 days  
**Status:** ❌ Not Started

**Use Cases:**
- Newsletter to all members
- Event invitations with RSVP links
- Prayer request summaries

**Implementation:**
- [ ] Use SendGrid or Mailgun
- [ ] Add email field to contacts
- [ ] Create email templates with Jinja2
- [ ] Track open rates and clicks

---

## 🗄️ **PHASE 6: DATA & INFRASTRUCTURE** (1 week)
*Status: USING SQLITE | Priority: 🟡 MEDIUM*

### 6.1 PostgreSQL Migration
**Priority:** 🟡 MEDIUM  
**Effort:** 1 day  
**Status:** ❌ Using SQLite (not production-ready)

**Why PostgreSQL:**
- Better concurrency (SQLite locks on writes)
- Pgvector extension for semantic search
- Better for production deployments

**Migration Steps:**
- [ ] Set up PostgreSQL database (local or cloud)
- [ ] Update `DATABASE_URL` in `.env`
- [ ] Run Alembic migrations
- [ ] Test all endpoints
- [ ] Export SQLite data and import to PostgreSQL

**Files to Modify:**
- `backend/database.py` (change DATABASE_URL)
- `.env` (add PostgreSQL connection string)

---

### 6.2 Redis for Caching
**Priority:** 🟢 LOW  
**Effort:** 1 day  
**Status:** ⚠️ Configured but not used

**Use Cases:**
- Cache LLM responses (reduce API costs)
- Cache contact lists (faster dashboard loads)
- Store rate limit counters
- Session storage

**Implementation:**
```python
import redis
r = redis.Redis(host='localhost', port=6379)

async def get_llm_response_cached(prompt: str):
    cache_key = f"llm:{hashlib.md5(prompt.encode()).hexdigest()}"
    cached = r.get(cache_key)
    
    if cached:
        return cached.decode()
    
    response = await llm_service.get_response(prompt)
    r.setex(cache_key, 3600, response)  # Cache for 1 hour
    return response
```

---

## 🧪 **PHASE 7: TESTING & QUALITY** (1 week)
*Status: MINIMAL | Priority: 🟡 MEDIUM*

### 7.1 Backend Tests
**Priority:** 🟡 MEDIUM  
**Effort:** 3 days  
**Status:** ❌ No tests exist

**Coverage Targets:**
- [ ] Authentication tests (login, logout, token refresh)
- [ ] Permission tests (RBAC)
- [ ] Message sending tests (mock Twilio)
- [ ] LLM integration tests (mock OpenAI)
- [ ] Database tests (CRUD operations)

**Tools:**
- pytest
- pytest-asyncio
- httpx (async client for FastAPI)

**Example:**
```python
def test_send_message_requires_auth():
    response = client.post("/api/messages/send", json={...})
    assert response.status_code == 401

def test_member_cannot_send_messages():
    token = get_member_token()
    response = client.post(
        "/api/messages/send",
        headers={"Authorization": f"Bearer {token}"},
        json={...}
    )
    assert response.status_code == 403
```

---

### 7.2 Frontend Tests
**Priority:** 🟢 LOW  
**Effort:** 2 days  
**Status:** ❌ No tests exist

**Tools:**
- Vitest (Vite's test framework)
- React Testing Library

---

## 📱 **PHASE 8: MOBILE & PWA** (Optional)
*Status: NOT STARTED | Priority: 🟢 LOW*

### 8.1 Progressive Web App
**Priority:** 🟢 LOW  
**Effort:** 1 week  

**Features:**
- [ ] Add service worker for offline support
- [ ] Add to home screen capability
- [ ] Push notifications for new messages
- [ ] Mobile-optimized UI (already responsive!)

---

## 📈 **QUICK WINS - Implement This Week**

### Week 1: Security Basics (Critical)
- [ ] Add JWT authentication to backend
- [ ] Implement role-based access control
- [ ] Add rate limiting to API
- [ ] Secure Google Apps Script with API key
- **Estimated Time:** 20 hours

### Week 2: AI Integration (High Value)
- [ ] Connect LLM service to message flow
- [ ] Create Twilio webhook for incoming SMS
- [ ] Add conversation logging
- [ ] Test two-way conversations
- **Estimated Time:** 15 hours

### Week 3: Prayer Requests (High Impact)
- [ ] Enhance prayer request detection with AI
- [ ] Add automatic pastoral alerts
- [ ] Build prayer request dashboard
- **Estimated Time:** 10 hours

---

## 💰 **COST ESTIMATE (Monthly)**

### Current Costs
- Twilio SMS: $0.0075/message × 500 = **$3.75/month**
- Twilio Voice: $0.013/minute × 100 = **$1.30/month**
- OpenAI (minimal): **$0.20/month**
- **Total: ~$5/month**

### With All Features Implemented
- Twilio SMS: **$7.50/month** (1,000 messages)
- Twilio WhatsApp: **$2.50/month** (500 messages)
- OpenAI GPT-4: **$20/month** (100K tokens)
- PostgreSQL (Cloud): **$0** (free tier on Supabase)
- Redis (Cloud): **$0** (free tier on Upstash)
- Vector DB (Pinecone): **$0** (free tier, 100K vectors)
- **Total: ~$30-40/month**

---

## 🎯 **SUCCESS METRICS**

### Current State: 6/10
- ✅ Basic SMS works
- ✅ Contact management works
- ✅ UI is good
- ❌ No authentication
- ❌ No AI intelligence
- ❌ One-way communication only

### Target State: 10/10
- ✅ Enterprise-grade security
- ✅ True AI conversations
- ✅ Two-way communication
- ✅ Predictive engagement
- ✅ Multi-channel (SMS/WhatsApp/Email)
- ✅ Automated pastoral care
- ✅ Production-ready

---

## 📚 **LEARNING RESOURCES**

To implement these features, study:

1. **Authentication & Security**
   - FastAPI Security Tutorial: https://fastapi.tiangolo.com/tutorial/security/
   - JWT Authentication: https://jwt.io/introduction
   - OWASP Top 10: https://owasp.org/www-project-top-ten/

2. **LangChain & AI**
   - LangChain Docs: https://python.langchain.com/docs/get_started/introduction
   - OpenAI Cookbook: https://github.com/openai/openai-cookbook
   - Semantic Search with Embeddings: https://www.pinecone.io/learn/semantic-search/

3. **FastAPI Advanced**
   - Background Tasks: https://fastapi.tiangolo.com/tutorial/background-tasks/
   - WebSockets: https://fastapi.tiangolo.com/advanced/websockets/
   - Async SQLAlchemy: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html

4. **Testing**
   - Pytest: https://docs.pytest.org/
   - FastAPI Testing: https://fastapi.tiangolo.com/tutorial/testing/

---

## 🚀 **DEPLOYMENT CHECKLIST**

Before launching to production:

- [ ] ✅ All authentication implemented
- [ ] ✅ All API endpoints protected
- [ ] ✅ Rate limiting active
- [ ] ✅ HTTPS enabled (SSL certificate)
- [ ] ✅ Environment variables secured
- [ ] ✅ Database backups automated
- [ ] ✅ Error monitoring (Sentry)
- [ ] ✅ Audit logging active
- [ ] ✅ GDPR compliance (data export/delete)
- [ ] ✅ Terms of Service & Privacy Policy
- [ ] ✅ User testing completed
- [ ] ✅ Load testing completed
- [ ] ✅ Documentation updated

---

## 📞 **SUPPORT & QUESTIONS**

**Repository:** gilbert-baidya/GPBC-Contact-LLM  
**Branch:** main  
**Last Audit:** January 23, 2026

**Questions?** Open an issue or contact the development team.

---

**Remember:** Security first! Don't skip Phase 1. 🔒

The future is intelligent communication. Let's build it! 🚀
