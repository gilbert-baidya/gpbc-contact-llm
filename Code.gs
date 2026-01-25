/**
 * Grace and Praise Bangladeshi Church - Twilio SMS Webhook
 * Enhanced with Pastor Alerts and Prayer Dashboard
 * AI Features powered by OpenAI
 */

// CONFIGURATION
const PASTOR_PHONES = [
  '+19097630454', // Pastor Gilbert
  // Add more pastor numbers here in E.164 format
];

const SHEET_NAMES = {
  CONTACTS: 'FINAL_GPBC_CONTACTS',  // Use the correct sheet tab name
  SMS_REPLIES: 'SMS_Replies',
  PRAYER_DASHBOARD: 'Prayer_Dashboard'
};

// OpenAI Configuration
// TODO: Replace with your OpenAI API key from https://platform.openai.com/api-keys
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';

/**
 * Call OpenAI API for AI features
 */
function callOpenAI(message, systemPrompt, maxTokens) {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const payload = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt || 'You are a helpful church assistant.' },
      { role: 'user', content: message }
    ],
    temperature: 0.7,
    max_tokens: maxTokens || 200
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + OPENAI_API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (data.error) {
      Logger.log('OpenAI Error: ' + JSON.stringify(data.error));
      return null;
    }
    
    return data.choices[0].message.content;
  } catch (e) {
    Logger.log('OpenAI Exception: ' + e.toString());
    return null;
  }
}

/**
 * Standard JSON response
 * Note: Google Apps Script automatically handles CORS for "Anyone" access
 */
function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * API handler for GET requests (stats, contacts, and AI features)
 * Public API - no authentication required for reading data
 */
function doGet(e) {
  try {
    // Handle different actions
    const action = e.parameter.action || '';
    
    switch (action) {
      case 'getStats':
        return getStats();
      case 'getContacts':
        return getContacts();
      case 'getMessageHistory':
        return getMessageHistory();
      case 'personalizeMessage':
        return personalizeMessage(e.parameter);
      case 'improveMessage':
        return improveMessage(e.parameter);
      case 'translateMessage':
        return translateMessage(e.parameter);
      default:
        return jsonResponse({ error: 'Invalid action' });
    }
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return jsonResponse({ error: 'Internal server error', message: error.toString() });
  }
}

/**
 * Get statistics about contacts
 */
function getStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.CONTACTS);
  
  // If "Contacts" sheet doesn't exist, use the first sheet
  if (!sheet) {
    sheet = ss.getSheets()[0];
  }
  
  if (!sheet) {
    return jsonResponse({ error: 'No sheets found in spreadsheet' });
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // Find column indices
  const optInCol = headers.indexOf('OptIn') !== -1 ? headers.indexOf('OptIn') : 
                   headers.indexOf('Opt-In') !== -1 ? headers.indexOf('Opt-In') : 
                   headers.indexOf('opt_in');
  const groupCol = headers.indexOf('Group') !== -1 ? headers.indexOf('Group') : headers.indexOf('group');
  
  // Calculate statistics
  const totalContacts = rows.length;
  const optInRows = rows.filter(row => row[optInCol] === 'Yes');
  const optInCount = optInRows.length;
  
  // Count by groups
  const menCount = optInRows.filter(row => row[groupCol] === 'Men').length;
  const womenCount = optInRows.filter(row => row[groupCol] === 'Women').length;
  const youngAdultCount = optInRows.filter(row => row[groupCol] === 'YoungAdult').length;
  
  const stats = {
    totalContacts: totalContacts,
    optInCount: optInCount,
    optOutCount: totalContacts - optInCount,
    menCount: menCount,
    womenCount: womenCount,
    youngAdultCount: youngAdultCount
  };
  
  return jsonResponse(stats);
}

/**
 * Get list of contacts who have opted in
 */
