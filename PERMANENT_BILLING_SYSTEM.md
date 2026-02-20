# Permanent SMS/MMS Billing System

## Overview
Implemented a finance-grade permanent billing tracking system using Google Sheets to replace localStorage-based cost tracking. This provides a complete audit trail for all SMS/MMS costs with accurate Twilio pricing.

## Implementation Date
January 2025

---

## Backend Changes (Code.gs)

### 1. MESSAGE_BILLING Sheet Structure
**Location**: Lines ~48 in Code.gs
**Purpose**: Permanent storage for all SMS/MMS billing records

**11 Columns**:
1. **Timestamp** - When message was sent (format: MM/DD/YYYY HH:MM:SS)
2. **UserEmail** - Email of user who sent the message
3. **Recipient** - Phone number recipient
4. **MessageType** - "SMS" or "MMS"
5. **Segments** - Number of SMS segments (1 for MMS)
6. **MediaCount** - Number of media attachments (0 for SMS)
7. **CostPerRecipient** - Cost per message (currency format)
8. **TotalCost** - Total cost (currently same as CostPerRecipient)
9. **TwilioSID** - Twilio message SID for reference
10. **Status** - Message status from Twilio
11. **IdempotencyKey** - Unique key to prevent duplicate billing

**Sheet Configuration**:
- Header row with bold text, white background, frozen
- Currency formatting on columns G:H (CostPerRecipient, TotalCost)
- Auto-created if doesn't exist when first billing record is logged

### 2. New Functions

#### logMessageBilling(data)
**Location**: Lines ~2242-2310
**Purpose**: Log billing record to MESSAGE_BILLING sheet
**Parameters**:
```javascript
{
  userEmail: string,
  recipient: string,
  messageType: 'SMS' | 'MMS',
  segments: number,
  mediaCount: number,
  costPerRecipient: number,
  twilioSID: string,
  status: string,
  idempotencyKey: string
}
```

