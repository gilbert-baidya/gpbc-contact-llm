# Church Contact Communication System - Setup Guide

## Overview

This system provides a comprehensive solution for managing church contacts with AI-powered voice and SMS communication capabilities.

## Prerequisites

Before starting, ensure you have:

1. **Python 3.10+** - [Download](https://www.python.org/downloads/)
2. **Node.js 18+** - [Download](https://nodejs.org/)
3. **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
4. **Redis 6+** - [Download](https://redis.io/download/)
5. **Docker & Docker Compose** (Optional but recommended) - [Download](https://www.docker.com/products/docker-desktop/)

## Required Accounts

### 1. Twilio Account (for SMS & Voice)

1. Sign up at [https://www.twilio.com/](https://www.twilio.com/)
2. Go to Console Dashboard
3. Note down:
   - **Account SID**
   - **Auth Token**
4. Purchase a phone number:
   - Navigate to Phone Numbers → Buy a Number
   - Select a number with Voice and SMS capabilities
   - Note down the phone number (format: +1234567890)

### 2. OpenAI Account (for AI Conversations)

1. Sign up at [https://platform.openai.com/](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy and save the API key (starts with `sk-`)

## Installation Methods

### Method 1: Docker Compose (Recommended)

This is the easiest method as it handles all dependencies automatically.

#### Step 1: Clone/Setup Project

```bash
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
```

#### Step 2: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file with your credentials:

```bash
# Database (leave as is for Docker)
DATABASE_URL=postgresql://postgres:password@postgres:5432/church_contacts
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=church_contacts

# Redis (leave as is for Docker)
REDIS_URL=redis://redis:6379/0

# Twilio Configuration - ADD YOUR CREDENTIALS
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_URL=https://your-domain.com/api/webhooks/twilio

# OpenAI Configuration - ADD YOUR API KEY
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# Application (leave as is for Docker)
SECRET_KEY=change-this-to-random-string-in-production
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

#### Step 3: Start All Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- Backend API server
- Celery workers for background tasks
- Celery beat for scheduled tasks
- Frontend React application

#### Step 4: Verify Services

Check if all services are running:

```bash
docker-compose ps
```

You should see all services in "Up" state.

#### Step 5: Access the Application

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Method 2: Manual Installation

If you prefer to run services individually without Docker:

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file in backend directory with your credentials
cp ../.env.example .env

# Start PostgreSQL and Redis (must be running)
# On macOS with Homebrew:
brew services start postgresql
brew services start redis

# Run database migrations (first time only)
# This will create all necessary tables
python -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"

# Start the backend server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

In separate terminals, start Celery workers:

```bash
# Terminal 2: Celery Worker
cd backend
source venv/bin/activate
celery -A tasks.celery_app worker --loglevel=info

# Terminal 3: Celery Beat (for scheduled tasks)
cd backend
source venv/bin/activate
celery -A tasks.celery_app beat --loglevel=info
```

#### Frontend Setup

```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:3000

## Importing Your Contacts

### Using the Web Interface

1. Open http://localhost:3000
2. Navigate to "Contacts" page
3. Click "Import CSV" button
4. Select your CSV file
5. Wait for confirmation

### CSV File Format

Your CSV should have these columns:
- `Sl.Nos.` - Serial number (optional)
- `Name` - Contact name (required)
- `Address` - Street address (optional)
- `City` - City name (optional)
- `StateZip` - State and ZIP code (optional)
- `Tel.Nos.` - Phone number (required)

Example:
```csv
Sl.Nos.,Name,Address,City,StateZip,Tel.Nos.
1,John Doe,123 Main St,San Bernardino,CA 92408,909-123-4567
2,Jane Smith,456 Oak Ave,Loma Linda,CA 92354,909-987-6543
```

### Using the API

You can also import via API:

```bash
curl -X POST "http://localhost:8000/api/contacts/import" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/Users/gbaidya/Downloads/Update - Worship Service Invitees - Bangla - New.csv"
```

## Configuring Twilio Webhooks

For inbound call handling, you need to configure Twilio webhooks:

### Option 1: Using ngrok (for local development)

1. Install ngrok: https://ngrok.com/download
2. Start ngrok tunnel:
   ```bash
   ngrok http 8000
   ```
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Update your `.env`:
   ```
   TWILIO_WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/twilio
   ```

### Option 2: Deploy to Production

Deploy your backend to a cloud service (AWS, Heroku, DigitalOcean, etc.) and use that URL.

### Configure in Twilio Console

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to Phone Numbers → Manage → Active Numbers
3. Click on your phone number
4. Under "Voice & Fax", set:
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://your-domain.com/api/webhooks/twilio/voice-inbound`
   - **Method**: POST
5. Click Save

## Using the System

### 1. Dashboard

- View statistics and recent activity
- Quick actions for common tasks

### 2. Contacts Management

- **View all contacts**: Browse and search your contact list
- **Add contacts**: Manually add new contacts
- **Import contacts**: Bulk import from CSV
- **Edit contacts**: Update contact information
- **Delete contacts**: Remove contacts (soft delete)

### 3. Sending Messages

#### Send SMS

1. Go to "Messaging" page
2. Select "SMS Text" as message type
3. Choose recipients:
   - Check "Send to all" for everyone
   - Or select specific contacts from Contacts page
4. Type your message
5. Click "Send SMS"

#### Make Voice Calls

1. Go to "Messaging" page
2. Select "Voice Call" as message type
3. Enter message text (will be converted to speech)
4. Choose recipients
5. Click "Send Voice Call"

#### Using Templates

Quick templates are available for:
- Weekly service reminders
- Wednesday prayer meetings
- Christmas greetings
- Easter greetings

Click any template to use it.

### 4. Scheduled Reminders

#### Create a Weekly Reminder

1. Go to "Reminders" page
2. Click "New Reminder"
3. Fill in:
   - **Name**: "Sunday Service Reminder"
   - **Message Type**: SMS or Voice
   - **Schedule Type**: Weekly
   - **Day**: Sunday
   - **Time**: 09:00 (9:00 AM)
   - **Message**: Your reminder text
   - Check "Send to all active contacts"
4. Click "Create Reminder"

The system will automatically send this message every Sunday at 9:00 AM.

#### Create One-Time Event Reminder

1. Select "One Time" as schedule type
2. Choose the specific date
3. Set time
4. Enter message
5. Create

### 5. Handling Inbound Calls

When someone calls your Twilio number:

1. **AI Greeting**: System greets caller in multiple languages
2. **Name Collection**: Asks for caller's name
3. **Intelligent Conversation**: AI responds to queries about:
   - Service times
   - Church locations
   - Events and activities
   - Prayer requests
4. **Language Detection**: Automatically detects and responds in caller's language
5. **Call Logging**: All conversations are logged and summarized

View call logs in the Dashboard.

## Supported Languages

The AI assistant supports conversations in:
- English
- Bengali (বাংলা)
- Hindi (हिंदी)
- Spanish (Español)

The system automatically detects the caller's language and responds accordingly.

## Troubleshooting

### Backend not starting

```bash
# Check if PostgreSQL is running
docker-compose ps postgres
# or for manual installation:
pg_isready

# Check logs
docker-compose logs backend
```

### Frontend not loading

```bash
# Check if backend is accessible
curl http://localhost:8000/health

# Should return: {"status":"healthy"}
```

### Messages not sending

1. Verify Twilio credentials in `.env`
2. Check Celery worker is running:
   ```bash
   docker-compose logs celery_worker
   ```
3. Ensure phone numbers are in correct format: +1234567890

### Scheduled reminders not working

1. Check Celery beat is running:
   ```bash
   docker-compose logs celery_beat
   ```
2. Verify timezone settings (default: America/Los_Angeles)
3. Check reminder is active in the Reminders page

### Database issues

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

## Stopping the System

```bash
# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

## Production Deployment

For production use:

1. **Security**:
   - Change `SECRET_KEY` to a random string
   - Set `DEBUG=False`
   - Use strong database passwords
   - Enable HTTPS

2. **Database**:
   - Use managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
   - Enable backups

3. **Hosting**:
   - Deploy backend to AWS, Heroku, or DigitalOcean
   - Deploy frontend to Vercel, Netlify, or S3
   - Use environment variables for configuration

4. **Monitoring**:
   - Set up error tracking (Sentry)
   - Monitor API performance
   - Track Twilio usage and costs

## Cost Considerations

### Twilio Costs (as of 2024)

- **SMS**: ~$0.0075 per message (USA)
- **Voice**: ~$0.013 per minute (USA)
- **Phone Number**: ~$1.15/month

Example for 80 contacts:
- Weekly SMS reminder: 80 × $0.0075 × 52 weeks = ~$31/year
- Monthly voice call: 80 × 2 min × $0.026 × 12 = ~$50/year

### OpenAI Costs

- **GPT-4 Turbo**: $0.01 per 1K input tokens, $0.03 per 1K output tokens
- Typical conversation: ~$0.05-0.15

Budget ~$20-50/month for moderate usage.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation at http://localhost:8000/docs
3. Check logs: `docker-compose logs -f`

## Next Steps

1. Import your contacts from the provided CSV
2. Test SMS functionality with one contact
3. Test voice call functionality
4. Set up weekly service reminder
5. Configure Twilio webhooks for inbound calls
6. Customize AI assistant prompts in `backend/services/llm_service.py`

Enjoy your new church communication system! 🙏
