/**
 * Google Apps Script Service
 * Serverless backend for GPBC Church Contact System
 * Replaces Node.js and Python backends with Google Apps Script
 */

// Configuration from environment variables
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

if (!GOOGLE_SCRIPT_URL) {
  console.error('⚠️ VITE_GOOGLE_SCRIPT_URL is not set!');
}

if (!GOOGLE_API_KEY) {
  console.error('⚠️ VITE_GOOGLE_API_KEY is not set!');
}

console.log('🔗 Google Script URL:', GOOGLE_SCRIPT_URL);
console.log('🔑 API Key configured:', !!GOOGLE_API_KEY);

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

/**
 * Build URL without authentication (API key removed)
 */
function buildURL(action: string): string {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error('Google Apps Script URL is not configured. Please set VITE_GOOGLE_SCRIPT_URL in environment variables.');
  }
  return `${GOOGLE_SCRIPT_URL}?action=${action}`;
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
 * Send SMS via Google Apps Script → Twilio
 */
export async function sendSMS(to: string, message: string, from?: string): Promise<SendSMSResponse> {
  try {
    const url = buildURL('sendSMS');
    
    console.log('📤 Sending SMS to:', to);
    console.log('📤 URL:', url);
    
    // Use a simple POST to avoid CORS preflight on Apps Script
    const formBody = new URLSearchParams({
      to,
      message,
      ...(from ? { from } : {})
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
    console.log('✅ SMS sent successfully:', data);
    
    if (data.error) {
      console.error('❌ SMS sending failed:', data.error);
      return { success: false, error: data.error };
    }
    
    return data as SendSMSResponse;
    
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
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
    
    // Use a simple POST to avoid CORS preflight on Apps Script
    const formBody = new URLSearchParams({
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
