# Security Implementation Checklist

## 🎯 Quick Setup Guide

### Phase 1: Google Apps Script Setup (5 minutes)

- [ ] **Step 1:** Open Google Apps Script editor
- [ ] **Step 2:** Copy updated `Code.gs` to your script project
- [ ] **Step 3:** Save and deploy the script
- [ ] **Step 4:** Run `generateNewSecureAPIKey()` function
- [ ] **Step 5:** Copy the generated secure API key
- [ ] **Step 6:** Run `viewSecurityConfig()` to verify setup

**Expected Output:**
```
✅ JWT Secret: Configured
✅ API Key (Read-only): Configured  
✅ Secure API Key (Messaging): Configured
✅ Twilio SID: Configured
✅ Twilio Auth Token: Configured
✅ Twilio Phone: Configured
```

---

### Phase 2: Backend Configuration (3 minutes)

- [ ] **Step 1:** Add to backend `.env` file:
```env
SECURE_API_KEY=gpbc_secure_xxxxxxxxxxxxxx
```

- [ ] **Step 2:** Update backend API client to include secure key

**Example Backend Function:**
```typescript
// backend/services/messaging.ts
import { getSecureAPIKey } from '../config/env';

export const sendSMSViaGoogleScript = async (
  to: string, 
  message: string,
  token: string
) => {
  const response = await fetch(GOOGLE_SCRIPT_URL + '?action=sendSMS', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: getSecureAPIKey(), // From backend env
      token: token,
      idempotencyKey: uuidv4(),
      to: to,
      message: message
    })
  });
  
  return await response.json();
};
```

- [ ] **Step 3:** Restart backend server
- [ ] **Step 4:** Test messaging endpoint

---

### Phase 3: Frontend Updates (10 minutes)

- [ ] **Step 1:** Install UUID library
```bash
npm install uuid
npm install --save-dev @types/uuid
```

- [ ] **Step 2:** Update messaging API calls to include idempotencyKey

**Before (Insecure):**
```typescript
// ❌ Old code - REMOVE THIS
await fetch(url, {
  method: 'POST',
  body: JSON.stringify({ to, message })
});
```

**After (Secure):**
```typescript
// ✅ New code - USE THIS
import { v4 as uuidv4 } from 'uuid';

const sendMessage = async (to: string, message: string) => {
  const token = localStorage.getItem('authToken');
  const idempotencyKey = uuidv4();
  
  const response = await backendAPI.sendSMS({
    to,
    message,
    idempotencyKey
  });
  
  if (response.isDuplicate) {
    toast.warning('Message already sent');
    return response;
  }
  
  if (response.rateLimitExceeded) {
    toast.error('Rate limit exceeded. Please wait.');
    throw new Error(response.error);
  }
  
  return response;
};
```

- [ ] **Step 3:** Update error handling for new error types:
  - `isDuplicate` - Duplicate request
  - `rateLimitExceeded` - Rate limit hit
  - `error: 'Unauthorized'` - Invalid auth
  - `error: 'Forbidden'` - Insufficient role

- [ ] **Step 4:** Test messaging from frontend UI

---

### Phase 4: Testing (15 minutes)

#### Test 1: Authentication
- [ ] Login as admin user
- [ ] Verify token is stored
- [ ] Try sending SMS
- [ ] **Expected:** Success ✅

#### Test 2: Authorization
- [ ] Create a 'member' role user
- [ ] Login as member
- [ ] Try sending SMS
- [ ] **Expected:** "403 Forbidden - Only admin and pastor roles can send messages" ❌

#### Test 3: Idempotency
- [ ] Send SMS with message "Test 1"
- [ ] Note the idempotencyKey
- [ ] Immediately try sending again with same key
- [ ] **Expected:** "Duplicate request detected" ❌
- [ ] Wait 5 minutes and try again
- [ ] **Expected:** Success ✅

#### Test 4: Rate Limiting
- [ ] Send 5 SMS messages rapidly
- [ ] Check remaining requests in response
- [ ] **Expected:** remainingRequests decreases (100 → 99 → 98...)
- [ ] Continue until limit reached
- [ ] **Expected:** "Rate limit exceeded" ❌

#### Test 5: Invalid API Key
- [ ] Modify backend to send wrong API key
- [ ] Try sending SMS
- [ ] **Expected:** "401 Unauthorized - Invalid or missing API key" ❌

#### Test 6: Twilio Webhook
- [ ] Send SMS to your Twilio number
- [ ] Reply "YES" or "STOP"
- [ ] **Expected:** Webhook processes correctly
- [ ] Check Audit_Log for "TWILIO_WEBHOOK" events

---

### Phase 5: Monitoring Setup (5 minutes)

- [ ] **Step 1:** Open Google Sheets with your data
- [ ] **Step 2:** Verify these sheets exist:
  - `Users` - User accounts
  - `Audit_Log` - Security events
  - `Rate_Limits` - Usage tracking
  - `SMS_Log` - Message history (with new security fields)
  - `Call_Log` - Call history (with new security fields)

