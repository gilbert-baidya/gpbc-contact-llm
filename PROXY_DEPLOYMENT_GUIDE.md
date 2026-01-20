# Node.js Proxy Deployment Guide (Free)

Deploy your Node.js proxy server to Render to connect Netlify frontend with Google Apps Script.

## Architecture Overview

```
┌──────────────────┐
│  Netlify Frontend│ (React - Static Hosting)
│  gpbc-contact... │
└────────┬─────────┘
         │
         │ API Calls
         ▼
┌──────────────────┐
│ Render Node Proxy│ (server.js - Free Tier)
│  Port 3001       │
└────────┬─────────┘
         │
         │ Authenticated Requests
         ▼
┌──────────────────┐
│ Google Apps      │ (Your Spreadsheet API)
│ Script           │
└──────────────────┘
         │
         │ Read/Write
         ▼
┌──────────────────┐
│ Google Sheets    │ (Contact Database)
│                  │
└──────────────────┘
```

**Components:**
- ✅ **Netlify** - Hosts your React UI
- ✅ **Render** - Hosts your Node.js proxy (FREE)
- ✅ **Google Apps Script** - Your API (already deployed)
- ✅ **Google Sheets** - Your database (already exists)
- ✅ **Twilio** - SMS sending (already configured)

**NO Python backend needed!**

---

## Step 1: Prepare for Deployment (2 minutes)

### 1.1 Update CORS in server.js

Your proxy needs to allow requests from Netlify:

```javascript
// In server.js, update corsOptions:
const corsOptions = {
  origin: [
    'http://localhost:3005',
    'http://localhost:3000',
    'https://gpbc-contact.netlify.app',  // Add your Netlify URL
    'https://*.netlify.app'               // Allow all Netlify preview URLs
  ],
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### 1.2 Verify package.json

Check that `package.json` has the start script:

```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

---

## Step 2: Deploy Node.js Proxy to Render (5 minutes)

### 2.1 Create Render Account
1. Go to https://render.com
2. Click **"Get Started for Free"**
3. Sign up with GitHub (connects your repository)
4. **No credit card required**

### 2.2 Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect repository: `gilbert-baidya/gpbc-contact-llm`
3. Configure:
   - **Name**: `gpbc-proxy` (or any name)
   - **Region**: Oregon (US West) or closest to you
   - **Branch**: `main`
   - **Root Directory**: `.` (leave blank or enter `.`)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: **Free**

4. Click **"Advanced"** and add environment variables:

### 2.3 Add Environment Variables
Click **"Add Environment Variable"** for each:

```bash
# Required - Your Google Apps Script API Key
GPBC_API_KEY=your_actual_api_key_here

# Required - Port (Render uses PORT environment variable)
PORT=10000

# Optional - Node environment
NODE_ENV=production
```

**Important:** Get your actual `GPBC_API_KEY` from your `.env` file or Google Apps Script setup.

### 2.4 Deploy
1. Click **"Create Web Service"**
2. Wait 2-3 minutes for deployment
3. Render will show you the URL: `https://gpbc-proxy.onrender.com`

---

## Step 3: Update Frontend to Use Proxy (3 minutes)

### 3.1 Update API Base URL

Edit `frontend/src/api/backendApi.ts`:

```typescript
// Change from localhost to your Render proxy URL
const API_BASE_URL = import.meta.env.VITE_PROXY_URL || 'https://gpbc-proxy.onrender.com';
```

### 3.2 Add Environment Variable to Netlify

1. Go to Netlify dashboard → Your site
2. Click **"Site settings"** → **"Environment variables"**
3. Click **"Add a variable"**
4. Add:
   - **Key**: `VITE_PROXY_URL`
   - **Value**: `https://gpbc-proxy.onrender.com` (your Render URL)
5. Click **"Save"**

### 3.3 Trigger Redeploy

Option A: Push a commit
```bash
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
git add .
git commit -m "feat: Connect frontend to deployed Node.js proxy"
git push origin main
```

Option B: Manual redeploy in Netlify
1. Go to Netlify dashboard
2. Click **"Deploys"**
3. Click **"Trigger deploy"** → **"Clear cache and deploy site"**

---

## Step 4: Test Your Online App (2 minutes)

### 4.1 Wait for Deployments
- Netlify: 1-2 minutes
- Render: Already deployed

### 4.2 Test Full Flow

1. Visit your Netlify URL: `https://gpbc-contact.netlify.app`

2. Check Dashboard:
   - Should show statistics
   - If error, check browser console (F12)

3. Check Contacts Page:
   - Should load contacts from Google Sheets
   - Try selecting contacts
   - Try search functionality

4. Try Messaging:
   - Select contacts
   - Click "Send Message"
   - Choose template or write message
   - Send SMS (verify delivery on phone)

