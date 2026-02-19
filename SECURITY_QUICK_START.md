# 🚀 Quick Start - Security Implementation

## ⚡ 5-Minute Setup

### 1️⃣ Google Apps Script (2 minutes)
```javascript
// Open Apps Script Editor → Run these commands:

generateNewSecureAPIKey()
// Copy the output: gpbc_secure_xxxxxxxxxx...

viewSecurityConfig()
// Verify all items show ✅ Configured
```

### 2️⃣ Backend Setup (1 minute)
```bash
# Add to backend/.env:
SECURE_API_KEY=gpbc_secure_xxxxxxxxxx

# Restart backend
npm run dev
```

### 3️⃣ Frontend Update (2 minutes)
```bash
# Install UUID
npm install uuid

# Update messaging calls (see code below)
npm run dev
```

---

## 💻 Code Examples

### Frontend: Send SMS (New Secure Method)
```typescript
import { v4 as uuidv4 } from 'uuid';

const sendSMS = async (to: string, message: string) => {
  const token = localStorage.getItem('authToken');
  const idempotencyKey = uuidv4(); // New: Prevent duplicates
  
  const response = await fetch(BACKEND_API + '/sendSMS', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      message,
      idempotencyKey  // Required
    })
  });
  
  const result = await response.json();
  
  // Handle new error types
  if (result.isDuplicate) {
    console.warn('Message already sent');
    return result;
  }
  
  if (result.rateLimitExceeded) {
    throw new Error('Rate limit exceeded. Please wait.');
  }
  
  return result;
};
```

### Backend: Call Google Apps Script
```typescript
// backend/services/googleScript.ts

export const sendSMSViaGoogleScript = async (
  to: string,
  message: string,
  userToken: string
) => {
  const response = await fetch(GOOGLE_SCRIPT_URL + '?action=sendSMS', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: process.env.SECURE_API_KEY,  // From env
      token: userToken,                     // From frontend
      idempotencyKey: uuidv4(),            // Generate here
      to: to,
      message: message
    })
  });
  
  return await response.json();
};
```

---

## 🔒 Security Checklist

### ✅ Before Going Live
- [ ] Run `generateNewSecureAPIKey()` in Apps Script
- [ ] Add `SECURE_API_KEY` to backend `.env` (not frontend!)
- [ ] Update all sendSMS/makeCall calls with idempotencyKey
- [ ] Test with admin account (should work)
- [ ] Test with member account (should fail 403)
- [ ] Test duplicate request (should fail)
- [ ] Run `viewSecurityConfig()` - all should be ✅

### 🧪 Test Cases
```javascript
// 1. Valid request (should succeed)
sendSMS('+1234567890', 'Test') → 200 OK

// 2. Invalid API key (should fail)
sendSMS with wrong apiKey → 401 Unauthorized

// 3. Duplicate request (should fail)
sendSMS with same idempotencyKey twice → 400 Duplicate

// 4. Wrong role (should fail)
Login as 'member' and try sendSMS → 403 Forbidden

// 5. Rate limit (should fail eventually)
Send 101 SMS in 1 hour → 429 Rate Limit Exceeded
```

---

## 📊 Monitoring Commands

### Apps Script Console
```javascript
// View security status
viewSecurityConfig()

// Check user's rate limits
viewUserRateLimits('admin@gracepraise.church')

// View recent security events
viewAuditLog()

// Emergency: Clear duplicate detection
clearIdempotencyCache()
```

### Check Sheets
- **Audit_Log** - Security events
- **Rate_Limits** - Usage tracking
- **SMS_Log** - Message history (enhanced with user/role/idempotencyKey)
- **Users** - Account status

---

## ⚠️ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized - Invalid or missing API key` | Wrong/missing SECURE_API_KEY | Run `generateNewSecureAPIKey()`, update backend env |
| `401 Unauthorized - Valid authentication token required` | Missing/expired token | Login again, verify token in request |
| `403 Forbidden - Only admin and pastor roles` | User doesn't have required role | Check role in Users sheet, update if needed |
| `400 Duplicate request detected` | Same idempotencyKey sent twice | Generate new UUID for each request |
| `429 Rate limit exceeded` | Too many requests | Wait for reset time, or increase limits in Code.gs |

---

## 🔑 API Key Types

| Key | Purpose | Location | Exposed? |
|-----|---------|----------|----------|
| `JWT_SECRET` | Token signing | Apps Script Props | ❌ Never |
| `API_KEY` | Read-only operations | Apps Script Props | ⚠️ Can be in frontend |
| `SECURE_API_KEY` | Write operations (SMS/calls) | Apps Script Props | ❌ Backend only |
| `TWILIO_AUTH` | Webhook validation | Apps Script Props | ❌ Never |

---

## 📈 Rate Limits

### Per User (Hourly)
- 100 SMS
- 50 Calls
- 10 Login attempts

### System-Wide (Per Minute)
- 30 SMS
- 20 Calls

*Both limits enforced simultaneously*

---

## 🎯 Next Steps

1. **Immediate**
   - [ ] Complete setup steps above
   - [ ] Run all test cases
   - [ ] Monitor audit logs

2. **Week 1**
   - [ ] Review rate limit patterns
   - [ ] Gather user feedback
   - [ ] Optimize if needed

3. **Month 1**
   - [ ] Rotate SECURE_API_KEY
   - [ ] Review security metrics
   - [ ] Plan additional features

---

## 📚 Full Documentation

- **Setup Guide:** `SECURITY_IMPLEMENTATION_CHECKLIST.md`
- **Detailed Guide:** `SECURITY_HARDENING_GUIDE.md`
- **Summary:** `SECURITY_HARDENING_SUMMARY.md`

---

**Last Updated:** February 18, 2026  
**Security Level:** 🔐 Production Ready
