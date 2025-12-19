# API Documentation

## Base URL

```
http://localhost:8000
```

## Authentication

Currently no authentication required. For production, implement JWT tokens.

---

## Contacts

### List All Contacts

```http
GET /api/contacts
```

**Query Parameters:**
- `skip` (int, optional): Number of records to skip (default: 0)
- `limit` (int, optional): Maximum records to return (default: 100)
- `active_only` (bool, optional): Filter active contacts only (default: true)
- `search` (string, optional): Search by name or phone

**Response:**
```json
[
  {
    "id": 1,
    "sl_no": "1",
    "name": "John Doe",
    "address": "123 Main St",
    "city": "San Bernardino",
    "state_zip": "CA 92408",
    "phone": "909-123-4567",
    "preferred_language": "english",
    "active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": null
  }
]
```

### Get Single Contact

```http
GET /api/contacts/{contact_id}
```

### Create Contact

```http
POST /api/contacts
```

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "909-123-4567",
  "address": "123 Main St",
  "city": "San Bernardino",
  "state_zip": "CA 92408",
  "preferred_language": "english"
}
```

### Update Contact

```http
PUT /api/contacts/{contact_id}
```

**Request Body:** (all fields optional)
```json
{
  "name": "John Smith",
  "phone": "909-999-9999"
}
```

### Delete Contact

```http
DELETE /api/contacts/{contact_id}
```

Soft deletes by setting `active=false`.

### Import Contacts from CSV

```http
POST /api/contacts/import
```

**Form Data:**
- `file`: CSV file

**Response:**
```json
{
  "success": true,
  "imported": 80,
  "errors": null
}
```

---

## Messages

### Send Message

```http
POST /api/messages/send
```

**Request Body:**
```json
{
  "content": "Hello from church!",
  "message_type": "sms",
  "send_to_all": true,
  "scheduled_at": null
}
```

**Or send to specific contacts:**
```json
{
  "content": "Hello!",
  "message_type": "sms",
  "contact_ids": [1, 2, 3]
}
```

**Message Types:**
- `sms`: Text message
- `voice`: Voice call

**Response:**
```json
{
  "success": true,
  "message": "Queued 80 messages",
  "message_ids": [1, 2, 3, ...]
}
```

### List Messages

```http
GET /api/messages
```

**Query Parameters:**
- `skip` (int): Pagination offset
- `limit` (int): Max records
- `contact_id` (int): Filter by contact

**Response:**
```json
[
  {
    "id": 1,
    "contact_id": 1,
    "message_type": "sms",
    "content": "Hello!",
    "status": "sent",
    "scheduled_at": null,
    "sent_at": "2024-01-01T12:00:00Z",
    "twilio_sid": "SM123...",
    "error_message": null,
    "created_at": "2024-01-01T11:59:00Z"
  }
]
```

**Message Statuses:**
- `pending`: Not yet processed
- `queued`: In sending queue
- `sent`: Successfully sent
- `delivered`: Confirmed delivery
- `failed`: Sending failed

---

## Voice Calls

### Make Voice Call

```http
POST /api/calls/make
```

**Request Body:**
```json
{
  "contact_ids": [1, 2, 3],
  "message": "This is a test call"
}
```

**Or call a specific number:**
```json
{
  "phone_number": "+19091234567",
  "message": "Hello!"
}
```

### List Call Logs

```http
GET /api/calls
```

**Response:**
```json
[
  {
    "id": 1,
    "contact_id": 1,
    "caller_phone": "+19091234567",
    "caller_name": "John Doe",
    "direction": "outbound",
    "duration": 120,
    "conversation_summary": "User asked about service times. Informed about Sunday 10 AM service.",
    "language_detected": "en",
    "created_at": "2024-01-01T12:00:00Z"
  }
]
```

---

## Scheduled Reminders

### Create Reminder

```http
POST /api/reminders
```

**Weekly Reminder:**
```json
{
  "name": "Sunday Service",
  "message_content": "Reminder: Service today at 10 AM!",
  "message_type": "sms",
  "schedule_type": "weekly",
  "schedule_day": "sunday",
  "schedule_time": "09:00",
  "send_to_all": true
}
```

**One-Time Reminder:**
```json
{
  "name": "Christmas Service",
  "message_content": "Special Christmas service tomorrow!",
  "message_type": "sms",
  "schedule_type": "once",
  "schedule_date": "2024-12-24T10:00:00Z",
  "schedule_time": "09:00",
  "send_to_all": true
}
```

### List Reminders

```http
GET /api/reminders
```

**Query Parameters:**
- `active_only` (bool): Filter active reminders (default: true)

### Delete Reminder

```http
DELETE /api/reminders/{reminder_id}
```

---

## Statistics

### Get Statistics

```http
GET /api/statistics
```

**Response:**
```json
{
  "total_contacts": 80,
  "active_contacts": 78,
  "total_messages_sent": 250,
  "total_calls_made": 45,
  "scheduled_reminders": 3
}
```

---

## Twilio Webhooks

These endpoints are called by Twilio and should not be called directly.

### Inbound Call Handler

```http
POST /api/webhooks/twilio/voice-inbound
```

Called when someone calls your Twilio number.

### Voice Response Handler

```http
POST /api/webhooks/twilio/voice-response
```

Processes user speech and generates AI responses.

### Call Status Handler

```http
POST /api/webhooks/twilio/call-status
```

Updates call status and duration.

---

## Error Responses

All endpoints return standard error format:

```json
{
  "detail": "Error message here"
}
```

**Common Status Codes:**
- `200`: Success
- `400`: Bad request (invalid data)
- `404`: Resource not found
- `500`: Server error

---

## Rate Limits

No rate limits in development. For production, implement rate limiting based on your needs.

---

## Interactive API Documentation

FastAPI provides interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

You can test all endpoints directly from the browser!

---

## Example: Complete Workflow

### 1. Import Contacts

```bash
curl -X POST "http://localhost:8000/api/contacts/import" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@contacts.csv"
```

### 2. Send Welcome Message

```bash
curl -X POST "http://localhost:8000/api/messages/send" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Welcome to our church communication system!",
    "message_type": "sms",
    "send_to_all": true
  }'
```

### 3. Schedule Weekly Reminder

```bash
curl -X POST "http://localhost:8000/api/reminders" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sunday Service",
    "message_content": "Service today at 10 AM!",
    "message_type": "sms",
    "schedule_type": "weekly",
    "schedule_day": "sunday",
    "schedule_time": "09:00",
    "send_to_all": true
  }'
```

### 4. Check Statistics

```bash
curl "http://localhost:8000/api/statistics"
```

---

## Python Example

```python
import requests

API_BASE = "http://localhost:8000"

# Send SMS to all contacts
response = requests.post(
    f"{API_BASE}/api/messages/send",
    json={
        "content": "Hello from Python!",
        "message_type": "sms",
        "send_to_all": True
    }
)

print(response.json())
# Output: {"success": true, "message": "Queued 80 messages", ...}
```

## JavaScript Example

```javascript
const API_BASE = 'http://localhost:8000';

// Get all contacts
async function getContacts() {
  const response = await fetch(`${API_BASE}/api/contacts`);
  const contacts = await response.json();
  console.log(contacts);
}

// Send message
async function sendMessage(content) {
  const response = await fetch(`${API_BASE}/api/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: content,
      message_type: 'sms',
      send_to_all: true
    })
  });
  
  const result = await response.json();
  console.log(result);
}
```