**Features**:
- Creates MESSAGE_BILLING sheet if doesn't exist
- Prevents duplicate billing using idempotencyKey
- Non-blocking error handling (logs error but doesn't throw)
- Timestamp format: MM/DD/YYYY HH:MM:SS

#### calculateMessageCost(messageType, segments, isUnicode)
**Location**: Lines ~2312-2325
**Purpose**: Calculate cost based on message type and segments
**Pricing**:
- MMS: $0.02 per message (flat rate)
- SMS (GSM/7-bit): $0.0083 per segment
- SMS (Unicode/UCS-2): $0.0166 per segment

**Returns**: Number (cost in USD)

#### getBillingSummaryFromSheet()
**Location**: Lines ~2327-2410
**Purpose**: Aggregate billing data by time period
**Returns**:
```javascript
{
  weeklyCost: number,      // Last 7 days
  monthlyCost: number,     // Last 30 days
  yearlyCost: number,      // Last 365 days
  lifetimeCost: number,    // All time
  messageCount: number,    // Total messages
  smsCount: number,        // SMS messages only
  mmsCount: number        // MMS messages only
}
```

**Date Calculations**:
- weekAgo: Current time - 7 days
- monthAgo: Current time - 30 days
- yearAgo: Current time - 365 days

### 3. Modified Functions

#### sendTwilioMessage(to, body, mediaUrls, billingData)
**Location**: Lines ~123-268
**Changes**:
- Added 4th parameter: `billingData` (optional)
- Billing data structure:
  ```javascript
  {
    userEmail: string,
    idempotencyKey: string,
    segments: number,
    isUnicode: boolean
  }
  ```
- Extracts billing metadata:
  - messageType: 'MMS' if mediaUrls present, else 'SMS'
  - mediaCount: Number of media attachments
  - segments: From billingData parameter
  - isUnicode: From billingData parameter
- Calculates costPerRecipient using `calculateMessageCost()`
- **Finance Safety**: Only logs billing on successful Twilio response (200/201 status)
- Calls `logMessageBilling()` after successful send

#### doGet(e)
**Location**: Line ~859
**Changes**:
- Added new case: `'getBillingSummary'`
- Endpoint: `?action=getBillingSummary&key=<API_KEY>`
- Returns: `jsonResponse(getBillingSummaryFromSheet())`
- Protected by existing API key verification

---

## Frontend Changes

### 1. googleAppsScriptService.ts

#### New Interface: BillingSummary
**Location**: Lines ~42-50
```typescript
export interface BillingSummary {
  weeklyCost: number;
  monthlyCost: number;
  yearlyCost: number;
  lifetimeCost: number;
  messageCount: number;
  smsCount: number;
  mmsCount: number;
}
```

#### New Function: getBillingSummary()
**Location**: Lines ~510-540
**Purpose**: Fetch billing summary from Google Sheets via API
**Returns**: Promise<BillingSummary>
**Endpoint**: `GET ${GOOGLE_SCRIPT_URL}?action=getBillingSummary&key=${GOOGLE_API_KEY}`

**Error Handling**:
- Throws on HTTP errors
- Throws on API errors
- Logs errors to console

### 2. DashboardPage.tsx

#### Updated Imports
**Changes**:
- Added `getBillingSummary` and `BillingSummary` from googleAppsScriptService
- Removed `getCostSummary` and `CostTrackerData` from costTracker
- Kept budget constants: `WEEKLY_BUDGET`, `MONTHLY_BUDGET`, `YEARLY_BUDGET`

#### Updated State
**Before**: `CostTrackerData | null`
**After**: `BillingSummary | null`

#### Updated useEffect
**Before**: 
- Called `getCostSummary()` from localStorage
- Updated every 10 seconds

**After**:
- Calls `getBillingSummary()` API from Google Sheets
- Updates every 30 seconds (less frequent to reduce API calls)
- Non-blocking error handling (fails silently on errors)

**Benefits**:
- Server-based data instead of localStorage
- Permanent audit trail
- Accurate across all devices/browsers
- No data loss on localStorage clear

---

## Budget Limits

### Current Settings
**Source**: `frontend/src/services/costTracker.ts`

| Period | Limit |
|--------|-------|
| Weekly | $25 |
| Monthly | $100 |
| Yearly | $1000 |

### Visual Indicators (Dashboard & MessagingPage)
- **Green**: < 80% of budget
- **Orange**: 80-100% of budget
- **Red**: > 100% of budget

---

## Twilio Pricing

### SMS Pricing
| Type | Cost per Segment | Character Limit per Segment |
|------|-----------------|----------------------------|
| GSM-7 (English) | $0.0083 | 160 characters (first), 153 (subsequent) |
| UCS-2 (Unicode/Emoji) | $0.0166 | 70 characters (first), 67 (subsequent) |

### MMS Pricing
| Type | Cost per Message |
|------|-----------------|
| MMS (with media) | $0.02 |

**Note**: MMS counted as 1 segment regardless of text length.

---

## Finance Safety Features

### 1. Duplicate Prevention
- **Method**: IdempotencyKey (UUID v4)
- **Check**: Before appending to MESSAGE_BILLING sheet
- **Behavior**: Silently skips duplicate records
- **Location**: logMessageBilling() function

### 2. Only Log on Success
- **Trigger**: Twilio response status 200 or 201
- **Prevents**: Billing for failed messages
- **Location**: sendTwilioMessage() function, lines ~260-268

### 3. Non-Blocking Logging
- **Method**: try-catch around all billing/audit logging
- **Behavior**: Logs error but doesn't interrupt message sending
- **Critical**: Message delivery > billing logging

### 4. Accurate Cost Calculation
- **Function**: calculateMessageCost()
- **Inputs**: messageType, segments, isUnicode
- **Validation**: Uses exact Twilio pricing structure

---

## API Endpoints

### getBillingSummary
**Method**: GET
**URL**: `${GOOGLE_SCRIPT_URL}?action=getBillingSummary&key=${API_KEY}`
**Authentication**: API Key required (VITE_GOOGLE_API_KEY)
**Response**:
```json
{
  "weeklyCost": 12.45,
  "monthlyCost": 45.67,
  "yearlyCost": 234.89,
  "lifetimeCost": 567.89,
  "messageCount": 1234,
  "smsCount": 1000,
  "mmsCount": 234
}
```

**Error Response**:
```json
{
  "error": "Error message here"
}
```

---

## Testing Checklist

### Backend Testing
- [ ] Deploy updated Code.gs to Google Apps Script
- [ ] Verify MESSAGE_BILLING sheet is created on first billing log
- [ ] Send test SMS (GSM) - verify billing record appears
- [ ] Send test SMS (Unicode) - verify correct pricing ($0.0166/segment)
- [ ] Send test MMS - verify correct pricing ($0.02)
- [ ] Send same message twice with same idempotencyKey - verify no duplicate
- [ ] Test getBillingSummary endpoint - verify aggregation accuracy
- [ ] Verify date filtering (weekly, monthly, yearly)

### Frontend Testing
- [ ] Dashboard loads billing summary on mount
- [ ] Dashboard updates billing summary every 30 seconds
- [ ] Cost cards show correct values (weekly, monthly, yearly, lifetime)
- [ ] Progress bars display correct percentages
- [ ] Color coding works (green/orange/red)
- [ ] Error handling works if API fails (silent fail)

### Integration Testing
- [ ] Send message from MessagingPage
- [ ] Verify billing appears in MESSAGE_BILLING sheet
- [ ] Refresh DashboardPage - verify cost updates
- [ ] Test across different browsers (data consistent)
- [ ] Clear localStorage - verify data still loads from server

---

## Migration from LocalStorage

### Old System (costTracker.ts)
- **Storage**: Browser localStorage
- **Key**: `gpbc_cost_tracker`
- **Persistence**: Per-browser only
- **Reset**: Automatic (weekly, monthly, yearly)
- **Limitations**: 
  - Data loss on localStorage clear
  - Not synced across devices
  - No permanent audit trail

### New System (Google Sheets)
- **Storage**: MESSAGE_BILLING sheet in Google Sheets
- **Persistence**: Permanent
- **Sync**: Real-time across all devices
- **Audit Trail**: Complete history with timestamps
- **Benefits**:
  - Finance-grade records
  - Multi-device support
  - No data loss
  - Exportable for accounting

### Coexistence Strategy
**Current**: Both systems active
- costTracker.ts still used in MessagingPage for budget warnings
- DashboardPage uses server billing data
- **Future**: Can fully deprecate costTracker.ts once all components migrate

---

## Deployment Steps

### 1. Backend Deployment (Code.gs)
```bash
# 1. Open Google Apps Script Editor
# https://script.google.com

# 2. Open your GPBC Church Contact project

# 3. Replace Code.gs content with updated version

# 4. Save (Ctrl+S / Cmd+S)

# 5. Deploy as Web App
# Click "Deploy" > "New deployment"
# Description: "Added permanent billing system"
# Execute as: Me
# Who has access: Anyone
# Click "Deploy"

# 6. Copy new deployment URL (if changed)
```

### 2. Frontend Deployment
```bash
# 1. Ensure .env has correct values
# VITE_GOOGLE_SCRIPT_URL=<your_deployment_url>
# VITE_GOOGLE_API_KEY=<your_api_key>

# 2. Build frontend
cd frontend
npm run build

# 3. Deploy to hosting (Vercel/Netlify/etc)
# Or test locally:
npm run dev
```

### 3. Verification
```bash
# 1. Open DashboardPage
# 2. Check browser console for errors
# 3. Verify cost cards display data
# 4. Send test message from MessagingPage
# 5. Refresh DashboardPage - verify cost updated
# 6. Check MESSAGE_BILLING sheet in Google Sheets
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  MessagingPage.tsx                  DashboardPage.tsx        │
│  ├─ calculateCostBreakdown()       ├─ getBillingSummary()   │
│  ├─ handleSend()                   │   API call every 30s   │
│  └─ executeSend()                  └─ Display cost cards    │
│     └─ addCost() [localStorage]                             │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     googleAppsScriptService.ts                      │   │
│  │     └─ getBillingSummary()                          │   │
│  │        GET ?action=getBillingSummary&key=xxx        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│                 Google Apps Script (Code.gs)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  doGet(e)                                                    │
│  └─ case 'getBillingSummary':                               │
│     └─ getBillingSummaryFromSheet()                         │
│        ├─ Read MESSAGE_BILLING sheet                        │
│        ├─ Filter by date ranges                             │
│        └─ Return aggregated costs                           │
│                                                               │
│  sendTwilioMessage(to, body, mediaUrls, billingData)       │
│  ├─ calculateMessageCost()                                  │
│  ├─ Send to Twilio                                          │
│  └─ On success (200/201):                                   │
│     └─ logMessageBilling()                                  │
│        ├─ Check idempotencyKey for duplicates              │
│        └─ Append to MESSAGE_BILLING sheet                   │
│                                                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Google Sheets                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  MESSAGE_BILLING Sheet (11 columns)                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Timestamp | UserEmail | Recipient | MessageType | ... │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ 01/15/25  | user@x.c  | +1234... | SMS | 1 | 0 | ... │ │
│  │ 01/15/25  | user@x.c  | +1234... | MMS | 1 | 1 | ... │ │
│  │ ...                                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Future Enhancements

### 1. Cost Alerts
- Email notifications when budgets exceeded
- Daily/weekly cost reports
- Automatic budget alerts to admins

### 2. Advanced Reporting
- Cost by user (who sends most expensive messages)
- Cost by time of day/week
- Cost trends and forecasting
- Export to CSV/Excel for accounting

### 3. Budget Management
- Admin panel to adjust budgets
- Per-user budget limits
- Department/group budget tracking

### 4. Optimization
- Batch billing records (append multiple at once)
- Cache billing summary on frontend
- Reduce API calls with smarter refresh logic

### 5. Audit Features
- Billing dispute resolution
- Message retry tracking
- Failed message cost analysis

---

## Troubleshooting

### Issue: Billing Summary Returns Empty Data
**Symptoms**: Dashboard shows $0.00 for all costs
**Possible Causes**:
1. MESSAGE_BILLING sheet doesn't exist
2. No billing records logged yet
3. API key incorrect
4. Deployment not updated

**Solutions**:
1. Send test message to create first billing record
2. Check Code.gs deployment is latest version
3. Verify VITE_GOOGLE_API_KEY in .env matches Script Properties
4. Check browser console for API errors

### Issue: Duplicate Billing Records
**Symptoms**: Multiple records with same TwilioSID
**Possible Causes**:
1. IdempotencyKey not generated correctly
2. Duplicate check logic failing

**Solutions**:
1. Verify UUID v4 generation in frontend
2. Check logMessageBilling() duplicate check logic
3. Manually delete duplicate records from MESSAGE_BILLING

### Issue: Incorrect Cost Calculations
**Symptoms**: Costs don't match Twilio pricing
**Possible Causes**:
1. Wrong segment count
2. GSM vs Unicode detection incorrect
3. MMS not detected properly

**Solutions**:
1. Verify segment count in MessagingPage.calculateCostBreakdown()
2. Check Unicode detection logic (emoji, non-Latin chars)
3. Verify mediaUrls presence for MMS detection

### Issue: Dashboard Not Updating
**Symptoms**: Costs don't refresh after sending messages
**Possible Causes**:
1. 30-second interval not triggered
2. API call failing silently
3. Component unmounted before update

**Solutions**:
1. Check browser console for errors
2. Manually refresh page (Ctrl+R / Cmd+R)
3. Verify getBillingSummary() API endpoint works
4. Check Network tab for failed requests

---

## Contact & Support

### Documentation
- Main README: `/README.md`
- API Documentation: `/API_DOCUMENTATION.md`
- Security Guide: `/SECURITY.md`

### Related Files
- Backend: `/Code.gs` (lines 2242-2410 for billing)
- Frontend Service: `/frontend/src/services/googleAppsScriptService.ts`
- Dashboard: `/frontend/src/pages/DashboardPage.tsx`
- Cost Tracker: `/frontend/src/services/costTracker.ts` (legacy)

---

**Last Updated**: January 15, 2025
**Version**: 1.0
**Status**: ✅ Backend Complete, ✅ Frontend Complete, ⏳ Testing Pending
