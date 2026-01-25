# 🧠 LLM Intelligence Integration Guide

## ✅ What Was Implemented

This update transforms your app from basic rule-based messaging to **truly intelligent AI-powered communication**. Here's what's now available:

### 🎯 Core Features

#### 1. **LLM API Endpoints** (`backend/routes/llm_routes.py`)
- ✅ `/api/llm/interpret` - Analyze messages for intent, language, and pastoral care needs
- ✅ `/api/llm/reply` - Generate context-aware, personalized replies
- ✅ `/api/llm/translate` - Multi-language translation with tone preservation
- ✅ `/api/llm/personalize` - Personalize message templates for each contact
- ✅ `/api/llm/conversation/{id}` - AI-generated conversation summaries

#### 2. **Two-Way SMS with AI** (`backend/routes/webhook_routes.py`)
- ✅ `/webhooks/twilio/sms` - Receives incoming SMS and responds with AI
- ✅ Automatic prayer request detection
- ✅ Pastor alerts for urgent needs
- ✅ Conversation history tracking
- ✅ Multi-language support

#### 3. **Frontend AI Features** (`frontend/src/pages/MessagingPage.tsx`)
- ✅ "AI Improve" button - Get intelligent message suggestions
- ✅ AI Personalization toggle - Personalize each message automatically
- ✅ Reply suggestions based on context
- ✅ Beautiful UI with purple/blue gradient for AI features

#### 4. **Conversation Tracking** (`backend/models.py`)
- ✅ New `Conversation` model for SMS history
- ✅ Tracks intent, language, and pastoral care flags
- ✅ Enables context-aware responses

---

## 🚀 Setup Instructions

### Step 1: Update Dependencies

The LLM service now uses `AsyncOpenAI` for better performance:

```bash
cd backend
pip install openai --upgrade
```

### Step 2: Create Conversations Table

Run the migration script:

```bash
cd backend
python migrate_conversations.py
```

You should see:
```
INFO:__main__:Creating conversations table...
INFO:__main__:✅ Conversations table created successfully!
```

### Step 3: Set Up OpenAI API Key

Make sure your `.env` file has:

```env
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4-turbo-preview
```

**Get your key at:** https://platform.openai.com/api-keys

### Step 4: Restart Backend

```bash
cd backend
# Kill existing process
# Then restart:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see these new log messages:
```
INFO:__main__:✅ LLM intelligence routes enabled
INFO:__main__:✅ Twilio webhook routes enabled
```

### Step 5: Test the API

#### Test 1: Interpret a Message

```bash
curl -X POST http://localhost:8000/api/llm/interpret \
  -H "Content-Type: application/json" \
  -d '{"message": "Please pray for my sick mother"}'
```

Expected response:
```json
{
  "intent": "prayer_request",
  "reply": "We're keeping your mother in our prayers...",
  "language": "en",
  "confidence": 0.95,
  "needs_pastoral_care": true
}
```

#### Test 2: Generate a Personalized Reply

```bash
curl -X POST http://localhost:8000/api/llm/reply \
  -H "Content-Type: application/json" \
  -d '{
    "message": "When is the next service?",
    "contact_id": 1,
    "include_context": true
  }'
```

#### Test 3: Translate a Message

```bash
curl -X POST http://localhost:8000/api/llm/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "God bless you!",
    "to_language": "bengali",
    "maintain_tone": "warm_and_pastoral"
  }'