function getContacts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.CONTACTS);
  
  // If "Contacts" sheet doesn't exist, use the first sheet
  if (!sheet) {
    sheet = ss.getSheets()[0];
  }
  
  if (!sheet) {
    return jsonResponse({ error: 'No sheets found in spreadsheet' });
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // Find column indices - try both capitalized and lowercase versions
  const idCol = headers.indexOf('ID') !== -1 ? headers.indexOf('ID') : headers.indexOf('id');
  const nameCol = headers.indexOf('Name') !== -1 ? headers.indexOf('Name') : headers.indexOf('name');
  const phoneCol = headers.indexOf('Phone_E164') !== -1 ? headers.indexOf('Phone_E164') : 
                   headers.indexOf('phone_e164') !== -1 ? headers.indexOf('phone_e164') : 
                   headers.indexOf('Phone');
  const optInCol = headers.indexOf('OptIn') !== -1 ? headers.indexOf('OptIn') : 
                   headers.indexOf('Opt-In') !== -1 ? headers.indexOf('Opt-In') : 
                   headers.indexOf('optIn') !== -1 ? headers.indexOf('optIn') : 
                   headers.indexOf('opt_in');
  const languageCol = headers.indexOf('Language') !== -1 ? headers.indexOf('Language') : 
                      headers.indexOf('language');
  const cityCol = headers.indexOf('City') !== -1 ? headers.indexOf('City') : headers.indexOf('city');
  const groupCol = headers.indexOf('Group') !== -1 ? headers.indexOf('Group') : headers.indexOf('group');
  
  // Map all contacts
  const contacts = rows
    .map((row, index) => ({
      id: row[idCol] || (index + 1),
      name: row[nameCol] || '',
      phone: row[phoneCol] || '',
      language: row[languageCol] || 'EN',
      city: row[cityCol] || '',
      group: row[groupCol] || 'Unassigned',
      optIn: row[optInCol] || 'No',
      active: true,
      created_at: new Date().toISOString()
    }));
  
  return jsonResponse(contacts);
}

/**
 * AI Feature: Personalize message with contact name
 */
function personalizeMessage(params) {
  const message = params.message;
  const name = params.name;
  
  if (!message || !name) {
    return jsonResponse({ 
      error: 'Missing required parameters: message and name',
      success: false 
    });
  }
  
  // Extract first name
  const firstName = name.split(' ')[0];
  
  // Check if name already in message
  if (message.toLowerCase().includes(firstName.toLowerCase())) {
    return jsonResponse({ 
      success: true, 
      personalized: message 
    });
  }
  
  // Use AI to naturally add name
  const prompt = `Add the name "${firstName}" naturally to this message: "${message}". Keep it under 160 characters and maintain a warm, pastoral tone.`;
  const systemPrompt = 'You are a church communication assistant. Add names naturally to messages. Return only the personalized message, nothing else.';
  
  const aiResult = callOpenAI(prompt, systemPrompt, 100);
  
  // Fallback to simple prepend if AI fails
  const personalized = aiResult || `${firstName}, ${message}`;
  
  return jsonResponse({ 
    success: true, 
    personalized: personalized 
  });
}

/**
 * AI Feature: Improve message with suggestions
 */
function improveMessage(params) {
  const message = params.message;
  
  if (!message) {
    return jsonResponse({ 
      error: 'Missing required parameter: message',
      success: false 
    });
  }
  
  const prompt = `Improve this church message: "${message}". Provide exactly 3 different improved variations. Each must be under 160 characters. Keep the pastoral tone warm and welcoming. Format as a numbered list.`;
  const systemPrompt = 'You are a church communication expert. Improve messages to be more engaging while keeping them concise and appropriate for SMS.';
  
  const aiResult = callOpenAI(prompt, systemPrompt, 300);
  
  if (!aiResult) {
    return jsonResponse({ 
      success: false, 
      error: 'Failed to generate suggestions',
      suggestions: [] 
    });
  }
  
  // Parse suggestions from AI response (expects numbered list)
  const suggestions = aiResult
    .split('\n')
    .filter(line => line.trim().match(/^\d+[.)]/))
    .map(line => line.replace(/^\d+[.)]/, '').trim())
    .filter(s => s.length > 0)
    .slice(0, 3);
  
  // Fallback if parsing fails
  if (suggestions.length === 0) {
    suggestions.push(message + ' 🙏');
    suggestions.push('Join us! ' + message);
    suggestions.push(message + ' God bless you!');
  }
  
  return jsonResponse({ 
    success: true, 
    suggestions: suggestions 
  });
}

