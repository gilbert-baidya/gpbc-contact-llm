/**
 * Google Apps Script Service
 * Serverless backend for GPBC Contact System
 * Replaces Node.js and Python backends with Google Apps Script
 */

// Configuration from environment variables
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
export const TEST_PHONE = import.meta.env.VITE_TEST_PHONE || '';

// Debug logging
console.log('🌍 Environment:', import.meta.env.MODE);
console.log('📦 All env vars:', Object.keys(import.meta.env));
console.log('🔗 Google Script URL:', GOOGLE_SCRIPT_URL);
console.log('🔑 API Key configured:', !!GOOGLE_API_KEY);

if (!GOOGLE_SCRIPT_URL) {
  console.error('⚠️ VITE_GOOGLE_SCRIPT_URL is not set!');
  console.error('Available env vars:', import.meta.env);
}

export interface Contact {
  id: number;
  name: string;
  phone: string;
  city?: string;
  language: string;
  optIn: string;
  group?: string;
  active?: boolean;
  created_at?: string;
}

export interface Stats {
  totalContacts: number;
  optInCount: number;
  optOutCount: number;
  menCount: number;
  womenCount: number;
  youngAdultCount: number;
}

export interface BillingSummary {
  weeklyCost: number;
  monthlyCost: number;
  yearlyCost: number;
  lifetimeCost: number;
  messageCount: number;
  smsCount: number;
  mmsCount: number;
}

export interface DeliveryStats {
  totalMessages: number;
  delivered: number;
  sent: number;
  failed: number;
  queued: number;
  undelivered: number;
  successRate: number;
}

export interface Message {
  type: 'sms' | 'call';
  timestamp: string;
  to: string;
  from: string;
  message: string;
  status: string;
  sid: string;
  duration?: number;
}

export interface SendSMSResponse {
  success: boolean;
  sid?: string;
  status?: string;
  to?: string;
  from?: string;
  error?: string;
}

export interface MakeCallResponse {
  success: boolean;
  sid?: string;
  status?: string;
  to?: string;
  from?: string;
  error?: string;
}

export interface UploadFileResponse {
  success: boolean;
  mediaUrl?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
}

/**
 * Build URL with API key authentication
 */
function buildURL(action: string): string {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error('Google Apps Script URL is not configured. Please set VITE_GOOGLE_SCRIPT_URL in environment variables.');
  }
  if (!GOOGLE_API_KEY) {
    throw new Error('Google API Key is not configured. Please set VITE_GOOGLE_API_KEY in environment variables.');
  }
  return `${GOOGLE_SCRIPT_URL}?action=${action}&key=${GOOGLE_API_KEY}`;
}

/**
 * Fetch contacts from Google Sheets
 */