- [ ] **Step 3:** Review Audit_Log for security events:
```javascript
viewAuditLog()
```

- [ ] **Step 4:** Check rate limits for active users:
```javascript
viewUserRateLimits('admin@gracepraise.church')
```

- [ ] **Step 5:** Set up monitoring alerts (optional):
  - Email alert for >10 failed auth attempts/hour
  - Slack notification for rate limit exceeded
  - Daily security report

---

## 🔒 Security Verification

### Run These Commands in Apps Script:

```javascript
// 1. View security configuration
viewSecurityConfig()
// ✅ All items should show "Configured"

// 2. Check admin account security
testLoginDiagnostic()
// ✅ Should show successful login

// 3. View recent security events
viewAuditLog()
// ✅ Should show login and messaging events

// 4. Check rate limits
viewUserRateLimits('admin@gracepraise.church')
// ✅ Should show current usage

// 5. Generate secure API key (if not done)
generateNewSecureAPIKey()
// ⚠️ Store this in backend env immediately
```

---

## 📋 Pre-Deployment Checklist

### Google Apps Script
- [ ] Updated Code.gs deployed
- [ ] SECURE_API_KEY generated
- [ ] viewSecurityConfig() shows all ✅
- [ ] Twilio credentials configured
- [ ] Test functions run without errors

### Backend
- [ ] SECURE_API_KEY added to .env
- [ ] Backend restarted with new env
- [ ] Messaging API updated to use secure key
- [ ] Error handling updated for new error types
- [ ] Backend tests pass

### Frontend  
- [ ] UUID library installed
- [ ] All messaging calls updated with idempotencyKey
- [ ] Error handling added for duplicate/rate limit
- [ ] User role validation removed from frontend (server handles it)
- [ ] Frontend tests pass

### Testing
- [ ] Admin can send SMS ✅
- [ ] Pastor can send SMS ✅
- [ ] Member cannot send SMS ✅
- [ ] Duplicate requests rejected ✅
- [ ] Rate limits enforced ✅
- [ ] Invalid auth rejected ✅
- [ ] Twilio webhooks validated ✅

### Documentation
- [ ] Team briefed on new security features
- [ ] Backend env documented
- [ ] Troubleshooting guide shared
- [ ] Monitoring dashboard set up

---

## ⚠️ Common Issues & Solutions

### Issue: "Invalid or missing API key"
**Cause:** SECURE_API_KEY not configured or mismatched
**Fix:**
1. Run `generateNewSecureAPIKey()` in Apps Script
2. Copy key to backend `.env`
3. Restart backend

### Issue: "Valid authentication token required"
**Cause:** Token not included or expired
**Fix:**
1. Check localStorage has 'authToken'
2. Login again if expired
3. Verify token included in POST body

### Issue: "Only admin and pastor roles can send messages"
**Cause:** User doesn't have required role
**Fix:**
1. Check user role in Users sheet
2. Update role if needed
3. Login again to refresh token

### Issue: "Duplicate request detected"
**Cause:** Same idempotencyKey sent twice
**Fix:**
1. Generate new UUID for each request
2. Don't retry with same key
3. If legitimate, run `clearIdempotencyCache()`

### Issue: "Rate limit exceeded"
**Cause:** Too many requests in time window
**Fix:**
1. Check limits: `viewUserRateLimits(email)`
2. Wait for window to expire
3. Increase limits if needed (edit Code.gs)

---

## 🎉 Post-Deployment

### Day 1
- [ ] Monitor Audit_Log for security events
- [ ] Check Rate_Limits for unusual patterns
- [ ] Verify users can send messages successfully
- [ ] Address any error reports immediately

### Week 1
- [ ] Review security metrics
- [ ] Adjust rate limits if needed
- [ ] Optimize idempotency window (5 min default)
- [ ] Gather user feedback

### Month 1
- [ ] Rotate SECURE_API_KEY
- [ ] Review and archive old audit logs
- [ ] Analyze rate limit patterns
- [ ] Plan additional security enhancements

---

## 🔐 Security Maintenance Schedule

### Weekly
- [ ] Review Audit_Log for suspicious activity
- [ ] Check failed authentication attempts
- [ ] Verify rate limits are appropriate

### Monthly
- [ ] Rotate SECURE_API_KEY
- [ ] Review user roles and permissions
- [ ] Archive old logs
- [ ] Test security features

### Quarterly
- [ ] Full security audit
- [ ] Update dependencies
- [ ] Review and update policies
- [ ] Staff security training

---

## 📞 Support Contacts

- **Technical Issues:** Run `viewAuditLog()` for diagnostics
- **Security Incidents:** Check Audit_Log immediately
- **Emergency:** Run `viewSecurityConfig()` to verify setup

---

**Implementation Date:** _________________

**Verified By:** _________________

**Status:** 
- [ ] In Progress
- [ ] Testing
- [ ] Complete ✅

---

**Last Updated:** February 18, 2026
