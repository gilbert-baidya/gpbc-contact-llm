# Church Contact Communication System

A comprehensive LLM-powered communication platform for church contact management with voice and SMS capabilities.

## 🚀 Quick Links

- **[📖 Complete Documentation Index](INDEX.md)** - Start here for all guides
- **[⚡ Quick Start (10 min)](QUICKSTART.md)** - Get up and running fast
- **[📚 Setup Guide](SETUP_GUIDE.md)** - Detailed installation instructions
- **[✨ Features](FEATURES.md)** - Complete feature list with examples
- **[🔌 API Documentation](API_DOCUMENTATION.md)** - API reference guide
- **[🏗️ Architecture](ARCHITECTURE.md)** - System architecture details
- **[📊 Project Summary](PROJECT_SUMMARY.md)** - Complete overview

## ✨ Features

- 📱 **SMS & Voice Calls**: Send text reminders and make voice calls to contacts
- 🤖 **AI-Powered Conversations**: LLM agent for intelligent, multilingual conversations
- 📅 **Automated Scheduling**: Weekly reminders and event notifications
- 🎄 **Seasonal Greetings**: Custom messages for holidays and special occasions
- 📞 **Inbound Call Handling**: AI receptionist that greets callers and chats in their language
- 👥 **Contact Management**: Import and manage church member contacts
- 🌐 **Web Dashboard**: User-friendly interface for all operations

## Technology Stack

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Query** for state management
- **React Router** for navigation

### Backend
- **FastAPI** (Python) - High-performance async framework
- **PostgreSQL** - Database for contacts and message history
- **SQLAlchemy** - ORM for database operations
- **OpenAI API** - LLM for intelligent conversations
- **Twilio** - SMS and voice call integration
- **Celery** - Task queue for scheduled messages
- **Redis** - Message broker for Celery

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## Architecture

```
┌─────────────────┐
│  React Frontend │
└────────┬────────┘
         │ HTTP/REST
┌────────▼────────┐
│  FastAPI Backend│
└────┬───┬───┬────┘
     │   │   │
     │   │   └──────► OpenAI API (LLM)
     │   │
     │   └──────────► Twilio (SMS/Voice)
     │
┌────▼────────────┐
│   PostgreSQL    │
│   Redis         │
│   Celery Worker │
└─────────────────┘
```

## 🎯 Getting Started

### Option 1: Quick Start (10 minutes)
```bash
# 1. Set up credentials
cp .env.example .env
# Edit .env with your Twilio and OpenAI keys

# 2. Start everything
./scripts/start.sh

# 3. Open dashboard
open http://localhost:3000
```
See **[QUICKSTART.md](QUICKSTART.md)** for detailed steps.

### Option 2: Detailed Setup
Follow the comprehensive **[SETUP_GUIDE.md](SETUP_GUIDE.md)** for:
- API account creation (Twilio, OpenAI)
- Docker installation
- Manual installation
- Troubleshooting
- Production deployment

## 📱 What You Can Do

1. **Import Contacts**: Upload CSV with contact information
2. **Schedule Reminders**: Set weekly reminders or one-time messages
3. **Send Messages**: Compose and send to selected contacts or all
4. **Make Calls**: Initiate AI-powered voice calls
5. **Handle Inbound**: AI agent handles incoming calls automatically

See **[FEATURES.md](FEATURES.md)** for complete feature list with examples.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [INDEX.md](INDEX.md) | Complete documentation index |
| [QUICKSTART.md](QUICKSTART.md) | 10-minute quick start guide |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Comprehensive setup instructions |
| [FEATURES.md](FEATURES.md) | All features with examples |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Complete API reference |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Project overview |

## 🛠️ Utility Scripts

Located in `scripts/` directory:

```bash
./scripts/start.sh              # Start all services
./scripts/stop.sh               # Stop all services
./scripts/logs.sh               # View system logs
./scripts/health-check.sh       # System health check
./scripts/import-contacts.sh    # Import contacts from CSV
```

## 💰 Cost Estimate

For 80 contacts:
- Twilio SMS: ~$2-5/month
- Twilio Voice: ~$5-10/month
- OpenAI: ~$5-10/month
- **Total: ~$10-17/month**

See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md#-cost-estimate) for detailed breakdown.

## 🌍 Supported Languages

- English
- Bengali (বাংলা)
- Hindi (हिंदी)
- Spanish (Español)

AI automatically detects and responds in the caller's language!

## 📞 Support

- Check [SETUP_GUIDE.md](SETUP_GUIDE.md#troubleshooting) for common issues
- Run `./scripts/health-check.sh` to diagnose problems
- View logs with `./scripts/logs.sh`

## 🎓 Learning Path

1. **Day 1**: [QUICKSTART.md](QUICKSTART.md) → Setup & first message
2. **Week 1**: [FEATURES.md](FEATURES.md) → Learn all features
3. **Week 2**: Customize and schedule reminders
4. **Month 1**: Master the system

## 🔗 Access Points

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📊 What's Included

✅ Complete backend API (Python/FastAPI)  
✅ Modern frontend dashboard (React/TypeScript)  
✅ Database (PostgreSQL)  
✅ Background workers (Celery)  
✅ SMS/Voice integration (Twilio)  
✅ AI conversations (OpenAI)  
✅ Docker deployment  
✅ Comprehensive documentation  

## 🚀 Ready to Start?

```bash
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
./scripts/start.sh
```

Then open **http://localhost:3000** and begin!

## 📝 License

Private Use - Church Administration
