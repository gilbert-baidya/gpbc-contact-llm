# 🚀 Render Deployment Guide (100% Free)

## Complete Step-by-Step Instructions

---

## 📋 Prerequisites (5 minutes)

Before starting, complete these security steps:

1. **Complete security checklist** from `SECURITY_AUDIT_RESULTS.md`:
   - [ ] Run `./rotate-secrets.sh` to generate new secrets
   - [ ] Create `backend/.env` with new secrets
   - [ ] Make repository private on GitHub

2. **Have ready:**
   - Your GitHub account
   - New Twilio credentials (rotated)
   - New OpenAI API key (rotated)
   - New JWT secret key (from rotate-secrets.sh)
   - Admin password (secure, min 16 chars)

---

## 🌐 Part 1: Deploy Backend (Python + Node) - 15 minutes

### Step 1: Create Render Account

1. Go to https://render.com
2. Click **"Get Started"** → Sign up with GitHub
3. Authorize Render to access your repositories
4. ✅ Free tier: No credit card required!

### Step 2: Create Web Service for Backend

1. Click **"New +"** button → Select **"Web Service"**

2. **Connect Repository:**
   - Find: `gilbert-baidya/GPBC-Contact-LLM`
   - Click **"Connect"**

3. **Configure Service:**
   ```
   Name:              gpbc-contact-backend
   Region:            Oregon (US West) - or closest to you
   Branch:            main
   Root Directory:    backend
   Runtime:           Python 3
   Build Command:     pip install -r requirements.txt
   Start Command:     uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. **Select Plan:**
   - Choose **"Free"** plan
   - ⚠️ Note: "Spins down after 15 minutes of inactivity"
   - First request after sleep takes ~30 seconds

5. Click **"Create Web Service"** (don't add env vars yet)

### Step 3: Add Environment Variables

Once the service is created:

1. Go to **"Environment"** tab in left sidebar

2. Click **"Add Environment Variable"** and add these one by one:

   ```bash
   # Database
   DATABASE_URL=sqlite:///./church_contacts.db
   
   # Twilio (from your Twilio console)
   TWILIO_ACCOUNT_SID=your_new_account_sid_here
   TWILIO_AUTH_TOKEN=your_new_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   
   # OpenAI (from platform.openai.com)
   OPENAI_API_KEY=your_new_openai_key_here
   
   # JWT Secret (from rotate-secrets.sh)
   SECRET_KEY=your_64_character_hex_secret_here
   
   # Admin Password (strong, 16+ chars)
   DEFAULT_ADMIN_PASSWORD=your_secure_admin_password_here
   
   # Google Apps Script
   GOOGLE_SCRIPT_URL=your_google_apps_script_url
   
   # Environment
   DEBUG=False
   ENV=production
   
   # CORS (we'll update this after frontend deployment)
   ALLOWED_ORIGINS=https://*.onrender.com,https://gpbc-contact-frontend.onrender.com
   ```

3. Click **"Save Changes"**

4. Service will automatically redeploy with new variables

### Step 4: Get Backend URL

1. Wait for deployment to complete (3-5 minutes)
2. Look for green **"Live"** status
3. Copy your backend URL: `https://gpbc-contact-backend.onrender.com`
4. **Save this URL!** You'll need it for frontend

### Step 5: Test Backend

1. Open: `https://gpbc-contact-backend.onrender.com/docs`
2. You should see FastAPI Swagger documentation
3. Test endpoint: Click **GET `/api/statistics`** → "Try it out" → "Execute"
4. ✅ If you see JSON response, backend is working!

---

## 🎨 Part 2: Deploy Frontend (React) - 10 minutes

### Step 1: Create Static Site

1. Go back to Render dashboard
2. Click **"New +"** → Select **"Static Site"**

### Step 2: Connect Same Repository

1. Find: `gilbert-baidya/GPBC-Contact-LLM`
2. Click **"Connect"**

### Step 3: Configure Static Site

```
Name:                gpbc-contact-frontend
Branch:              main
Root Directory:      frontend
Build Command:       npm install && npm run build
Publish Directory:   dist
```

### Step 4: Add Environment Variable

1. Click **"Advanced"** to expand options
2. Add Environment Variable:
   ```
   Key:   VITE_API_URL
   Value: https://gpbc-contact-backend.onrender.com
   ```
   (Use the backend URL from Part 1, Step 4)

3. Click **"Create Static Site"**

### Step 5: Wait for Deployment

1. Deployment takes 2-4 minutes
2. Watch build logs for any errors
3. Look for green **"Live"** status
4. Copy frontend URL: `https://gpbc-contact-frontend.onrender.com`

### Step 6: Update Backend CORS

1. Go back to **Backend service** → **"Environment"** tab
2. Find `ALLOWED_ORIGINS` variable
3. Update to:
   ```
   https://gpbc-contact-frontend.onrender.com,https://*.onrender.com
   ```
4. Save (backend will auto-redeploy)

---

## ✅ Part 3: Initialize & Test (5 minutes)

### Step 1: Initialize Database

1. Open backend URL: `https://gpbc-contact-backend.onrender.com/docs`
2. Find **POST `/api/auth/register`** endpoint
3. Click "Try it out"
4. Request body:
   ```json
   {
     "email": "admin@gpbc.com",
     "password": "your_secure_admin_password",
     "role": "admin"
   }
   ```
5. Click "Execute"
6. ✅ Should return user object with JWT token

### Step 2: Test Frontend Login

