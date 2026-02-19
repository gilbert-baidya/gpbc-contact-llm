# File Upload API - Complete Guide

## 🎯 Overview

Secure file upload endpoint for MMS media attachments. Files are stored in Google Drive and made publicly accessible for Twilio MMS.

## 🔐 Security Features

| Feature | Implementation |
|---------|---------------|
| **API Key Auth** | Required `API_KEY` from Script Properties |
| **File Type Validation** | Whitelist: JPEG, PNG, PDF only |
| **Size Limit** | Maximum 5MB per file |
| **Base64 Validation** | Decoding error handling |
| **Public Access** | Automatic link sharing configuration |
| **Audit Logging** | All uploads/rejections logged |

## 📋 Setup Instructions

### 1. Create Upload Folder

Run this in Google Apps Script console:

```javascript
setupUploadFolder();
```

**Output:**
```
========================================
📁 UPLOAD FOLDER CREATED
========================================
Folder Name: GPBC_MMS_Uploads
Folder ID: 1a2b3c4d5e6f7g8h9i0j
Folder URL: https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j
✅ UPLOAD_FOLDER_ID has been saved to Script Properties
========================================
```

This automatically:
- Creates `GPBC_MMS_Uploads` folder in your Google Drive
- Saves `UPLOAD_FOLDER_ID` to Script Properties
- Configures folder permissions

### 2. Verify Configuration

```javascript
viewSecurityConfig();
```

Should show:
```
Upload Folder ID: ✅ Configured
```

## 📤 API Reference

### Endpoint

```
POST https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=uploadFile
```

### Request Format

**Content-Type:** `application/x-www-form-urlencoded`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKey` | string | ✅ Yes | API_KEY from Script Properties |
| `fileName` | string | ✅ Yes | Original filename (e.g., "photo.jpg") |
| `fileContent` | string | ✅ Yes | Base64-encoded file content |
| `mimeType` | string | ✅ Yes | MIME type (see allowed types below) |

### Allowed MIME Types

```javascript
'image/jpeg'       // .jpg, .jpeg
'image/png'        // .png
'application/pdf'  // .pdf
```

### Response Format

**Success (200):**
```json
{
  "success": true,
  "mediaUrl": "https://drive.google.com/uc?export=view&id=1a2b3c4d5e6f7g8h9i0j",
  "fileId": "1a2b3c4d5e6f7g8h9i0j",
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 245760
}
```

**Error Responses:**

```json
// Unauthorized
{
  "error": "Unauthorized: Invalid API Key",
  "success": false
}

// Invalid file type
{
  "error": "Invalid file type. Only JPEG, PNG, and PDF files are allowed.",
  "success": false
}

// File too large
{
  "error": "File size exceeds 5MB limit. File size: 6.25MB",
  "success": false
}

// Missing parameters
{
  "error": "Missing required parameters: fileName, fileContent, mimeType",
  "success": false
}

// Invalid Base64
{
  "error": "Invalid file content encoding. Must be Base64.",
  "success": false
}

// Folder not configured
{
  "error": "Server configuration error: Upload folder not configured",
  "success": false
}
```

## 💻 Frontend Integration

### TypeScript/JavaScript Example

```typescript
// File upload service
async function uploadFile(file: File): Promise<string> {
  // Read file as Base64
  const base64Content = await fileToBase64(file);
  
  // Remove data URL prefix if present
  const base64Data = base64Content.replace(/^data:.+;base64,/, '');
  
  const response = await fetch(
    `${GOOGLE_SCRIPT_URL}?action=uploadFile`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
        fileName: file.name,
        fileContent: base64Data,
        mimeType: file.type
      })
    }
  );
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result.mediaUrl;
}

// Helper: Convert File to Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Usage with SMS
async function sendMMSWithImage(to: string, message: string, imageFile: File) {
  try {
    // 1. Upload file to get media URL
    const mediaUrl = await uploadFile(imageFile);
    
    // 2. Send SMS with media URL
    const response = await fetch(
      `${GOOGLE_SCRIPT_URL}?action=sendSMS`,
      {
        method: 'POST',
        body: new URLSearchParams({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
          idempotencyKey: crypto.randomUUID(),
          to: to,
          body: message,
          mediaUrls: JSON.stringify([mediaUrl])
        })
      }
    );
    
    return await response.json();
  } catch (error) {
    console.error('Error sending MMS:', error);
    throw error;
  }
}
```

### React Component Example

```tsx
import React, { useState } from 'react';

function MMSUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Only JPEG, PNG, and PDF files are allowed');
      return;
    }
    
    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    
    setFile(selectedFile);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError('');
    
    try {
      const url = await uploadFile(file);
      setMediaUrl(url);
      alert('File uploaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Upload MMS Media</h2>
      
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={handleFileChange}
        className="mb-2"
      />
      
      {file && (
        <div className="mb-2">
          <p>Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
        </div>
      )}
      
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      
      {error && (
        <div className="mt-2 text-red-600">{error}</div>
      )}
      
      {mediaUrl && (
        <div className="mt-4">
          <p className="font-semibold">Media URL:</p>
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">
            {mediaUrl}
          </a>
        </div>
      )}
    </div>
  );
}
```

## 🧪 Testing

### 1. Test File Upload (cURL)

```bash
# Create test image (1x1 pixel PNG)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" > test_base64.txt

# Upload file
curl -X POST "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=uploadFile" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "apiKey=YOUR_API_KEY" \
  -d "fileName=test.png" \
  -d "fileContent=$(cat test_base64.txt)" \
  -d "mimeType=image/png"
