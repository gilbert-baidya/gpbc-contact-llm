# 🔐 Security Setup Guide

**Last Updated:** January 25, 2026  
**Status:** Critical Security Features Implemented

---

## ✅ Security Features Implemented in Code.gs

### 1. **Account Lockout Protection**
- ✅ 5 failed login attempts trigger 15-minute lockout
- ✅ Failed attempts counter tracked per user
- ✅ Automatic unlock after lockout period
- ✅ Clear error messages showing remaining attempts

### 2. **Audit Logging**
- ✅ All user actions logged to `Audit_Log` sheet
- ✅ Tracks: LOGIN_SUCCESS, LOGIN_FAILED, ACCOUNT_LOCKED, SMS_SENT, API_KEY_INVALID
- ✅ Includes timestamp, user email, action, and details

### 3. **Rate Limiting**
- ✅ SMS sending limited to 100 per hour per user
- ✅ Call sending limited to 50 per hour per user
- ✅ Login attempts limited to 10 per hour per user
- ✅ Rate limit tracking in `Rate_Limits` sheet
- ✅ Clear error messages when limits exceeded

### 4. **API Key Authentication**
- ✅ All GET requests require valid API key
- ✅ API key stored in Script Properties
- ✅ Invalid attempts logged to audit log
- ✅ Admin function to regenerate keys

---

## 🚀 Required Setup Steps

### Step 1: Generate API Key in Google Apps Script

1. Open your Google Apps Script editor
2. Find the function `generateNewAPIKey()`
3. Click **Run** ▶️
4. Check the **Execution log** (View → Logs or Ctrl+Enter)
5. Copy the generated API key (format: `gpbc_xxxxxxxxxxxxxxxxxxxxxxxx`)

**Example output:**
```
========================================
🔑 NEW API KEY GENERATED
========================================
API Key: gpbc_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
========================================
```

### Step 2: Add API Key to Frontend Environment

1. Open `frontend/.env` file
2. Add this line (replace with your actual key):
```bash
VITE_GOOGLE_API_KEY=gpbc_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

3. **IMPORTANT:** Never commit this to Git! (Already in .gitignore)

### Step 3: Update Frontend API Calls

Your frontend needs to include the API key in all requests to:
```
https://script.google.com/macros/s/AKfycbzDMKjMowjTPOpqvvPIiv7YjWNrCs-orCgUhRKlnD7iutv8zif7GcyUFYrVPlrZ8_51pQ/exec
```

**Updated URL format:**
```
https://script.google.com/macros/s/AKfycbzDMKjMowjTPOpqvvPIiv7YjWNrCs-orCgUhRKlnD7iutv8zif7GcyUFYrVPlrZ8_51pQ/exec?key=YOUR_API_KEY&action=getContacts
```

### Step 4: Restart Frontend Server

After adding the API key to `.env`:
```bash
cd frontend
npm run dev
```

---

## 🛡️ Security Features Reference

### Account Lockout

**How it works:**
- Failed login increments counter in Users sheet
- After 5 failed attempts → 15 minute lockout
- Lockout time stored in `LockedUntil` column
- Successful login resets counter

**Manual unlock:**
```javascript
// In Google Apps Script editor
function unlockUserAccount() {
  const emailToUnlock = 'user@gracepraise.church'; // ⚠️ EDIT THIS
  // ... rest of function
}
```

### Rate Limiting

**Current Limits:**
- **SMS:** 100 per hour per user
- **Calls:** 50 per hour per user  
- **Login:** 10 per hour per user

**How it works:**
- Tracks usage in `Rate_Limits` sheet
- 1-hour sliding window
- Returns remaining requests in API response
- Auto-resets after 1 hour

**Example API response with rate limit:**
```json
{
  "success": true,
  "sid": "SM1234...",
  "remainingRequests": 87,
  "resetTime": "2026-01-25T15:30:00Z"
}
```

### Audit Logging

**Logged Events:**
- `LOGIN_SUCCESS` - Successful user login
- `LOGIN_FAILED` - Failed login attempt
- `ACCOUNT_LOCKED` - Account locked due to failed attempts
- `ACCOUNT_UNLOCKED` - Manual admin unlock
- `SMS_SENT` - SMS successfully sent
- `SMS_SEND_FAILED` - SMS sending failed
- `API_KEY_INVALID` - Invalid API key used
- `API_KEY_REGENERATED` - New API key generated
- `RATE_LIMIT_EXCEEDED` - User exceeded rate limit

**View logs:**
```javascript
// In Google Apps Script editor
function viewAuditLog() {
  // Shows last 100 audit entries
}
```

### API Key Protection

**What's protected:**
- ✅ GET `/api?action=getContacts`
- ✅ GET `/api?action=getStats`
- ✅ GET `/api?action=getMessageHistory`
- ✅ GET `/api?action=personalizeMessage`
- ✅ GET `/api?action=improveMessage`
- ✅ GET `/api?action=translateMessage`

**Not protected (by design):**
- POST `/api?action=login` - Public endpoint
- POST `/api?action=register` - Public endpoint
- Twilio webhooks (validated by Twilio signature)

---

## 📊 Monitoring & Maintenance

### View Failed Login Attempts

1. Open your Google Sheet
2. Go to **Users** sheet
3. Check `FailedAttempts` and `LockedUntil` columns

### View Rate Limit Usage

1. Open your Google Sheet
2. Go to **Rate_Limits** sheet
3. See current usage per user

### View Audit Trail

1. Open your Google Sheet
2. Go to **Audit_Log** sheet
3. Or run `viewAuditLog()` in Apps Script

---

## 🔧 Admin Functions

### Generate New API Key
```javascript
function generateNewAPIKey() {
  // Generates new key and logs it
  // Old keys become invalid immediately
}
```

### Unlock User Account
```javascript
function unlockUserAccount() {
  const emailToUnlock = 'user@gracepraise.church'; // EDIT THIS
  // Resets failed attempts and removes lockout
}
```

### View Audit Log
```javascript
function viewAuditLog() {
  // Shows last 100 audit entries in Execution log
}
```

---

## ⚠️ Important Security Notes

### DO NOT:
- ❌ Commit `.env` file to Git
- ❌ Share API key in public repos
- ❌ Use same API key across environments (dev/prod)
- ❌ Share Google Apps Script editor access publicly

### DO:
- ✅ Rotate API key quarterly
- ✅ Monitor audit logs weekly
- ✅ Review rate limit usage monthly
- ✅ Keep backup of Script Properties (API keys)
- ✅ Use environment-specific API keys (dev vs prod)

---

## 🚨 Security Incident Response

### If API Key is Compromised:
1. Run `generateNewAPIKey()` immediately
2. Update frontend `.env` file
3. Review `Audit_Log` for suspicious activity
4. Check `Rate_Limits` for abuse patterns
5. Consider locking affected user accounts

### If Account is Compromised:
1. Lock account in Users sheet (set Active to 'No')
2. Review Audit_Log for actions by that user
3. Contact user to reset password
4. Run `unlockUserAccount()` after verification

---

## 📈 Next Security Enhancements

**Phase 2 (Optional):**
- [ ] Two-factor authentication (2FA)
- [ ] Password reset via email
- [ ] IP-based rate limiting
- [ ] Webhook signature validation
- [ ] Encrypted contact data at rest
- [ ] Session management with refresh tokens

---

## 📞 Support

For security issues or questions:
- **Admin:** admin@gracepraise.church
- **Pastor:** pastor@gracepraise.church

**Emergency Contact:** +1 (909) 763-0454