/**
 * AI Feature: Translate message to different language
 */
function translateMessage(params) {
  const text = params.text;
  const language = params.language || 'bn'; // Default to Bengali
  
  if (!text) {
    return jsonResponse({ 
      error: 'Missing required parameter: text',
      success: false 
    });
  }
  
  // Language mapping
  const languageNames = {
    'en': 'English',
    'bn': 'Bengali',
    'hi': 'Hindi',
    'es': 'Spanish'
  };
  
  const targetLanguage = languageNames[language] || language;
  
  const prompt = `Translate this church message to ${targetLanguage}: "${text}". Keep the pastoral tone and warmth. Keep it under 160 characters if possible.`;
  const systemPrompt = 'You are a multilingual church communication translator. Translate messages while preserving their spiritual and pastoral tone.';
  
  const translated = callOpenAI(prompt, systemPrompt, 200);
  
  if (!translated) {
    return jsonResponse({ 
      success: false, 
      error: 'Translation failed',
      translated: text 
    });
  }
  
  return jsonResponse({ 
    success: true, 
    translated: translated,
    language: language 
  });
}

/**
 * Main webhook handler for incoming Twilio SMS
 * Preserves existing functionality and adds new features
 */
function doPost(e) {
  try {
    // Check if this is an API call (has action parameter)
    const action = e.parameter.action || '';
    
    if (action) {
      // This is an API call from the frontend
      switch (action) {
        case 'sendSMS':
          return handleSendSMS(e);
        case 'makeCall':
          return handleMakeCall(e);
        default:
          return jsonResponse({ error: 'Invalid action' });
      }
    }
    
    // Otherwise, handle as Twilio webhook
    // Extract Twilio parameters
    const from = e.parameter.From || '';
    const body = e.parameter.Body || '';
    const messageSid = e.parameter.MessageSid || '';
    
    // Normalize phone number to E.164 format (+1XXXXXXXXXX)
    const normalizedPhone = normalizePhone(from);
    
    // Look up contact in Contacts sheet
    const contact = lookupContact(normalizedPhone);
    const contactName = contact ? contact.name : 'Unknown';
    
    // Detect intent and determine status
    const intent = detectIntent(body);
    let status = 'UNKNOWN';
    let replyMessage = '';
    
    // Handle different intents
    switch (intent) {
      case 'YES':
        status = 'YES';
        replyMessage = 'Thank you! You are now opted in to receive messages from GPBC.';
        if (contact) {
          updateContactOptIn(contact.row, 'YES');
        }
        break;
        
      case 'NO':
      case 'OPT_OUT':
        status = 'NO';
        replyMessage = 'You have been unsubscribed. You will no longer receive messages from GPBC.';
        if (contact) {
          updateContactOptIn(contact.row, 'NO');
        }
        break;
        
      case 'PRAYER_REQUEST':
        status = 'PRAYER_REQUEST';
        replyMessage = 'Thank you for sharing your prayer request. Our church family is praying for you. God is with you. 🙏';
        
        // FEATURE 1: Send SMS alert to pastors
        sendPastorAlert(contactName, normalizedPhone, body);
        break;
        
      default:
        status = 'UNKNOWN';
        replyMessage = 'Thank you for your message. For assistance, please contact our church office.';
    }
    
    // Log SMS to SMS_Replies sheet
    logSmsReply(normalizedPhone, contactName, body, status, replyMessage);
    
    // FEATURE 2: Update Prayer Dashboard metrics
    updatePrayerDashboard(status);
    
    // Return TwiML XML response
    return ContentService
      .createTextOutput(createTwiMLResponse(replyMessage))
      .setMimeType(ContentService.MimeType.XML);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService
      .createTextOutput(createTwiMLResponse('We received your message. Thank you.'))
      .setMimeType(ContentService.MimeType.XML);
  }
}

/**
 * Normalize phone number to E.164 format (+1XXXXXXXXXX)
 */
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return '+1' + digits;
  } else if (digits.length === 11 && digits[0] === '1') {
    return '+' + digits;
  }
  
  return phone; // Return as-is if format is unclear
}

