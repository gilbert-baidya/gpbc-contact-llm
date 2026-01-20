# GPBC Church Contact Communication System

> **LLM-powered SMS and Voice Communication Platform for Church Community Management**

A comprehensive church contact management system with real-time SMS messaging, voice calls, and intelligent conversation capabilities. Seamlessly integrates Google Sheets contact data with Twilio communications for efficient church community outreach.

---

## 🎯 What This System Does

This application enables church administrators to:
- 📱 **Send real SMS messages** to church members via Twilio
- 📞 **Make voice calls** with automated or custom messages  
- 👥 **Manage 154+ contacts** synced from Google Sheets in real-time
- 🔍 **Search and filter** contacts instantly
- ✉️ **Select multiple recipients** for bulk messaging
- 📊 **Track message history** and delivery status
- 🎨 **Use message templates** for common communications

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+ and Python 3.12+
- Twilio account with credentials
- Google Sheets with contact data

### Run All Services

```bash
# Terminal 1: Start Node.js Backend (Google Sheets Proxy)
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
node server.js

# Terminal 2: Start Python Backend (Twilio SMS/Voice)
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

**Access Dashboard:** http://localhost:3005

---

## 🏗️ System Architecture

### Hybrid Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│                   http://localhost:3005                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Dashboard  │  Contacts  │  Messaging  │  Reminders  │  │
│  └──────────────────────────────────────────────────────┘  │
│    • React + TypeScript + Vite                              │
│    • TanStack Query for data fetching                       │
│    • Tailwind CSS for styling                               │
│    • Dual API client (Node + Python)                        │
└────────────┬─────────────────────────┬──────────────────────┘
             │                         │
             │ Contacts/Stats          │ SMS/Voice
             │ (port 3001)             │ (port 8000)
             │                         │
    ┌────────▼──────────┐    ┌─────────▼──────────┐
    │   NODE.JS BACKEND │    │  PYTHON BACKEND    │
    │   Express Server  │    │  FastAPI Server    │
    │   Port 3001       │    │  Port 8000         │
    └────────┬──────────┘    └─────────┬──────────┘
             │                          │
    ┌────────▼──────────┐    ┌─────────▼──────────┐
    │  GOOGLE SHEETS    │    │  TWILIO API        │
    │  Contact Database │    │  SMS & Voice       │
    │  (154 contacts)   │    │  Real Delivery     │
    └───────────────────┘    └─────────┬──────────┘
                                        │
                             ┌──────────▼──────────┐
                             │   SQLite Database   │
                             │   Message History   │
                             └─────────────────────┘
```

### Why Two Backends?

**Node.js Backend (Port 3001)**
- **Purpose:** Real-time Google Sheets data proxy
- **Responsibilities:** 
  - Fetch contacts from Google Apps Script API
  - Provide statistics from spreadsheet
  - No database required (reads directly from sheets)
- **Technology:** Express.js, JavaScript

**Python Backend (Port 8000)**  
- **Purpose:** Advanced communication features
- **Responsibilities:**
  - Send real SMS via Twilio SDK
  - Make voice calls with TwiML
  - Store message history in SQLite
  - LLM integration (OpenAI) for AI conversations
  - Background task scheduling (Celery)
- **Technology:** FastAPI, Python 3.12, SQLAlchemy, Twilio SDK

**Why Not Just One Backend?**
1. **Python Ecosystem:** Twilio, OpenAI, LangChain, pandas—best Python support
2. **Real-time Google Sheets:** Node.js excels at proxying external APIs
3. **Separation of Concerns:** Data source vs. communication logic
4. **Scalability:** Can deploy each service independently

---

## 📦 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |
| TanStack Query | 5.x | Server state management |
| Axios | 1.x | HTTP client |
| Tailwind CSS | 3.x | Styling |
| React Router | 6.x | Navigation |
| React Hot Toast | 2.x | Notifications |

### Backend - Node.js (Port 3001)
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Express | 4.x | Web framework |
| CORS | 2.x | Cross-origin requests |

### Backend - Python (Port 8000)
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.12.8 | Runtime (via pyenv) |
| FastAPI | 0.109.x | Web framework |
| Uvicorn | 0.27.x | ASGI server |
| SQLAlchemy | 2.0.x | ORM |
| Twilio | 8.11.x | SMS/Voice API |
| OpenAI | 1.10.x | LLM integration |
| Celery | 5.3.x | Task queue |
| Redis | 5.0.x | Message broker |
| Pydantic | 2.5.x | Data validation |
| LangChain | 0.1.x | AI orchestration |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| SQLite | Local message history database |
| Google Sheets | Contact data source (154 contacts) |
| Twilio | SMS & Voice delivery service |
| pyenv | Python version management |

---

## 📱 Features

### Contact Management
- ✅ **Real-time Google Sheets sync** - 154 contacts loaded instantly
- ✅ **Advanced search** - Filter by name or phone number
- ✅ **Bulk selection** - Select multiple contacts for messaging
- ✅ **Opt-in status** - Visual indicators for consent

### Messaging
- ✅ **Real SMS sending** via Twilio (verified and tested)
- ✅ **Voice calls** with custom messages
- ✅ **Message templates** - Quick access to common messages
- ✅ **Bulk messaging** - Send to multiple contacts simultaneously
- ✅ **Message history** - Track all sent messages

### Dashboard
- ✅ **Statistics overview** - Total contacts, messages sent
- ✅ **Contact breakdown** - Active vs. inactive counts
- ✅ **Activity monitoring** - Recent messaging activity

### Scheduled Reminders
- 🔄 **Recurring messages** - Weekly, monthly schedules
- 📅 **Event notifications** - Service reminders, prayer meetings
- 🎄 **Seasonal greetings** - Christmas, Easter, holidays

---

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
# Database
DATABASE_URL=sqlite:///./church_contacts.db

# Twilio (REQUIRED for SMS)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# CORS (Frontend ports)
ALLOWED_ORIGINS=http://localhost:3005,http://localhost:3000,http://localhost:3001

# URLs
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3005
```

---

## 📖 Documentation

- **[📚 Setup Guide](SETUP_GUIDE.md)** - Detailed installation instructions
- **[✨ Features](FEATURES.md)** - Complete feature list with examples
- **[🔌 API Documentation](API_DOCUMENTATION.md)** - API reference guide
- **[🏗️ Architecture](ARCHITECTURE.md)** - System architecture details
- **[📊 Project Summary](PROJECT_SUMMARY.md)** - Complete overview
- **[⚡ Quick Start](QUICKSTART.md)** - Fast setup guide
- **[🔍 Troubleshooting Report](TROUBLESHOOTING_REPORT.md)** - Issues fixed during development

---

## 🎯 Current Status

### ✅ Fully Operational
- Node.js backend serving 154 Google Sheets contacts
- Python backend with Twilio integration (SMS verified working)
- Frontend with search, filtering, and messaging UI
- Real SMS delivery confirmed (test messages sent successfully)
- CORS properly configured for all ports

### 🚧 Optional Enhancements
- Voice call feature (configured, not yet tested)
- OpenAI LLM integration (requires API key)
- Celery background tasks (requires Redis)
- PostgreSQL migration (currently using SQLite)

---

## 👥 Contact

**Project:** GPBC Church Contact Communication System  
**Repository:** gilbert-baidya/GPBC-Contact-LLM  
**Branch:** main

---

## 📄 License

This project is for church community management purposes.

---

## 🙏 Acknowledgments

Built with modern web technologies to serve church community communication needs. Special thanks to the technologies that made this possible: React, FastAPI, Twilio, and Google Sheets API.
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