```

### 2. Test Invalid API Key

```bash
curl -X POST "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=uploadFile" \
  -d "apiKey=invalid-key" \
  -d "fileName=test.png" \
  -d "fileContent=iVBORw0K..." \
  -d "mimeType=image/png"

# Expected: {"error":"Unauthorized: Invalid API Key","success":false}
```

### 3. Test File Too Large

```bash
# Create 6MB file (exceeds 5MB limit)
dd if=/dev/zero bs=1024 count=6144 | base64 > large_file.txt

curl -X POST "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=uploadFile" \
  -d "apiKey=YOUR_API_KEY" \
  -d "fileName=large.bin" \
  -d "fileContent=$(cat large_file.txt)" \
  -d "mimeType=application/octet-stream"

# Expected: {"error":"File size exceeds 5MB limit...","success":false}
```

### 4. Test Invalid MIME Type

```bash
curl -X POST "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=uploadFile" \
  -d "apiKey=YOUR_API_KEY" \
  -d "fileName=test.exe" \
  -d "fileContent=TVqQAAMAAAAEAAAA..." \
  -d "mimeType=application/x-msdownload"

# Expected: {"error":"Invalid file type. Only JPEG, PNG, and PDF files are allowed.","success":false}
```

## 📊 Monitoring

### Check Upload Logs

Open your Google Spreadsheet → **Audit_Log** sheet

Look for events:
- `FILE_UPLOADED` - Successful uploads
- `FILE_UPLOAD_REJECTED` - Rejected uploads (type/size)
- `FILE_UPLOAD_FAILED` - Upload errors

### View Upload Folder

```javascript
// In Apps Script console
const props = PropertiesService.getScriptProperties();
const folderId = props.getProperty('UPLOAD_FOLDER_ID');
const folder = DriveApp.getFolderById(folderId);
Logger.log('Folder URL: ' + folder.getUrl());
Logger.log('File count: ' + folder.getFiles().length);
```

### List Uploaded Files

```javascript
function listUploadedFiles() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('UPLOAD_FOLDER_ID');
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  
  Logger.log('========================================');
  Logger.log('📁 UPLOADED FILES');
  Logger.log('========================================');
  
  let count = 0;
  while (files.hasNext()) {
    const file = files.next();
    count++;
    Logger.log(`${count}. ${file.getName()} (${(file.getSize() / 1024).toFixed(2)} KB)`);
    Logger.log(`   URL: https://drive.google.com/uc?export=view&id=${file.getId()}`);
    Logger.log(`   Created: ${file.getDateCreated()}`);
  }
  
  Logger.log(`\nTotal files: ${count}`);
  Logger.log('========================================');
}
```

## 🔧 Troubleshooting

### Error: "Upload folder not configured"

**Solution:**
```javascript
// Run in Apps Script console
setupUploadFolder();
```

### Error: "Invalid upload folder ID"

**Possible causes:**
1. Folder was deleted from Drive
2. Script lost access to folder

**Solution:**
```javascript
// Re-create folder
setupUploadFolder();
```

### Files not accessible

**Check:**
1. File sharing is set to "Anyone with link"
2. URL format: `https://drive.google.com/uc?export=view&id=FILE_ID`

**Fix sharing:**
```javascript
function fixFileSharing(fileId) {
  const file = DriveApp.getFileById(fileId);
  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );
  Logger.log('✅ File sharing fixed');
}
```

### Large files failing

**Current limit:** 5MB

**To increase limit** (not recommended - Twilio MMS limit is ~5MB):
```javascript
// In handleUploadFile(), change:
const maxSizeBytes = 10 * 1024 * 1024; // 10MB
```

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] Run `setupUploadFolder()` in production script
- [ ] Verify `UPLOAD_FOLDER_ID` in Script Properties
- [ ] Test file upload with production API key
- [ ] Verify uploaded files are publicly accessible
- [ ] Test MMS with uploaded media URLs
- [ ] Monitor Audit_Log for upload events
- [ ] Document Drive folder location for team

### Environment Variables

**Frontend (.env):**
```bash
VITE_GOOGLE_API_KEY=gpbc_xxxxx...
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

**Script Properties:**
```
API_KEY = gpbc_xxxxx...
UPLOAD_FOLDER_ID = 1a2b3c4d5e6f7g8h9i0j
```

## 📈 Usage Statistics

### Track Upload Volume

```javascript
function getUploadStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const auditLog = ss.getSheetByName('Audit_Log');
  const data = auditLog.getDataRange().getValues();
  
  let uploadCount = 0;
  let totalBytes = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === 'FILE_UPLOADED') {
      uploadCount++;
      const details = JSON.parse(data[i][2]);
      totalBytes += details.sizeBytes || 0;
    }
  }
  
  Logger.log(`Total uploads: ${uploadCount}`);
  Logger.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  Logger.log(`Average size: ${(totalBytes / uploadCount / 1024).toFixed(2)} KB`);
}
```

## 🔐 Security Best Practices

1. **Rotate API Key Periodically**
   ```javascript
   generateNewAPIKey();
   ```

2. **Monitor Upload Folder Size**
   - Google Drive has storage limits
   - Consider periodic cleanup of old files

3. **Audit Upload Activity**
   - Review Audit_Log regularly
   - Watch for suspicious upload patterns

4. **Validate File Content**
   - Current implementation validates MIME type
   - Consider adding virus scanning for production

5. **Rate Limiting**
   - Consider adding rate limits for uploads
   - Prevent abuse from automated scripts

## 🎯 Next Steps

- [ ] Add file upload to messaging UI
- [ ] Implement image preview before upload
- [ ] Add progress indicator for large files
- [ ] Consider image compression before upload
- [ ] Add drag-and-drop file upload
- [ ] Implement file gallery/history view
- [ ] Add file deletion capability
