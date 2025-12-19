# Quick Start Guide

## 1. Setup (5 minutes)

### Get API Keys

1. **Twilio** (for SMS/Calls):
   - Sign up: https://www.twilio.com/
   - Get Account SID, Auth Token, and buy a phone number
   
2. **OpenAI** (for AI):
   - Sign up: https://platform.openai.com/
   - Get API key (starts with `sk-`)

### Configure

```bash
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"

# Copy and edit environment file
cp .env.example .env
nano .env  # or open in text editor
```

Add your keys to `.env`:
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=sk-your-key
```

## 2. Start System (1 minute)

```bash
docker-compose up -d
```

Wait ~30 seconds for services to start.

## 3. Import Contacts (2 minutes)

1. Open browser: http://localhost:3000
2. Click "Contacts" → "Import CSV"
3. Upload: `/Users/gbaidya/Downloads/Update - Worship Service Invitees - Bangla - New.csv`
4. Verify 80+ contacts imported

## 4. Send First Message (1 minute)

1. Go to "Messaging" page
2. Type: "Hello! This is a test from our new church communication system."
3. Uncheck "Send to all"
4. Go to Contacts, select 1-2 contacts
5. Return to Messaging
6. Click "Send SMS"

✅ You should receive SMS within seconds!

## 5. Test Voice Call (Optional)

1. In Messaging page, select "Voice Call"
2. Type: "Hello, this is a test call from your church."
3. Select one contact
4. Click "Send Voice Call"

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop system
docker-compose down

# Restart system
docker-compose restart

# View status
docker-compose ps
```

## Test Inbound Calls (Advanced)

1. Install ngrok: `brew install ngrok`
2. Run: `ngrok http 8000`
3. Copy HTTPS URL
4. Go to Twilio Console → Your Phone Number
5. Set Voice URL: `https://YOUR-NGROK-URL/api/webhooks/twilio/voice-inbound`
6. Call your Twilio number
7. AI will answer and chat with you!

## URLs

- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Troubleshooting

**"Connection refused"**: Wait 30 seconds for services to start

**"Import failed"**: Check CSV format matches example

**"SMS not sending"**: Verify Twilio credentials in `.env`

**Need help?**: Check `SETUP_GUIDE.md` for detailed instructions

---

**Total Setup Time**: ~10 minutes 🎉