export async function fetchContacts(): Promise<Contact[]> {
  try {
    const url = buildURL('getContacts');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (data.status === 'unauthorized') {
      throw new Error('Invalid or missing API key');
    }
    
    // Handle both array response and object with contacts property
    const contacts = Array.isArray(data) ? data : (data.contacts || []);
    
    console.log(`✅ Fetched ${contacts.length} contacts from Google Sheets`);
    return contacts;
    
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    throw new Error(`Failed to fetch contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch statistics from Google Sheets
 */
export async function fetchStats(): Promise<Stats> {
  try {
    const url = buildURL('getStats');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (data.status === 'unauthorized') {
      throw new Error('Invalid or missing API key');
    }
    
    console.log('✅ Fetched stats from Google Sheets:', data);
    return data as Stats;
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    throw new Error(`Failed to fetch statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send SMS via Google Apps Script → Twilio (supports MMS with mediaUrls)
 */
export async function sendSMS(
  to: string, 
  message: string, 
  from?: string, 
  mediaUrls?: string[]
): Promise<SendSMSResponse> {
  try {
    const url = buildURL('sendSMS');
    
    console.log('📤 Sending SMS to:', to);
    console.log('📤 URL:', url);
    
    // Generate idempotency key for duplicate prevention
    const idempotencyKey = crypto.randomUUID();
    
    // Use a simple POST to avoid CORS preflight on Apps Script
    const formBody = new URLSearchParams({
      apiKey: GOOGLE_API_KEY,
      idempotencyKey: idempotencyKey,
      to,
      body: message,
      ...(from ? { from } : {}),
      ...(mediaUrls && mediaUrls.length > 0 ? { mediaUrls: JSON.stringify(mediaUrls) } : {})
    });

    console.log('Sending payload:', formBody.toString());

    const response = await fetch(url, {
      method: 'POST',
      body: formBody
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      console.error('HTTP error:', response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ ${mediaUrls?.length ? 'MMS' : 'SMS'} sent successfully:`, data);
    
    if (data.error) {
      console.error('❌ Message sending failed:', data.error);
      return { success: false, error: data.error };
    }
    
    return data as SendSMSResponse;
    
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Make voice call via Google Apps Script → Twilio
 */
export async function makeCall(to: string, message: string, from?: string): Promise<MakeCallResponse> {
  try {
    const url = buildURL('makeCall');
    
    console.log('📞 Making call to:', to);
    
    // Generate idempotency key for duplicate prevention
    const idempotencyKey = crypto.randomUUID();
    
    // Use a simple POST to avoid CORS preflight on Apps Script
    const formBody = new URLSearchParams({
      apiKey: GOOGLE_API_KEY,
      idempotencyKey: idempotencyKey,
      to,
      message,
      ...(from ? { from } : {})
    });

    const response = await fetch(url, {
      method: 'POST',
      body: formBody
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Call initiated successfully:', data);

    if (data.error) {
      console.error('❌ Call failed:', data.error);
      return { success: false, error: data.error };
    }
    
    return data as MakeCallResponse;
  } catch (error) {
    console.error('❌ Error making call:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Bulk send SMS to multiple contacts
 */
export async function bulkSendSMS(
  contacts: Contact[], 
  message: string,
  onProgress?: (completed: number, total: number, contact: Contact, result: SendSMSResponse) => void
): Promise<{ successful: number; failed: number; results: Array<{contact: Contact; result: SendSMSResponse}> }> {
  const results: Array<{contact: Contact; result: SendSMSResponse}> = [];
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    
    try {
      const result = await sendSMS(contact.phone, message);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      
      results.push({ contact, result });
      
      // Call progress callback
      if (onProgress) {
        onProgress(i + 1, contacts.length, contact, result);
      }
      
      // Wait 1 second between messages to avoid rate limits
      if (i < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      failed++;
      results.push({ 
        contact, 
        result: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
      
      if (onProgress) {
        onProgress(i + 1, contacts.length, contact, { success: false, error: 'Failed to send' });
      }
    }
  }
  
  console.log(`📊 Bulk SMS complete: ${successful} successful, ${failed} failed`);
  
  return { successful, failed, results };
}

/**
 * Bulk make calls to multiple contacts
 */
export async function bulkMakeCall(
  contacts: Contact[], 
  message: string,
  onProgress?: (completed: number, total: number, contact: Contact, result: MakeCallResponse) => void
): Promise<{ successful: number; failed: number; results: Array<{contact: Contact; result: MakeCallResponse}> }> {
  const results: Array<{contact: Contact; result: MakeCallResponse}> = [];
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    
    try {
      const result = await makeCall(contact.phone, message);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      
      results.push({ contact, result });
      
      // Call progress callback
      if (onProgress) {
        onProgress(i + 1, contacts.length, contact, result);
      }
      
      // Wait 2 seconds between calls to avoid rate limits
      if (i < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      failed++;
      results.push({ 
        contact, 
        result: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
      
      if (onProgress) {
        onProgress(i + 1, contacts.length, contact, { success: false, error: 'Failed to call' });
      }
    }
  }
  
  console.log(`📊 Bulk calls complete: ${successful} successful, ${failed} failed`);
  
  return { successful, failed, results };
}

/**
 * Get message history
 */
export async function getMessageHistory(): Promise<Message[]> {
  try {
    const url = buildURL('getMessageHistory');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    const messages = data.messages || [];
    console.log(`✅ Fetched ${messages.length} messages from history`);
    return messages;
    
  } catch (error) {
    console.error('❌ Error fetching message history:', error);
    return [];
  }
}

/**
 * Upload file to Google Drive for MMS support
 * Converts file to Base64 and sends to Google Apps Script
 * Returns mediaUrl for use in MMS messages
 */
export async function uploadFile(file: File): Promise<UploadFileResponse> {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Only JPEG, PNG, and PDF files are allowed. Got: ${file.type}`
      };
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: `File size exceeds 5MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      };
    }

    console.log('📤 Uploading file:', file.name, file.type, `${(file.size / 1024).toFixed(2)}KB`);

    // Convert file to Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const url = buildURL('uploadFile');

    // Send upload request
    const formBody = new URLSearchParams({
      apiKey: GOOGLE_API_KEY,
      fileName: file.name,
      mimeType: file.type,
      base64Data: base64Data
    });

    const response = await fetch(url, {
      method: 'POST',
      body: formBody
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error('❌ File upload failed:', data.error);
      return { success: false, error: data.error };
    }

    console.log('✅ File uploaded successfully:', data);
    return data as UploadFileResponse;

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get billing summary from Google Sheets
 * Returns aggregated SMS/MMS costs by period (weekly, monthly, yearly, lifetime)
 */
export async function getBillingSummary(): Promise<BillingSummary> {
  try {
    const response = await fetch(
      `${GOOGLE_SCRIPT_URL}?action=getBillingSummary&key=${GOOGLE_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch billing summary: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('Error fetching billing summary:', error);
    throw error;
  }
}

/**
 * Get delivery statistics from Google Sheets MESSAGE_STATUS
 * Returns delivery success rate and status breakdown
 */
export async function getDeliveryStats(): Promise<DeliveryStats> {
  try {
    const response = await fetch(
      `${GOOGLE_SCRIPT_URL}?action=getDeliveryStats&key=${GOOGLE_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch delivery stats: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    throw error;
  }
}

/**
 * Test connection to Google Apps Script
 */
export async function testConnection(): Promise<{success: boolean; message: string}> {
  try {
    const stats = await fetchStats();
    return {
      success: true,
      message: `Connected successfully! Found ${stats.totalContacts} total contacts.`
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}
