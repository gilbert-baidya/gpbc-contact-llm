/**
 * Grace and Praise Bangladeshi Church - Twilio SMS Webhook
 * Enhanced with Pastor Alerts and Prayer Dashboard
 */

// CONFIGURATION
const PASTOR_PHONES = [
  '+19097630454', // Pastor Gilbert
  // Add more pastor numbers here in E.164 format
];

const SHEET_NAMES = {
  CONTACTS: 'Contacts',
  SMS_REPLIES: 'SMS_Replies',
  PRAYER_DASHBOARD: 'Prayer_Dashboard'
};

/**
 * API handler for GET requests (stats and contacts)
 * Protected by API key authentication
 */
function doGet(e) {
  try {
    // Get API key from Script Properties
    const props = PropertiesService.getScriptProperties();
    const validApiKey = props.getProperty('APLKEY');
    
    // Check authentication
    const providedKey = e.parameter.key || '';
    if (providedKey !== validApiKey) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle different actions
    const action = e.parameter.action || '';
    
    switch (action) {
      case 'getStats':
        return getStats();
      case 'getContacts':
        return getContacts();
      default:
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Invalid action' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Internal server error' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get statistics about contacts
 */
function getStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CONTACTS);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Contacts sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
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
  
  return ContentService
    .createTextOutput(JSON.stringify(stats))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get list of contacts who have opted in
 */
function getContacts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CONTACTS);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Contacts sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
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
  
  // Filter for opted-in contacts
  const contacts = rows
    .filter(row => row[optInCol] === 'Yes')
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
  
  return ContentService
    .createTextOutput(JSON.stringify(contacts))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main webhook handler for incoming Twilio SMS
 * Preserves existing functionality and adds new features
 */
function doPost(e) {
  try {
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
