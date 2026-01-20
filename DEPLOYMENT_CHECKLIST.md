# ✅ Online Deployment Checklist

Follow these steps to get your app running online with the **same architecture as localhost**.

## Your Simple Architecture

```
Internet User
    ↓
Netlify (React UI) → Render (Node Proxy) → Google Apps Script → Google Sheets
                            ↓
                         Twilio
```

**NO Python backend needed!** Just the Node.js proxy that you already have.

---

## Step-by-Step (10 minutes total)

### ✅ Step 1: Deploy Node.js Proxy to Render (5 min)

1. **Go to Render**: https://render.com
2. **Sign up** with GitHub (free, no credit card)
3. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Select repository: `gilbert-baidya/gpbc-contact-llm`
   - Settings:
     ```
     Name: gpbc-proxy
     Region: Oregon (US West)
     Branch: main
     Root Directory: (leave blank)
     Runtime: Node
     Build Command: npm install
     Start Command: node server.js
     Plan: Free
     ```

4. **Add Environment Variables**:
   ```
   GPBC_API_KEY = (your Google Apps Script API key)
   PORT = 10000
   NODE_ENV = production
   ```

5. **Click "Create Web Service"** and wait 2 minutes

6. **Copy your URL**: `https://gpbc-proxy.onrender.com` (or similar)

---

### ✅ Step 2: Connect Netlify to Your Proxy (3 min)

1. **Go to Netlify**: https://app.netlify.com
2. **Open your site**: gpbc-contact
3. **Go to Settings**:
   - Click "Site settings"
   - Click "Environment variables"
   - Click "Add a variable"

4. **Add variable**:
   ```
   Key: VITE_PROXY_URL
   Value: https://gpbc-proxy.onrender.com
   ```
   (Use YOUR Render URL from Step 1)

5. **Trigger redeploy**:
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Clear cache and deploy site"

6. **Wait 2 minutes** for deployment

---

### ✅ Step 3: Test Your App (2 min)

1. **Open your Netlify site**: https://gpbc-contact.netlify.app

2. **Test Dashboard**:
   - ⏳ First load may take 30-60 seconds (Render waking up)
   - ✅ Should show statistics

3. **Test Contacts**:
   - ✅ Should load from Google Sheets
   - ✅ Try selecting "All Men" or "All Women"
   - ✅ Search should work

4. **Test Messaging**:
   - Select contacts
   - Click "Send Message"
   - Choose template
   - Send SMS
   - ✅ Verify delivery on phone

---

## 🎯 What You Get

✅ **Fully online** - Access from anywhere
✅ **Free hosting** - $0/month infrastructure
✅ **Same as localhost** - Exact same code
✅ **Auto-deploy** - Push to GitHub → Auto-updates
✅ **Secure** - HTTPS everywhere
✅ **Scalable** - Handles 750 hours/month free

---

## 🐌 Performance Note

**First request after 15 minutes**: 30-60 seconds (Render waking up)
**All other requests**: Fast (<1 second)

**To fix slow first load** (optional):
- Set up UptimeRobot (see PROXY_DEPLOYMENT_GUIDE.md)
- OR upgrade to Render paid tier ($7/month for instant response)

---

## 🔧 Troubleshooting

### "Cannot connect to server"
- Check Render dashboard: Is service "Live" (green)?
- Check Render logs: Dashboard → Your Service → Logs
- Test proxy directly: Visit `https://your-proxy.onrender.com/health`

### "Statistics not loading"
- Check `GPBC_API_KEY` in Render environment variables
- Test Google Apps Script directly in browser

### "CORS error"
- Make sure Netlify URL is in `server.js` corsOptions (already done ✅)

---

## 📱 Share With Your Team

Once working, share this URL: **https://gpbc-contact.netlify.app**

**Access Control**:
- Anyone with URL can view (UI loads)
- Only you can send messages (Twilio credentials secured)
- Contact data in your Google Sheets (you control access)

---

## 🔄 How to Update

**Update UI** (frontend changes):
```bash
git add frontend/
git commit -m "Update UI"
git push
# Netlify auto-deploys in 2 minutes
```

**Update proxy** (server.js changes):
```bash
git add server.js
git commit -m "Update proxy"
git push
# Render auto-deploys in 3 minutes
```

**Update contacts**:
- Just edit Google Sheets directly
- Changes appear immediately

---

## 📊 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Netlify | $0 | 100GB bandwidth/month |
| Render | $0 | 750 hours/month, sleeps after 15min |
| Google Sheets | $0 | Unlimited contacts |
| Google Apps Script | $0 | 20,000 calls/day |
| Twilio | ~$0.0075/SMS | Only pay for messages sent |

**Total**: $0/month + SMS costs

---

## 🎉 Success!

Your app is now fully online with:
- ✅ Beautiful UI on Netlify
- ✅ Node.js proxy on Render
- ✅ Google Sheets as database
- ✅ Twilio for messaging
- ✅ Auto-deployment from GitHub
- ✅ Zero monthly costs

**No Python backend needed. No complex setup. Just works!**

---

**Next**: See `PROXY_DEPLOYMENT_GUIDE.md` for detailed troubleshooting and advanced configuration.