### 4.3 Expected Behavior
- ✅ UI loads instantly
- ✅ Statistics load from Google Sheets
- ✅ Contacts load with groups (Men, Women, Young Adults)
- ✅ Messaging works via Twilio
- ⚠️ First request may be slow (15-30 seconds) - Render free tier "wakes up"

---

## Step 5: Keep Proxy Awake (Optional - 5 minutes)

Render free tier "sleeps" after 15 minutes of inactivity. First request after sleep takes 30-60 seconds.

### Option A: Use UptimeRobot (Free)

1. Go to https://uptimerobot.com
2. Sign up (free)
3. Click **"Add New Monitor"**
4. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: GPBC Proxy
   - **URL**: `https://gpbc-proxy.onrender.com/health`
   - **Monitoring Interval**: 14 minutes
5. Save

This pings your proxy every 14 minutes to keep it awake.

### Option B: Add Health Check Endpoint

Add to `server.js`:

```javascript
// Health check endpoint for uptime monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

Then use UptimeRobot as above.

---

## Troubleshooting

### Issue: "Cannot connect to server"

**Check 1**: Verify Render deployment
- Go to Render dashboard
- Check if service is "Live" (green)
- Click service → "Logs" to see errors

**Check 2**: Verify environment variables
- Render dashboard → Your service → "Environment"
- Make sure `GPBC_API_KEY` is set

**Check 3**: Test proxy directly
```bash
curl https://gpbc-proxy.onrender.com/stats
```
Should return JSON with statistics.

**Check 4**: Check CORS
- Browser console (F12) → "Console" tab
- Look for CORS errors
- Make sure `server.js` includes your Netlify URL

### Issue: "Statistics not loading"

**Check 1**: Google Apps Script API
- Verify `GPBC_API_KEY` is correct
- Test directly: Visit your Apps Script URL in browser

**Check 2**: Check Render logs
```
Render Dashboard → Your Service → Logs
```
Look for errors like "GPBC API key is not configured"

### Issue: "First load is very slow"

**Expected behavior** on Render free tier:
- After 15 minutes of no activity, service sleeps
- First request after sleep: 30-60 seconds
- Subsequent requests: Fast (<1 second)

**Solutions**:
- Set up UptimeRobot (keeps awake)
- Upgrade to Render paid tier ($7/month for instant response)

### Issue: "Messaging not working"

**Check Twilio**: This should work the same as localhost
- Verify Twilio credentials in Google Apps Script
- Check Twilio console for errors
- Make sure phone numbers are verified (if trial account)

---

## Architecture Benefits

✅ **Fully Free**:
- Netlify: Free tier (100GB bandwidth)
- Render: Free tier (750 hours/month)
- Google Sheets: Free
- Google Apps Script: Free
- Twilio: Pay-per-message (no monthly fee)

✅ **No Complex Backend**:
- No Python FastAPI
- No SQLite database
- No authentication system needed
- Just a simple Node.js proxy

✅ **Same as Localhost**:
- Exact same code
- Same API calls
- Same Google Sheets integration
- Same Twilio messaging

✅ **Easy Maintenance**:
- Update Google Sheets directly
- No database migrations
- No server administration
- Push to GitHub → Auto-deploy

---

## Cost Summary

| Service | Cost | Usage Limit |
|---------|------|-------------|
| Netlify (Frontend) | $0/month | 100GB bandwidth, 300 build minutes |
| Render (Proxy) | $0/month | 750 hours/month, sleeps after 15min |
| Google Sheets | $0/month | Unlimited (for personal use) |
| Google Apps Script | $0/month | 20,000 executions/day |
| Twilio SMS | ~$0.0075/msg | Pay per message sent |

**Total Monthly Cost**: $0 infrastructure + Twilio message costs

---

## Update Instructions

### To Update Frontend (UI Changes):
```bash
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
# Make your changes to frontend files
git add .
git commit -m "Update: describe your changes"
git push origin main
# Netlify auto-deploys in 1-2 minutes
```

### To Update Proxy (API Changes):
```bash
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
# Edit server.js
git add server.js
git commit -m "Update: describe your changes"
git push origin main
# Render auto-deploys in 2-3 minutes
```

### To Update Contacts:
- Just edit your Google Sheets directly
- Changes appear immediately (no deployment needed)

---

## Next Steps

1. ✅ Deploy Node.js proxy to Render (5 minutes)
2. ✅ Update frontend API URL (3 minutes)
3. ✅ Test full application online (2 minutes)
4. ⚠️ Rotate secrets (Twilio, API keys) - See SECURITY.md
5. ⚠️ Make GitHub repository private
6. 📱 Share Netlify URL with Pastor/Admin for testing

---

## Support & Resources

- **Render Docs**: https://render.com/docs/web-services
- **Netlify Docs**: https://docs.netlify.com
- **Google Apps Script**: https://developers.google.com/apps-script
- **Twilio Docs**: https://www.twilio.com/docs/sms

---

**You now have a fully functional, free church contact management system online!** 🎉