1. Open: `https://gpbc-contact-frontend.onrender.com`
2. Click **"Login"**
3. Enter:
   - Email: `admin@gpbc.com`
   - Password: `your_secure_admin_password`
4. ✅ Should redirect to dashboard

### Step 3: Test Full Flow

1. Go to **Contacts** page
2. Contacts from Google Sheets should load
3. Select a contact
4. Click **"Send Message"**
5. ✅ Message should send via Twilio

---

## 🎉 Success! Your App is Live

### Your URLs:

- **Frontend:** `https://gpbc-contact-frontend.onrender.com`
- **Backend API:** `https://gpbc-contact-backend.onrender.com`
- **API Docs:** `https://gpbc-contact-backend.onrender.com/docs`

### Access from anywhere:

- 📱 Phone browser: Open frontend URL
- 💻 Any computer: Open frontend URL
- 🌍 Any location: Works worldwide

---

## ⚠️ Important Notes

### Free Tier Limitations

| Feature | Free Tier | Impact |
|---------|-----------|--------|
| Backend Sleep | Sleeps after 15 min idle | First request takes ~30s to wake |
| RAM | 512 MB | ✅ Plenty for your app |
| Bandwidth | 100 GB/month | ✅ More than enough |
| Build Hours | 500 hrs/month | ✅ Won't reach limit |
| Custom Domain | ❌ Not free | Use *.onrender.com URL |

### Wake Up Backend

If backend is asleep, first request will be slow:

1. User opens app → Frontend loads instantly
2. Frontend calls backend → Backend wakes up (~30 seconds)
3. Subsequent requests → Fast

**Tip:** Keep backend awake by pinging every 14 minutes:
- Use free service like UptimeRobot
- Ping: `https://gpbc-contact-backend.onrender.com/health`

---

## 🔄 Updating Your App

### Method 1: Automatic (Recommended)

1. Make changes on your computer
2. Commit: `git add . && git commit -m "update message"`
3. Push: `git push origin main`
4. ✅ Render auto-deploys in 2-3 minutes

### Method 2: Manual

1. Go to Render dashboard
2. Select service (frontend or backend)
3. Click **"Manual Deploy"** → Select branch
4. Click **"Deploy"**

---

## 🔒 Security Checklist

After deployment, verify:

- [ ] Repository is private on GitHub
- [ ] All secrets rotated (Twilio, OpenAI, JWT)
- [ ] No hardcoded credentials in code
- [ ] HTTPS enabled (automatic with Render)
- [ ] Environment variables set correctly
- [ ] `.env` file NOT in repository
- [ ] Admin password is strong (16+ chars)
- [ ] Only authorized users have login credentials

---

## 🐛 Troubleshooting

### Backend won't start

**Error:** `ModuleNotFoundError: No module named 'fastapi'`

**Fix:** Check `requirements.txt` exists in `backend/` folder

**Error:** `SECRET_KEY not set`

**Fix:** Add `SECRET_KEY` environment variable in Render

### Frontend shows blank page

**Error:** Can't connect to backend

**Fix:** 
1. Check `VITE_API_URL` is set correctly
2. Verify backend is running (visit `/docs` endpoint)
3. Check CORS settings in backend

### CORS Error in Browser Console

**Error:** `Access-Control-Allow-Origin` error

**Fix:** Update `ALLOWED_ORIGINS` in backend environment variables to include your frontend URL

### Database errors

**Error:** `no such table: users`

**Fix:** Initialize database by calling `/api/auth/register` endpoint

### Messages not sending

**Error:** `Twilio authentication failed`

**Fix:** Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct (no extra spaces)

---

## 💰 Upgrade Options (Optional)

If you want always-on backend (no sleep):

### Render Starter Plan - $7/month
- ✅ No sleep (always on)
- ✅ 512 MB RAM
- ✅ Custom domain support
- ✅ Priority support

### How to Upgrade:
1. Go to backend service
2. Click **"Settings"** → **"Plan"**
3. Select **"Starter"**
4. Add payment method
5. ✅ Backend stays awake 24/7

---

## 📱 Share with Your Team

### For Admins/Pastors:

**App URL:** `https://gpbc-contact-frontend.onrender.com`

**Login Credentials:**
- Email: `admin@gpbc.com`
- Password: `[provide securely]`

**Features:**
- ✅ View all contacts from Google Sheets
- ✅ Send SMS to groups (Men/Women/Young Adults)
- ✅ Message templates
- ✅ Cost calculator
- ✅ Works on phone/tablet/computer

**Important:**
- First load after idle may take 30 seconds
- Always logout when done
- Don't share credentials
- Access from anywhere with internet

---

## 🎯 Next Steps

1. ✅ Deploy backend and frontend
2. ✅ Test login and message sending
3. ⚠️ Change admin password after first login
4. 📱 Bookmark URL on phone home screen
5. 👥 Create accounts for Pastor/other admins
6. 🔔 Set up UptimeRobot to keep backend awake (optional)
7. 🌐 Consider custom domain (optional, requires paid plan)

---

## 📞 Support

If you encounter issues:

1. Check deployment logs in Render dashboard
2. Verify all environment variables
3. Test backend `/docs` endpoint
4. Check browser console for errors
5. Review `TROUBLESHOOTING_REPORT.md` in your project

---

## 🎉 Congratulations!

Your church communication system is now:
- ✅ Accessible worldwide
- ✅ Secure with HTTPS
- ✅ Protected with authentication
- ✅ Free to run
- ✅ Automatically updated with git push

**Enjoy your new church communication platform!** 🙏