/**
 * Look up contact in Contacts sheet by phone number
 */
function lookupContact(phone) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.CONTACTS);
  
  if (!sheet) {
    return null;
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Find contact by phone (assuming Phone_E164 column)
  for (let i = 1; i < data.length; i++) {
    const rowPhone = data[i][3]; // Adjust column index as needed
    if (rowPhone && normalizePhone(rowPhone.toString()) === phone) {
      return {
        row: i + 1,
        name: data[i][1], // Name column
        phone: rowPhone,
        optIn: data[i][5] // OptIn column
      };
    }
  }
  
  return null;
}

/**
 * Update contact opt-in status in Contacts sheet
 */
function updateContactOptIn(row, optInValue) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CONTACTS);
  
  if (sheet) {
    sheet.getRange(row, 6).setValue(optInValue); // OptIn column (adjust as needed)
  }
}

/**
 * Detect intent from message body
 */
function detectIntent(body) {
  const message = body.toLowerCase().trim();
  
  // OPT OUT detection (highest priority)
  const optOutKeywords = ['stop', 'unsubscribe', 'opt out', 'remove', 'no more'];
  if (optOutKeywords.some(keyword => message.includes(keyword))) {
    return 'OPT_OUT';
  }
  
  // YES detection
  if (message === 'yes' || message === 'y') {
    return 'YES';
  }
  
  // NO detection
  if (message === 'no' || message === 'n') {
    return 'NO';
  }
  
  // PRAYER REQUEST detection
  const prayerKeywords = ['pray', 'prayer', 'please pray', 'need prayer'];
  const prayerContexts = ['sick', 'hospital', 'healing', 'family', 'job', 'help'];
  
  const hasPrayerKeyword = prayerKeywords.some(keyword => message.includes(keyword));
  const hasPrayerContext = prayerContexts.some(context => message.includes(context));
  
  if (hasPrayerKeyword || (hasPrayerContext && message.length > 20)) {
    return 'PRAYER_REQUEST';
  }
  
  return 'UNKNOWN';
}

/**
 * FEATURE 1: Send SMS alert to pastors about prayer requests
 */
function sendPastorAlert(senderName, senderPhone, prayerMessage) {
  try {
    const props = PropertiesService.getScriptProperties();
    const twilioSid = props.getProperty('TWILIO_SID');
    const twilioAuth = props.getProperty('TWILIO_AUTH');
    const twilioFrom = props.getProperty('TWILIO_FROM');
    
    if (!twilioSid || !twilioAuth || !twilioFrom) {
      Logger.log('Twilio credentials not configured in Script Properties');
      return;
    }
    
    // Compose alert message
    const alertMessage = `🙏 PRAYER REQUEST\n\nFrom: ${senderName}\nPhone: ${senderPhone}\n\nMessage:\n${prayerMessage}`;
    
    // Send to each pastor
    PASTOR_PHONES.forEach(pastorPhone => {
      sendTwilioSMS(twilioSid, twilioAuth, twilioFrom, pastorPhone, alertMessage);
    });
    
    Logger.log('Pastor alerts sent for prayer request from ' + senderPhone);
    
  } catch (error) {
    Logger.log('Error sending pastor alert: ' + error.toString());
  }
}

/**
 * Send SMS via Twilio REST API
 */
function sendTwilioSMS(sid, auth, from, to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  
  const payload = {
    From: from,
    To: to,
    Body: body
  };
  
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(sid + ':' + auth)
    },
    payload: payload,
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    
    if (code !== 200 && code !== 201) {
      Logger.log('Twilio API error: ' + response.getContentText());
    }
  } catch (error) {
    Logger.log('Error calling Twilio API: ' + error.toString());
  }
}

/**
 * Log SMS reply to SMS_Replies sheet
 */
function logSmsReply(phone, name, incomingMessage, status, replyMessage) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.SMS_REPLIES);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.SMS_REPLIES);
    sheet.appendRow(['Timestamp', 'Phone', 'Name', 'Incoming Message', 'Status', 'Reply Message']);
  }
  
  const timestamp = new Date();
  sheet.appendRow([timestamp, phone, name, incomingMessage, status, replyMessage]);
}