```

### Step 6: Set Up Twilio Webhook (For Two-Way SMS)

1. **Install ngrok** (for local testing):
   ```bash
   brew install ngrok
   ngrok http 8000
   ```

2. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

3. **Configure Twilio**:
   - Go to: https://console.twilio.com/
   - Navigate to: Phone Numbers → Your Number → Messaging Configuration
   - Set "A MESSAGE COMES IN" webhook to:
     ```
     https://abc123.ngrok.io/webhooks/twilio/sms
     ```
   - Method: `POST`
   - Save

4. **Test Two-Way SMS**:
   - Send an SMS to your Twilio number: "Please pray for me"
   - You should receive an AI-generated compassionate response
   - Pastor should receive an alert (if prayer request detected)

---

## 💡 Using the New Features

### In the Frontend (Messaging Page)

1. **AI Improve Button**:
   - Type your message
   - Click "AI Improve" (purple button with sparkle icon)
   - Get 3 AI-generated suggestions
   - Click any suggestion to use it

2. **AI Personalization Toggle**:
   - Before sending, enable "AI Personalization" checkbox
   - Each recipient gets a personalized version with their name and language
   - Example:
     - Template: "Join us for service this Sunday!"
     - To Maria (Spanish): "¡María! Te invitamos al servicio este domingo."
     - To John (English): "John, we'd love to see you at service this Sunday!"

3. **Conversation Summaries**:
   - Go to Contacts page
   - Click on a contact
   - View AI-generated summary of all conversations

---

## 🎨 What Changed in the UI

### MessagingPage.tsx Enhancements

**New imports:**
```tsx
import { Sparkles, Wand2 } from 'lucide-react'; // AI icons
import { getReplySuggestions } from '../api/llmApi'; // AI API
```

**New state:**
```tsx
const [useAIPersonalization, setUseAIPersonalization] = useState(false);
const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
const [loadingSuggestions, setLoadingSuggestions] = useState(false);
```

**New "AI Improve" button** - Above the message textarea:
- Purple gradient design
- Shows loading spinner while generating
- Displays 3 clickable suggestions

**New "AI Personalization" toggle** - Before send button:
- Purple/indigo gradient card
- Explains the feature clearly
- "BETA" badge
- Note about OpenAI API requirement

---

## 📊 Cost Estimate

With these features enabled:

**Current Usage:**
- Basic messaging: ~1000 messages/month
- Cost: $5/month (Twilio only)

**With LLM Enabled:**
- Interpretation: ~$0.002/message
- Personalization: ~$0.003/message
- Two-way responses: ~$0.005/message
- Monthly LLM cost: ~$10-15 for 1000 messages

**Total: $15-20/month** (still very affordable!)

---

## 🔒 Security Notes

1. **Never commit `.env` files** - Keep your OpenAI key secure
2. **Webhook authentication** - In production, validate Twilio webhook signatures
3. **Rate limiting** - Consider adding rate limits to prevent abuse
4. **Cost monitoring** - Set up OpenAI usage alerts at $20/month

---

## 🐛 Troubleshooting

### "Module 'openai' has no attribute 'AsyncOpenAI'"

**Solution:** Upgrade openai package
```bash
pip install openai --upgrade
```

### "LLM intelligence routes enabled" not showing in logs

**Check:**
1. File exists: `backend/routes/llm_routes.py`
2. No syntax errors (run `python backend/routes/llm_routes.py`)
3. Restart backend server

### "Failed to generate AI suggestions" in frontend

**Check:**
1. Backend is running on port 8000
2. OpenAI API key is set in `.env`
3. Check backend logs for errors
4. Test API directly with curl (see Step 5 above)

### Webhook not responding to SMS

**Check:**
1. ngrok is running: `ngrok http 8000`
2. Twilio webhook URL is correct
3. Backend shows log: "Incoming SMS from..."
4. Check Twilio console for webhook errors

### "Contact not found" when using conversation history

**Solution:** Import contacts from Google Sheets first:
```bash
# Coming from Google Sheets - contacts are loaded dynamically
# The webhook will handle unknown numbers gracefully
```

---

## 🎯 Next Steps

Now that LLM is connected, you can:

1. **Test Two-Way SMS**:
   - Set up ngrok tunnel
   - Configure Twilio webhook
   - Send test messages

2. **Enable Features in UI**:
   - Try "AI Improve" on the Messaging page
   - Enable "AI Personalization" when sending
   - View conversation summaries

3. **Monitor Performance**:
   - Check OpenAI usage: https://platform.openai.com/usage
   - Review conversation logs in database
   - Test different message types

4. **Customize System Prompt**:
   - Edit `backend/services/llm_service.py`
   - Update church information
   - Add your church's personality

---

## 📈 Success Metrics

After implementing LLM intelligence, you should see:

- ✅ **Faster Response Times**: Automated replies to common questions
- ✅ **Higher Engagement**: Personalized messages get more responses
- ✅ **Better Prayer Support**: Automatic detection and pastor alerts
- ✅ **Multi-Language**: Automatic translation for Bengali/Hindi/Spanish
- ✅ **Context Awareness**: AI remembers previous conversations

---

## 📚 Files Modified/Created

### Backend
- ✅ `backend/routes/llm_routes.py` (NEW) - 302 lines
- ✅ `backend/routes/webhook_routes.py` (NEW) - 245 lines
- ✅ `backend/services/llm_service.py` (UPDATED) - Now async
- ✅ `backend/models.py` (UPDATED) - Added Conversation model
- ✅ `backend/main.py` (UPDATED) - Registered new routes
- ✅ `backend/migrate_conversations.py` (NEW) - Migration script

### Frontend
- ✅ `frontend/src/api/llmApi.ts` (NEW) - 160 lines
- ✅ `frontend/src/pages/MessagingPage.tsx` (UPDATED) - AI features added

### Documentation
- ✅ `LLM_INTEGRATION_GUIDE.md` (THIS FILE)

---

## 🚀 You're Ready!

Your app now has **true AI intelligence**! 🎉

The transformation from rule-based to AI-powered communication is complete. Members will now receive:
- Intelligent, context-aware responses
- Personalized messages in their language
- Compassionate pastoral care
- Faster engagement

**Happy messaging! 🙏✨**
