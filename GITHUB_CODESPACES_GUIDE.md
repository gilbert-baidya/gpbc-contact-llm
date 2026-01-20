# 🚀 GitHub Codespaces Deployment (100% FREE)

Deploy your Node.js proxy using GitHub Codespaces - **120 free hours/month!**

## Why GitHub Codespaces?

✅ **Completely Free** - 120 hours/month (enough for 24/7 with smart usage)
✅ **No Credit Card** - Uses your existing GitHub account
✅ **Always On** - Can run 24/7 (with tricks)
✅ **Fast Setup** - 2 minutes to deploy
✅ **Public URL** - Gets a public HTTPS URL automatically

---

## Quick Setup (2 minutes)

### Step 1: Push Codespaces Config

```bash
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
git add .devcontainer/
git commit -m "feat: Add GitHub Codespaces configuration"
git push origin main
```

### Step 2: Create Codespace

1. Go to your GitHub repo: https://github.com/gilbert-baidya/gpbc-contact-llm
2. Click green **"Code"** button
3. Click **"Codespaces"** tab
4. Click **"Create codespace on main"**
5. Wait 30 seconds for setup

### Step 3: Configure Environment

Once Codespace opens:

1. Create `.env` file in terminal:
```bash
cat > .env << 'EOF'
GPBC_API_KEY=your_actual_api_key_here
PORT=3001
NODE_ENV=production
EOF
```

2. Start the server:
```bash
node server.js
```

3. **Important**: Make port public
   - Look for "Ports" tab at bottom
   - Right-click port 3001
   - Select **"Port Visibility: Public"**

4. Copy your public URL (looks like: `https://xxx-3001.preview.app.github.dev`)

### Step 4: Update Netlify

1. Go to Netlify → Your site → Environment variables
2. Add: `VITE_PROXY_URL` = `https://xxx-3001.preview.app.github.dev` (your Codespace URL)
3. Redeploy

---

## Keeping Codespace Running 24/7

### Problem: 
Codespaces stop after 30 minutes of inactivity.

### Solution A: Use UptimeRobot (Recommended)

1. Sign up at https://uptimerobot.com (free)
2. Add monitor:
   - Type: HTTP(s)
   - URL: `https://your-codespace-url.preview.app.github.dev/health`
   - Interval: 5 minutes
3. This pings every 5 minutes to keep it alive

### Solution B: GitHub Actions Keep-Alive

I can create a GitHub Action that pings your Codespace every 10 minutes.

### Solution C: Forever Script

Add this to `package.json`:
```json
{
  "scripts": {
    "start": "node server.js",
    "forever": "while true; do node server.js; sleep 1; done"
  }
}
```

Run: `npm run forever`

---

## Cost Comparison

| Method | Monthly Cost | Setup Time | Sleeps? |
|--------|--------------|------------|---------|
| **GitHub Codespaces** | $0 (120hrs free) | 2 min | With tricks: No |
| Render | $0 (750hrs free) | 5 min | After 15 min |
| Fly.io | $0 (limited) | 8 min | No |
| Vercel | $0 | 10 min | No (serverless) |

---

## Option 2: Vercel Serverless (Also Free!)

Vercel can host your proxy as serverless functions:

### Setup:

1. Create `api/proxy.js`:
```javascript
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { action } = req.query;
  const GPBC_API_KEY = process.env.GPBC_API_KEY;
  const GPBC_API_URL = 'https://script.google.com/macros/s/AKfycbzDMKjMowjTPOpqvvPIiv7YjWNrCs-orCgUhRKlnD7iutv8zif7GcyUFYrVPlrZ8_51pQ/exec';
  
  try {
    const response = await fetch(`${GPBC_API_URL}?action=${action}&key=${GPBC_API_KEY}`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

2. Deploy to Vercel:
```bash
npm i -g vercel
vercel --prod
```

**Pros**: Never sleeps, instant response
**Cons**: Requires code restructuring

---

## Option 3: Glitch.com (Free & Simple)

Glitch provides free Node.js hosting:

1. Go to https://glitch.com
2. Click "New Project" → "Import from GitHub"
3. Paste: `https://github.com/gilbert-baidya/gpbc-contact-llm`
4. Add environment variables in `.env`
5. Glitch gives you URL: `https://your-project.glitch.me`

**Pros**: Free, easy, UI editor
**Cons**: Sleeps after 5 min (but wakes fast)

---

## My Recommendation

**For you**: Use **GitHub Codespaces** with UptimeRobot

**Why**:
- ✅ Already have GitHub account
- ✅ Zero additional signups
- ✅ 120 free hours = enough for testing
- ✅ Can keep alive with UptimeRobot
- ✅ No code changes needed
- ✅ 2-minute setup

**Alternative**: If you want "set and forget", use **Render** (5 min setup, we already created the guide)

---

## Quick Decision Tree

```
Do you want ZERO additional signups?
├─ YES → Use GitHub Codespaces (2 min)
└─ NO → Want fastest/easiest?
    ├─ YES → Use Render (5 min)
    └─ NO → Want never sleep?
        └─ Use Vercel serverless (10 min, needs code changes)
```

---

## What Do You Want Me To Do?

Choose one:

**A)** Set up GitHub Codespaces (push config, I'll guide you)
**B)** Set up Render (we already have the guide, just follow DEPLOYMENT_CHECKLIST.md)
**C)** Convert to Vercel serverless (I'll restructure code)
**D)** Set up Glitch.com (I'll create instructions)

**My suggestion**: Try **GitHub Codespaces** first (2 min), if you don't like it, switch to **Render** (5 min). Both are free and easy!

What do you prefer?
