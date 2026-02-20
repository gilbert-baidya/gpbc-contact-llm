# 🚀 QUICK DEPLOYMENT GUIDE

**Church Messaging System - Production-Grade Upgrade**  
**Deploy Time**: ~15 minutes

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [ ] Code.gs file ready (3,300+ lines)
- [ ] Frontend built and tested locally
- [ ] Script Properties configured (API_KEY, TWILIO_SID, TWILIO_AUTH, TWILIO_FROM, UPLOAD_FOLDER_ID, JWT_SECRET)
- [ ] Google Drive upload folder created
- [ ] Twilio account active with credits

---

## 📦 STEP 1: DEPLOY BACKEND (5 minutes)

### 1.1 Open Google Apps Script
```
https://script.google.com
→ Find "GPBC Church Contact" project
→ Open Code.gs file
```

### 1.2 Replace Code
```
1. Select ALL existing code (Ctrl+A / Cmd+A)
2. Paste new Code.gs content
3. Save (Ctrl+S / Cmd+S)
4. Wait for "Saved" confirmation
```

### 1.3 Deploy Web App
```
1. Click "Deploy" button (top right)
2. Select "New deployment"
3. Description: "Production upgrade Feb 2026"
4. Execute as: Me
5. Who has access: Anyone
6. Click "Deploy"
7. Authorize if prompted
8. Copy deployment URL
```

### 1.4 Verify Script Properties
```
Project Settings → Script Properties
Required properties:
- API_KEY
- TWILIO_SID
- TWILIO_AUTH
- TWILIO_FROM
- UPLOAD_FOLDER_ID
- JWT_SECRET
```

---

## 🌐 STEP 2: DEPLOY FRONTEND (5 minutes)

### 2.1 Update Environment Variables
```bash
# frontend/.env
VITE_GOOGLE_SCRIPT_URL=<paste_deployment_url_here>
VITE_GOOGLE_API_KEY=<your_api_key>
```

### 2.2 Build Production Bundle
```bash
cd frontend
npm run build
```

### 2.3 Deploy to Hosting

**Option A: Vercel**
```bash
vercel --prod
```

**Option B: Netlify**
```bash
netlify deploy --prod
```

**Option C: Manual Upload**
```
Upload contents of frontend/dist/ folder to your web host
```

---

## 🧪 STEP 3: SMOKE TESTS (5 minutes)

### 3.1 Test API Connection
```
1. Open production URL in browser
2. Go to Dashboard
3. Verify statistics load
4. Check browser console for errors
```

### 3.2 Test SMS Send
```
1. Go to Messaging page
2. Select test contact
3. Type message: "Test message"
4. Click Send
5. Verify success message
6. Check MESSAGE_BILLING sheet
7. Check MESSAGE_STATUS sheet
```

### 3.3 Test MMS Send
```
1. Go to Messaging page
2. Upload image (JPEG/PNG/PDF)
3. Verify file uploads successfully
4. Send MMS
5. Verify cost = $0.02 in dashboard
```

### 3.4 Test Billing Dashboard
```
1. Go to Dashboard
2. Verify "Messaging Cost Summary" card shows data
3. Verify "Message Delivery Statistics" card shows data
4. Check weekly/monthly/yearly costs
5. Verify success rate percentage
```

### 3.5 Test Compliance
```
1. Have test contact reply "STOP"
2. Verify contact OptIn changes to "NO" in Google Sheet
3. Try to send message to that contact
4. Verify error: "Cannot send to opted-out contact"
```

---

## 🎯 SUCCESS CRITERIA

### All Green? ✅
- [ ] Dashboard loads without errors
- [ ] SMS sends successfully
- [ ] MMS sends successfully
- [ ] Billing records appear in MESSAGE_BILLING sheet
- [ ] Delivery status appears in MESSAGE_STATUS sheet
- [ ] Cost summary displays on dashboard
- [ ] Delivery stats display on dashboard
- [ ] STOP compliance works (blocks opted-out contacts)
- [ ] Budget warnings appear when over budget
- [ ] Drag-drop file upload works

---

## 🆘 QUICK TROUBLESHOOTING

### Error: "Unauthorized"
→ Check API_KEY in Script Properties matches .env file

### Error: "Twilio credentials missing"
→ Verify TWILIO_SID, TWILIO_AUTH, TWILIO_FROM in Script Properties

### Billing shows $0.00
→ Send test message to create first billing record

### File upload fails
→ Run `setupUploadFolder()` in Code.gs, add UPLOAD_FOLDER_ID to Script Properties

### Dashboard not loading
→ Check browser console for CORS or API key errors

---

## 📞 DEPLOYMENT SUPPORT

### Documentation
- Full Guide: `/PRODUCTION_UPGRADE_COMPLETE.md`
- API Docs: `/API_DOCUMENTATION.md`
- Security: `/SECURITY.md`
- Billing: `/PERMANENT_BILLING_SYSTEM.md`

### Common Issues
- CORS errors → Configure allowed origins in Google Apps Script
- 401 Unauthorized → API key mismatch
- Sheet not created → Send first message to auto-create sheets

---

## 🎉 POST-DEPLOYMENT

### Immediate Actions
1. Test all features with real contacts
2. Monitor MESSAGE_BILLING for accuracy
3. Review delivery success rate (should be > 90%)
4. Set up monthly budget review calendar event

### First Week
1. Compare Twilio invoice to MESSAGE_BILLING totals
2. Review opted-out contacts list
3. Check for any failed deliveries
4. Collect user feedback on new features

### Ongoing Maintenance
- **Monthly**: Review billing accuracy, check delivery rate
- **Quarterly**: Archive old records, adjust budgets
- **Yearly**: Export financial records, security audit

---

## 🔒 SECURITY REMINDER

### After Deployment
- [ ] Enable 2FA on Google Account
- [ ] Enable 2FA on Twilio Account
- [ ] Restrict Script Properties access
- [ ] Monitor audit logs for unauthorized access
- [ ] Review opted-out contacts weekly

---

**🚀 DEPLOYMENT COMPLETE!**

Your church messaging system is now production-ready with enterprise-level features:
- ✅ Security hardening
- ✅ MMS support with HEIF
- ✅ Permanent billing tracking
- ✅ Budget protection
- ✅ Delivery analytics
- ✅ STOP/opt-out compliance

**Next**: Run smoke tests and monitor for 24 hours before full rollout.

---

**Deploy Date**: February 19, 2026  
**Version**: Production v2.0  
**Status**: ✅ READY