/**
 * FEATURE 2: Update Prayer Dashboard metrics
 */
function updatePrayerDashboard(status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.PRAYER_DASHBOARD);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.PRAYER_DASHBOARD);
    sheet.appendRow(['Metric', 'Count']);
    sheet.appendRow(['TOTAL', 0]);
    sheet.appendRow(['YES', 0]);
    sheet.appendRow(['NO', 0]);
    sheet.appendRow(['PRAYER_REQUEST', 0]);
    sheet.appendRow(['OPT_OUT', 0]);
    
    // Format header
    sheet.getRange('A1:B1').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  // Always increment TOTAL
  incrementMetric(sheet, 'TOTAL');
  
  // Increment specific status metric
  if (status === 'YES' || status === 'NO' || status === 'PRAYER_REQUEST' || status === 'OPT_OUT') {
    incrementMetric(sheet, status);
  }
}

/**
 * Increment a metric in the Prayer Dashboard
 */
function incrementMetric(sheet, metric) {
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === metric) {
      const currentValue = data[i][1] || 0;
      sheet.getRange(i + 1, 2).setValue(currentValue + 1);
      return;
    }
  }
}

/**
 * Create TwiML XML response
 */
function createTwiMLResponse(message) {
  return '<?xml version="1.0" encoding="UTF-8"?>' +
         '<Response>' +
         '<Message>' + escapeXml(message) + '</Message>' +
         '</Response>';
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Test function for development
 */
function testWebhook() {
  const testEvent = {
    parameter: {
      From: '+19097630454',
      Body: 'Please pray for my family',
      MessageSid: 'TEST123'
    }
  };
  
  const response = doPost(testEvent);
  Logger.log(response.getContent());
}

/**
 * Handle Send SMS API call
 */
function handleSendSMS(e) {
  try {
    // Parse POST data
    let to, message, from;
    
    // Try to get from POST body first
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        to = postData.to;
        message = postData.message;
        from = postData.from;
      } catch (parseError) {
        Logger.log('Error parsing POST data: ' + parseError.toString());
      }
    }
    
    // Fallback to query/form parameters
    if (!to || !message) {
      to = to || e.parameter.to;
      message = message || e.parameter.message;
      from = from || e.parameter.from;
    }
    
    Logger.log('handleSendSMS - to: ' + to + ', message: ' + message);
    
    if (!to || !message) {
      return jsonResponse({ error: 'Missing required parameters: to, message' });
    }
    
    // Get Twilio credentials
    const props = PropertiesService.getScriptProperties();
    const TWILIO_ACCOUNT_SID = props.getProperty('TWILIO_SID');
    const TWILIO_AUTH_TOKEN = props.getProperty('TWILIO_AUTH');
    const TWILIO_PHONE = props.getProperty('TWILIO_FROM');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE) {
      return jsonResponse({ error: 'Twilio credentials not configured' });
    }
    
    // Twilio API endpoint
    const url = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ACCOUNT_SID + '/Messages.json';
    
    // Create auth header
    const authHeader = 'Basic ' + Utilities.base64Encode(TWILIO_ACCOUNT_SID + ':' + TWILIO_AUTH_TOKEN);
    
    // Send SMS
    const options = {
      method: 'post',
      headers: {
        'Authorization': authHeader
      },
      payload: {
        To: to,
        From: from || TWILIO_PHONE,
        Body: message
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    
    // Log to SMS_Log sheet
    logToSheet('SMS_Log', {
      timestamp: new Date(),
      to: to,
      from: from || TWILIO_PHONE,
      message: message,
      status: result.status,
      sid: result.sid,
      error_code: result.error_code || '',
      error_message: result.error_message || ''
    });
    
    return jsonResponse({ 
      success: true, 
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from
    });
      
  } catch (error) {
    Logger.log('Error in handleSendSMS: ' + error.toString());
    return jsonResponse({ error: 'Failed to send SMS: ' + error.toString() });
  }
}

/**
 * Handle Make Call API call
 */
