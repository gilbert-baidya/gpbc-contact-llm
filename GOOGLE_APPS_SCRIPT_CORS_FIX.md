# 🔧 Google Apps Script CORS Fix - Deployment Instructions

## 🚨 Problem
CORS errors: "No 'Access-Control-Allow-Origin' header is present on the requested resource"

## ✅ Root Cause
Google Apps Script's `ContentService` doesn't support `.setHeader()` method. However, Google Apps Script web apps **automatically add CORS headers** when deployed with the correct settings.

## 📋 Step-by-Step Fix

### Step 1: Copy Updated Code.gs
1. Open your Google Apps Script editor: https://script.google.com
2. Find your "GPBC Contact System" project
3. Select **ALL text** in the editor (Ctrl+A / Cmd+A)
4. **Delete** all existing code
5. Copy **ALL content** from `Code.gs` in VS Code (currently open in your editor)
6. Paste into Google Apps Script editor (Ctrl+V / Cmd+V)
7. **Save** the project (Ctrl+S / Cmd+S or File → Save)

### Step 2: Deploy with Correct CORS Settings
1. Click the **"Deploy"** button (top right)
2. Select **"Manage deployments"**
3. Click the **pencil/edit icon** next to your active deployment
4. Click **"New version"** (this creates a fresh deployment)
5. **CRITICAL**: Verify these settings:
   - **Execute as**: "Me (your@email.com)" ← Your Google account
   - **Who has access**: "Anyone" ← NOT "Anyone with the link"
6. Click **"Deploy"**
7. Copy the new Web App URL (should be the same as before)

### Step 3: Important Notes
- The deployment URL should remain: `https://script.google.com/macros/s/AKfycbzDMKjMowjTPOpqvvPIiv7YjWNrCs-orCgUhRKlnD7iutv8zif7GcyUFYrVPlrZ8_51pQ/exec`
- If asked to authorize, click "Review Permissions" and authorize the app
- Google automatically adds these CORS headers when deployed as "Anyone":
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type
  ```

### Step 4: Clear Browser Cache
1. Hard refresh your browser:
   - **Windows/Linux**: Ctrl + Shift + R
   - **Mac**: Cmd + Shift + R
2. Or use DevTools:
   - Press F12 to open DevTools
   - Go to "Network" tab
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

### Step 5: Test the Fix
1. Navigate to: http://localhost:3006
2. Open browser console (F12)
3. Try to login
4. **Expected result**: No CORS errors, login succeeds

### Step 6: Verify API Endpoints
Test a direct API call in a new browser tab:
```
https://script.google.com/macros/s/AKfycbzDMKjMowjTPOpqvvPIiv7YjWNrCs-orCgUhRKlnD7iutv8zif7GcyUFYrVPlrZ8_51pQ/exec?action=getStats&key=gpbc_9a674b91852f45d385e577f9b3b7a345
```

Should return JSON data without errors.

## 🔍 What Was Fixed in Code.gs

### Before (TypeError):
```javascript
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')  // ❌ NOT SUPPORTED
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
```

### After (Fixed):
```javascript
function jsonResponse(obj) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
// ✅ Google Apps Script adds CORS headers automatically
```

## 🎯 Why This Works
Google Apps Script web apps deployed with "Anyone" access automatically include proper CORS headers in the HTTP response. The `.setHeader()` method is **not supported** in Apps Script's ContentService API, which is why the previous code caused a TypeError.

## 🆘 Troubleshooting

### If CORS errors persist:
1. Verify deployment is set to "Anyone" (not "Anyone with the link")
2. Make sure you clicked "New version" when redeploying
3. Clear browser cache completely
4. Check that the Web App URL in `frontend/.env` matches the deployed URL
5. Try testing in an incognito/private browser window

### If you see "Authorization required":
1. Click "Review Permissions"
2. Select your Google account
3. Click "Advanced" → "Go to [Project Name] (unsafe)"
4. Click "Allow"

### If you still see errors:
Share the exact error message from the browser console.

## ✅ Success Indicators
- No CORS errors in browser console
- Login works successfully
- Dashboard loads billing and delivery stats
- All API calls succeed
- Contacts table loads data

---

**Last Updated**: Ready for deployment
**Status**: Code fixed, awaiting redeployment
