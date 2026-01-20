# GPBC Contact System - Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### **Step 1: Deploy Backend (Node.js Proxy Server)**

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy Backend from root directory**:
   ```bash
   cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
   vercel
   ```

3. **Follow Vercel prompts**:
   - Set up and deploy? **Yes**
   - Which scope? **Select your account**
   - Link to existing project? **No**
   - Project name? **gpbc-backend** (or your choice)
   - Directory? **./** (press Enter)
   - Override settings? **No**

4. **Add Environment Variable**:
   - Go to your Vercel dashboard
   - Select the **gpbc-backend** project
   - Go to **Settings** → **Environment Variables**
   - Add:
     ```
     Name: GPBC_API_KEY
     Value: AKfycbwGH3V_VNPR1GvWR4EBrDwAGdS2DT5x7kvMnVAi6s0KJt2OVU8NcQy08xFk5a94P9EY
     ```
   - Click **Save**

5. **Redeploy to apply environment variable**:
   ```bash
   vercel --prod
   ```

6. **Copy your backend URL** (e.g., `https://gpbc-backend-abc123.vercel.app`)

---

### **Step 2: Deploy Frontend (React App)**

1. **Create production environment file**:
   ```bash
   cd frontend
   ```
   
   Create `frontend/.env.production` with your Vercel backend URL:
   ```
   VITE_PROXY_URL=https://gpbc-backend-abc123.vercel.app
   ```

2. **Deploy Frontend**:
   ```bash
   vercel
   ```

3. **Follow Vercel prompts**:
   - Set up and deploy? **Yes**
   - Which scope? **Select your account**
   - Link to existing project? **No**
   - Project name? **gpbc-frontend** (or your choice)
   - Directory? **./frontend** (should auto-detect)
   - Override settings? **No**

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

5. **Your frontend will be live!** (e.g., `https://gpbc-frontend-xyz789.vercel.app`)

---

## 🔧 Configuration Files Created

### Root `vercel.json` (Backend)
Already created! Configures Node.js backend deployment.

### Frontend `vercel.json` (Frontend)
Already exists! Configures React SPA routing.

---

## 🧪 Testing Your Deployment

### Test Backend:
```bash
# Replace with your actual URL
curl https://gpbc-backend-abc123.vercel.app/health
# Should return: {"status":"healthy","timestamp":"..."}

curl https://gpbc-backend-abc123.vercel.app/api/contacts
# Should return: JSON array of contacts
```

### Test Frontend:
Open your frontend URL in a browser and verify:
- ✅ Dashboard loads
- ✅ Contacts page displays Google Sheets data
- ✅ Messaging page works
- ✅ No CORS errors in console

---

## 📝 Environment Variables Summary

### Backend (Vercel Dashboard):
```
GPBC_API_KEY=AKfycbwGH3V_VNPR1GvWR4EBrDwAGdS2DT5x7kvMnVAi6s0KJt2OVU8NcQy08xFk5a94P9EY
```

### Frontend `.env.production`:
```
VITE_PROXY_URL=https://your-backend-url.vercel.app
```

### Local Development `.env.local`:
```
VITE_PROXY_URL=http://localhost:3001
```

---

## 🎯 Alternative: Deploy Both with One Command

You can also deploy from the Vercel dashboard:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo: `gilbert-baidya/gpbc-contact-llm`
3. **For Backend**:
   - Root Directory: `./`
   - Add environment variable: `GPBC_API_KEY`
4. **For Frontend** (create second project):
   - Root Directory: `./frontend`
   - Add environment variable: `VITE_PROXY_URL` (after backend is deployed)

---

## 🔄 Update CORS After Deployment

After deploying frontend, update `server.js` CORS to include your production URL:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:3005',
    'https://gpbc-contact.netlify.app',
    'https://gpbc-frontend-xyz789.vercel.app'  // Add your Vercel frontend URL
  ],
  // ...
};
```

Then redeploy backend:
```bash
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
vercel --prod
```

---

## ✅ Success Checklist

- [ ] Backend deployed to Vercel
- [ ] Environment variable `GPBC_API_KEY` added
- [ ] Backend `/health` endpoint returns healthy
- [ ] Backend `/api/contacts` returns data
- [ ] Frontend `.env.production` created with backend URL
- [ ] Frontend deployed to Vercel
- [ ] Frontend loads and displays contacts
- [ ] CORS configured for production domain
- [ ] No console errors

---

## 🆘 Troubleshooting

### Backend returns 500 error:
- Check Vercel logs: `vercel logs`
- Verify `GPBC_API_KEY` is set in Vercel dashboard

### Frontend can't connect to backend:
- Verify `VITE_PROXY_URL` in `.env.production`
- Check CORS configuration in `server.js`
- Open browser console for detailed errors

### Build fails:
- Ensure all dependencies in `package.json`
- Try local build first: `npm run build`
- Check Vercel build logs

---

## 🎉 You're Done!

Your church contact system is now deployed and accessible worldwide!