function handleMakeCall(e) {
  try {
    // Parse POST data
    let to, message, from;
    
    // Try to get from POST body first
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        to = postData.to;
        message = postData.message;
        from = postData.from;
      } catch (parseError) {
        Logger.log('Error parsing POST data: ' + parseError.toString());
      }
    }
    
    // Fallback to query/form parameters
    if (!to || !message) {
      to = to || e.parameter.to;
      message = message || e.parameter.message;
      from = from || e.parameter.from;
    }
    
    Logger.log('handleMakeCall - to: ' + to + ', message: ' + message);
    
    if (!to || !message) {
      return jsonResponse({ error: 'Missing required parameters: to, message' });
    }
    
    // Get Twilio credentials
    const props = PropertiesService.getScriptProperties();
    const TWILIO_ACCOUNT_SID = props.getProperty('TWILIO_SID');
    const TWILIO_AUTH_TOKEN = props.getProperty('TWILIO_AUTH');
    const TWILIO_PHONE = props.getProperty('TWILIO_FROM');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE) {
      return jsonResponse({ error: 'Twilio credentials not configured' });
    }
    
    // Create TwiML for voice message
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">' + escapeXml(message) + '</Say></Response>';
    
    // Twilio API endpoint for calls
    const url = 'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_ACCOUNT_SID + '/Calls.json';
    
    // Create auth header
    const authHeader = 'Basic ' + Utilities.base64Encode(TWILIO_ACCOUNT_SID + ':' + TWILIO_AUTH_TOKEN);
    
    const options = {
      method: 'post',
      headers: {
        'Authorization': authHeader
      },
      payload: {
        To: to,
        From: from || TWILIO_PHONE,
        Twiml: twiml
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    
    // Log to Call_Log sheet
    logToSheet('Call_Log', {
      timestamp: new Date(),
      to: to,
      from: from || TWILIO_PHONE,
      message: message,
      status: result.status,
      sid: result.sid,
      duration: result.duration || 0,
      error_code: result.error_code || '',
      error_message: result.error_message || ''
    });
    
    return jsonResponse({ 
      success: true, 
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from
    });
      
  } catch (error) {
    Logger.log('Error in handleMakeCall: ' + error.toString());
    return jsonResponse({ error: 'Failed to make call: ' + error.toString() });
  }
}

/**
 * Log to sheet helper function
 */
function logToSheet(sheetName, data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // Add headers based on sheet type
      if (sheetName === 'SMS_Log') {
        sheet.appendRow(['Timestamp', 'To', 'From', 'Message', 'Status', 'SID', 'Error Code', 'Error Message']);
      } else if (sheetName === 'Call_Log') {
        sheet.appendRow(['Timestamp', 'To', 'From', 'Message', 'Status', 'SID', 'Duration', 'Error Code', 'Error Message']);
      }
    }
    
    // Append data row
    const row = [];
    for (const key in data) {
      row.push(data[key]);
    }
    sheet.appendRow(row);
    
  } catch (error) {
    Logger.log('Error logging to sheet: ' + error.toString());
  }
}

/**
 * Get message history from logs
 */
function getMessageHistory() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const smsSheet = ss.getSheetByName('SMS_Log');
    const callSheet = ss.getSheetByName('Call_Log');
    
    const messages = [];
    
    // Get SMS logs
    if (smsSheet) {
      const smsData = smsSheet.getDataRange().getValues();
      const smsHeaders = smsData[0];
      const smsRows = smsData.slice(1);
      
      smsRows.forEach(row => {
        messages.push({
          type: 'sms',
          timestamp: row[0],
          to: row[1],
          from: row[2],
          message: row[3],
          status: row[4],
          sid: row[5]
        });
      });
    }
    
    // Get Call logs
    if (callSheet) {
      const callData = callSheet.getDataRange().getValues();
      const callHeaders = callData[0];
      const callRows = callData.slice(1);
      
      callRows.forEach(row => {
        messages.push({
          type: 'call',
          timestamp: row[0],
          to: row[1],
          from: row[2],
          message: row[3],
          status: row[4],
          sid: row[5],
          duration: row[6]
        });
      });
    }
    
    // Sort by timestamp descending
    messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return jsonResponse({ messages: messages.slice(0, 100) });
      
  } catch (error) {
    Logger.log('Error getting message history: ' + error.toString());
    return jsonResponse({ messages: [] });
  }
}
