# Google Apps Script Deployment Guide

## Overview
This guide walks you through deploying the updated Code.gs with OpenAI integration to Google Apps Script.

## What's Changed
✅ Added OpenAI API integration
✅ Added 3 new AI endpoints:
- `personalizeMessage` - Add names naturally to messages
- `improveMessage` - Get 3 AI-improved message suggestions
- `translateMessage` - Translate to Bengali/Hindi/Spanish

## Step-by-Step Deployment

### 1. Open Google Apps Script Editor
1. Go to your Google Sheet with GPBC contacts
2. Click **Extensions** → **Apps Script**
3. You should see your existing `Code.gs` file

### 2. Update Code.gs
1. Select all existing code in the editor (Ctrl+A / Cmd+A)
2. Copy the entire content from your local `Code.gs` file
3. Paste it into the Apps Script editor (replacing old code)
4. The new code includes:
   - `OPENAI_API_KEY` constant at the top
   - `callOpenAI()` function for API calls
   - Three new functions: `personalizeMessage()`, `improveMessage()`, `translateMessage()`
   - Updated `doGet()` to handle new actions

### 3. Deploy as Web App
1. Click the **Deploy** button (top right)
2. Select **New deployment**
3. Click the gear icon ⚙️ next to "Select type"
4. Choose **Web app**
5. Configure deployment:
   - **Description**: "GPBC AI Features - v2.0"
   - **Execute as**: **Me** (your email)
   - **Who has access**: **Anyone** (required for frontend to call)
6. Click **Deploy**
7. **IMPORTANT**: Copy the **Web app URL** - looks like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

### 4. Test Deployment
Test each endpoint using curl or browser:

#### Test Personalize
```bash
curl "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=personalizeMessage&message=Join%20us%20Sunday&name=John%20Smith"
```

Expected response:
```json
{
  "success": true,
  "personalized": "John, Join us Sunday"
}
```

#### Test Improve
```bash
curl "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=improveMessage&message=Join%20us%20Sunday"
```

Expected response:
```json
{
  "success": true,
  "suggestions": [
    "Join us this Sunday for worship! 🙏",
    "We'd love to see you Sunday! Join us for service.",
    "Sunday service awaits! Come worship with us."
  ]
}
```

#### Test Translate
```bash
curl "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=translateMessage&text=Join%20us%20Sunday&language=bn"
```

Expected response:
```json
{
  "success": true,
  "translated": "রবিবার আমাদের সাথে যোগ দিন",
  "language": "bn"
}
```

### 5. Update Frontend Configuration
Now update your frontend to use the Google Apps Script URL instead of localhost:8000.

#### Option A: Environment Variable (Recommended)
Create `frontend/.env`:
```env
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

#### Option B: Direct Configuration
Edit `frontend/src/api/backendApi.ts` and add:
```typescript
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

### 6. Update Frontend API Calls
You'll need to update these files to call Google Apps Script instead of Python backend:

**Files to modify:**
- `frontend/src/pages/MessagingPage.tsx` - Personalization logic
- `frontend/src/api/llmApi.ts` - API client functions

**Example changes in MessagingPage.tsx:**

**Before (Python backend):**
```typescript
const response = await fetch('http://localhost:8000/api/llm/personalize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: messageContent, contact_name: contact.name })
});
```

**After (Google Apps Script):**
```typescript
const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
const response = await fetch(
  `${scriptUrl}?action=personalizeMessage&message=${encodeURIComponent(messageContent)}&name=${encodeURIComponent(contact.name)}`
);
```

## Troubleshooting

### "Authorization required" error
- Make sure "Who has access" is set to **Anyone**
- Redeploy if needed

### "OpenAI API error"
- Check the API key is correctly copied in Code.gs
- Verify key is active at https://platform.openai.com/api-keys
- Check you have credits available

### "Script execution time exceeded"
- Google Apps Script has 6-minute timeout
- For bulk operations, process in smaller batches
- Consider adding delays between API calls

### CORS errors
- Google Apps Script automatically handles CORS for "Anyone" deployments
- No additional configuration needed

### Response format issues
- All responses are JSON with `success`, `error`, or result fields
- Check browser console for actual response
- Use `JSON.parse(response)` if getting string

## Cost Estimate

### OpenAI API Costs (GPT-3.5-turbo)
- **Personalize**: ~$0.002 per message ($2 per 1000)
- **Improve**: ~$0.003 per request ($3 per 1000)
- **Translate**: ~$0.002 per message ($2 per 1000)

### Example Monthly Cost (1000 messages)
- 1000 personalized messages: $2
- 100 improvement requests: $0.30
- 200 translations: $0.40
- **Total AI cost**: ~$3/month

### Hosting Costs
- Google Apps Script: **FREE** ✅
- Frontend (Vercel/Netlify): **FREE** ✅
- Twilio SMS: ~$8/month for 1000 messages
- **Total hosting**: $0/month (only pay for usage)

## Next Steps

1. ✅ Deploy Code.gs to Google Apps Script
2. ✅ Test all 3 endpoints
3. ⏭️ Update frontend to use Google Script URL
4. ⏭️ Remove Python backend dependency
5. ⏭️ Deploy frontend to Vercel/Netlify
6. ⏭️ Test end-to-end flow
7. ⏭️ Monitor OpenAI usage and costs

## Benefits of This Architecture

✅ **$0 hosting costs** - No server fees
✅ **Serverless** - Google manages infrastructure
✅ **Auto-scaling** - Handles traffic spikes automatically
✅ **Simple deployment** - Just update Code.gs and click Deploy
✅ **Integrated** - Already connected to Google Sheets
✅ **Reliable** - 99.9% uptime from Google

## Support

If you encounter issues:
1. Check Google Apps Script execution logs (View → Logs)
2. Test endpoints individually with curl
3. Verify OpenAI API key is active
4. Check frontend console for errors
5. Review this guide's troubleshooting section
