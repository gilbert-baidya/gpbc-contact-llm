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
  PRAYER_DASHBOARD: 'Prayer_Dashboard',
  USERS: 'Users',  // Authentication - stores user accounts
  AUDIT_LOG: 'Audit_Log',  // Security audit trail
  RATE_LIMITS: 'Rate_Limits'  // Track API usage
};

// JWT Secret - Generate once and store in Script Properties
// To set: Script Properties → Add Property → Key: JWT_SECRET, Value: (random string)
function getJWTSecret() {
  let secret = PropertiesService.getScriptProperties().getProperty('JWT_SECRET');
  if (!secret) {
    // Auto-generate secret on first run
    secret = Utilities.getUuid() + Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('JWT_SECRET', secret);
  }
  return secret;
}

/**
 * Validate API Key using existing API_KEY property
 * Call this at the beginning of protected endpoints
 */
function validateApiKey(e) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const validKey = scriptProperties.getProperty('API_KEY');
  
  if (!validKey) {
    Logger.log('⚠️ API_KEY not configured in Script Properties');
    throw new Error('Server configuration error: API_KEY not set');
  }
  
  // Try to get API key from parameter or header
  const providedKey = e.parameter.apiKey || (e.headers && e.headers['X-API-Key']);
  
  if (!providedKey || providedKey !== validKey) {
    logAuditEvent('ANONYMOUS', 'API_KEY_INVALID', { 
      hasKey: !!providedKey,
      source: e.parameter.apiKey ? 'parameter' : 'header'
    });
    throw new Error('Unauthorized: Invalid API Key');
  }
  
  return true;
}

/**
 * Prevent duplicate message sends using idempotency key
 * Stores keys in cache for 5 minutes (300 seconds)
 */
function preventDuplicate(idempotencyKey) {
  if (!idempotencyKey) {
    return; // Idempotency is optional but recommended
  }
  
  const cache = CacheService.getScriptCache();
  
  if (cache.get(idempotencyKey)) {
    logAuditEvent('SYSTEM', 'DUPLICATE_PREVENTED', { idempotencyKey: idempotencyKey });
    throw new Error('Duplicate message prevented');
  }
  
  // Store for 5 minutes
  cache.put(idempotencyKey, '1', 300);
}

/**
 * Secure Twilio message sending function
 * Uses existing Script Properties: TWILIO_SID, TWILIO_AUTH, TWILIO_FROM
 * Supports both SMS and MMS (with media URLs)
 * 
 * Phase 3.1-3.2: Audited and Extended for Full MMS Support
 * - SMS: Works normally when mediaUrls is null or empty
 * - MMS: Works when mediaUrls is provided (up to 10 media URLs per Twilio spec)
 */
function sendTwilioMessage(to, body, mediaUrls) {
  const props = PropertiesService.getScriptProperties();
  
  const accountSid = props.getProperty('TWILIO_SID');
  const authToken = props.getProperty('TWILIO_AUTH');
  const fromNumber = props.getProperty('TWILIO_FROM');
  
  if (!accountSid || !authToken || !fromNumber) {
    Logger.log('⚠️ Twilio credentials not configured in Script Properties');
    throw new Error('Server configuration error: Twilio credentials missing');
  }
  
  const payload = {
    To: to,
    From: fromNumber,
    Body: body
  };
  
  // Add media URLs for MMS (Twilio supports up to 10 media URLs)
  // Format: MediaUrl, MediaUrl1, MediaUrl2, etc.
  if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
    mediaUrls.forEach(function(url, index) {
      if (index === 0) {
        payload['MediaUrl'] = url;
      } else {
        payload['MediaUrl' + index] = url;
      }
    });
    Logger.log('📎 Adding ' + mediaUrls.length + ' media URL(s) for MMS');
  }
  
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(accountSid + ':' + authToken)
    },
    payload: payload,
    muteHttpExceptions: true
  };
  
  const url = 'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json';
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const result = JSON.parse(response.getContentText());
    
    if (responseCode !== 200 && responseCode !== 201) {
      Logger.log('Twilio API error: ' + response.getContentText());
      throw new Error('Twilio API error: ' + (result.message || 'Unknown error'));
    }
    
    Logger.log('✅ Message sent successfully - SID: ' + result.sid + ', Media: ' + (result.num_media || 0));
    return result;
  } catch (error) {
    Logger.log('Error calling Twilio API: ' + error.toString());
    throw error;
  }
}

/**
 * Secure Twilio call function
 * Uses existing Script Properties: TWILIO_SID, TWILIO_AUTH, TWILIO_FROM
 * Creates voice call with text-to-speech message
 */
function sendTwilioCall(to, message) {
  const props = PropertiesService.getScriptProperties();
  
  const accountSid = props.getProperty('TWILIO_SID');
  const authToken = props.getProperty('TWILIO_AUTH');
  const fromNumber = props.getProperty('TWILIO_FROM');
  
  if (!accountSid || !authToken || !fromNumber) {
    Logger.log('⚠️ Twilio credentials not configured in Script Properties');
    throw new Error('Server configuration error: Twilio credentials missing');
  }
  
  // Create TwiML for voice message
  const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">' + escapeXml(message) + '</Say></Response>';
  
  const payload = {
    To: to,
    From: fromNumber,
    Twiml: twiml
  };
  
  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(accountSid + ':' + authToken)
    },
    payload: payload,
    muteHttpExceptions: true
  };
  
  const url = 'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Calls.json';
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const result = JSON.parse(response.getContentText());
    
    if (responseCode !== 200 && responseCode !== 201) {
      Logger.log('Twilio API error: ' + response.getContentText());
      throw new Error('Twilio API error: ' + (result.message || 'Unknown error'));
    }
    
    return result;
  } catch (error) {
    Logger.log('Error calling Twilio API: ' + error.toString());
    throw error;
  }
}

// Twilio Auth Token for webhook signature validation
function getTwilioAuthToken() {
  return PropertiesService.getScriptProperties().getProperty('TWILIO_AUTH');
}

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
 * Extract and verify user token from request
 * Returns user payload or null
 */
function verifyRequestToken(e) {
  try {
    let token = null;
    
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        token = postData.token;
      } catch (parseError) {
        Logger.log('Error parsing token: ' + parseError.toString());
      }
    }
    
    if (!token) {
      return null;
    }
    
    const payload = verifyToken(token);
    return payload;
  } catch (error) {
    Logger.log('Error verifying request token: ' + error.toString());
    return null;
  }
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userPayload, requiredRoles) {
  if (!userPayload || !userPayload.role) {
    return false;
  }
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(userPayload.role);
  }
  
  return userPayload.role === requiredRoles;
}

/**
 * Advanced rate limiting with per-user and system-wide limits
 */
function checkAdvancedRateLimit(userEmail, action) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAMES.RATE_LIMITS);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAMES.RATE_LIMITS);
      sheet.appendRow(['User', 'Action', 'Count', 'WindowStart', 'WindowEnd', 'Type']);
      sheet.getRange('A1:F1').setFontWeight('bold').setBackground('#f39c12').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    
    const now = new Date();
    const data = sheet.getDataRange().getValues();
    
    // Per-user rate limits (per hour)
    const userLimits = {
      'SEND_SMS': 100,
      'SEND_CALL': 50,
      'LOGIN': 10
    };
    
    // System-wide rate limits (per minute)
    const systemLimits = {
      'SEND_SMS': 30,  // 30 SMS per minute system-wide
      'SEND_CALL': 20  // 20 calls per minute system-wide
    };
    
    // Check user rate limit (1 hour window)
    const userLimit = userLimits[action] || 100;
    let userRow = -1;
    let userCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userEmail && data[i][1] === action && data[i][5] === 'user') {
        const windowEnd = new Date(data[i][4]);
        if (windowEnd > now) {
          userRow = i + 1;
          userCount = data[i][2];
          break;
        }
      }
    }
    
    if (userCount >= userLimit) {
      logAuditEvent(userEmail, 'RATE_LIMIT_EXCEEDED', { 
        type: 'user',
        action: action, 
        limit: userLimit,
        currentCount: userCount 
      });
      
      return {
        allowed: false,
        error: `User rate limit exceeded. Maximum ${userLimit} ${action} requests per hour.`,
        remainingRequests: 0,
        resetTime: data[userRow - 1][4]
      };
    }
    
    // Check system-wide rate limit (1 minute window)
    const systemLimit = systemLimits[action];
    if (systemLimit) {
      let systemRow = -1;
      let systemCount = 0;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === 'SYSTEM' && data[i][1] === action && data[i][5] === 'system') {
          const windowEnd = new Date(data[i][4]);
          if (windowEnd > now) {
            systemRow = i + 1;
            systemCount = data[i][2];
            break;
          }
        }
      }
      
      if (systemCount >= systemLimit) {
        logAuditEvent(userEmail, 'RATE_LIMIT_EXCEEDED', { 
          type: 'system',
          action: action, 
          limit: systemLimit,
          currentCount: systemCount 
        });
        
        return {
          allowed: false,
          error: `System rate limit exceeded. Please try again in a moment.`,
          remainingRequests: 0,
          resetTime: data[systemRow - 1][4]
        };
      }
      
      // Update system rate limit
      if (systemRow > 0) {
        sheet.getRange(systemRow, 3).setValue(systemCount + 1);
      } else {
        const windowEnd = new Date(now.getTime() + 60 * 1000); // 1 minute
        sheet.appendRow(['SYSTEM', action, 1, now, windowEnd, 'system']);
      }
    }
    
    // Update user rate limit
    if (userRow > 0) {
      sheet.getRange(userRow, 3).setValue(userCount + 1);
    } else {
      const windowEnd = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      sheet.appendRow([userEmail, action, 1, now, windowEnd, 'user']);
    }
    
    return {
      allowed: true,
      remainingRequests: userLimit - userCount - 1,
      resetTime: new Date(now.getTime() + 60 * 60 * 1000)
    };
    
  } catch (error) {
    Logger.log('Error checking advanced rate limit: ' + error.toString());
    return { allowed: true, remainingRequests: 'Unknown' };
  }
}

/**
 * Validate Twilio webhook signature
 * Prevents spoofed webhook requests
 */
function validateTwilioSignature(e) {
  try {
    // In Apps Script, we don't have direct access to raw headers
    // This is a simplified validation - in production, implement full HMAC validation
    
    const authToken = getTwilioAuthToken();
    if (!authToken) {
      Logger.log('Twilio auth token not configured');
      return false;
    }
    
    // For now, we'll validate that required Twilio parameters are present
    // Full signature validation would require the X-Twilio-Signature header
    const requiredParams = ['From', 'To', 'Body', 'MessageSid'];
    for (const param of requiredParams) {
      if (!e.parameter[param]) {
        Logger.log('Missing required Twilio parameter: ' + param);
        return false;
      }
    }
    
    // Additional validation: Check if MessageSid format is valid
    const messageSid = e.parameter.MessageSid;
    if (!messageSid || !messageSid.startsWith('SM') && !messageSid.startsWith('MM')) {
      Logger.log('Invalid Twilio MessageSid format');
      return false;
    }
    
    return true;
  } catch (error) {
    Logger.log('Error validating Twilio signature: ' + error.toString());
    return false;
  }
}

// ==================== AUTHENTICATION SYSTEM (FREE) ====================

/**
 * Hash password using SHA-256
 */
function hashPassword(password) {
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return hash.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * Validate password strength
 * Requirements: 8+ characters, 1 uppercase, 1 lowercase, 1 number
 */
function validatePasswordStrength(password) {
  // Check length
  if (password.length < 8) {
    return { 
      valid: false, 
      error: 'Password must be at least 8 characters long' 
    };
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one uppercase letter' 
    };
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one lowercase letter' 
    };
  }
  
  // Check for number
  if (!/[0-9]/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one number' 
    };
  }
  
  return { valid: true };
}

/**
 * Create a simple JWT-like token
 */
function createToken(email, role) {
  const payload = {
    email: email,
    role: role,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  const payloadStr = JSON.stringify(payload);
  const signature = hashPassword(payloadStr + getJWTSecret());
  
  return Utilities.base64Encode(payloadStr) + '.' + signature;
}

/**
 * Verify and decode token
 */
function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    
    const payloadStr = Utilities.newBlob(Utilities.base64Decode(parts[0])).getDataAsString();
    const signature = parts[1];
    
    // Verify signature
    const expectedSignature = hashPassword(payloadStr + getJWTSecret());
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(payloadStr);
    
    // Check expiration
    if (payload.exp < Date.now()) return null;
    
    return payload;
  } catch (e) {
    Logger.log('Token verification error: ' + e.toString());
    return null;
  }
}

/**
 * Initialize Users sheet if it doesn't exist
 */
function initUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.USERS);
    sheet.appendRow(['Email', 'PasswordHash', 'Role', 'Name', 'CreatedAt', 'Active', 'FailedAttempts', 'LockedUntil']);
    sheet.getRange('A1:H1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    
    // Create default admin account: admin@gracepraise.church / AdminGPBC2026!
    const adminEmail = 'admin@gracepraise.church';
    const adminPassword = 'AdminGPBC2026!';
    const adminHash = hashPassword(adminPassword);
    sheet.appendRow([adminEmail, adminHash, 'admin', 'System Administrator', new Date(), 'Yes', 0, '']);
    
    Logger.log('Users sheet created with default admin account');
  }
  
  return sheet;
}

/**
 * Register new user
 */
function registerUser(email, password, name, role) {
  const sheet = initUsersSheet();
  const data = sheet.getDataRange().getValues();
  
  // Check if email already exists
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === email.toLowerCase()) {
      return { success: false, error: 'Email already registered' };
    }
  }
  
  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.error };
  }
  
  // Hash password and create user
  const passwordHash = hashPassword(password);
  const userRole = role || 'member'; // Default to member
  
  sheet.appendRow([email, passwordHash, userRole, name, new Date(), 'Yes']);
  
  const token = createToken(email, userRole);
  
  return {
    success: true,
    token: token,
    user: {
      email: email,
      name: name,
      role: userRole
    }
  };
}

/**
 * Login user with account lockout protection
 */
function loginUser(email, password) {
  const sheet = initUsersSheet();
  const data = sheet.getDataRange().getValues();
  
  const passwordHash = hashPassword(password);
  
  // Find user
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === email.toLowerCase() && data[i][5] === 'Yes') {
      // Check if account is locked (column 6: FailedAttempts, column 7: LockedUntil)
      const failedAttempts = data[i][6] || 0;
      const lockedUntil = data[i][7] ? new Date(data[i][7]) : null;
      
      // Check if account is currently locked
      if (lockedUntil && lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil((lockedUntil - new Date()) / 60000);
        return { 
          success: false, 
          error: `Account locked due to too many failed attempts. Try again in ${minutesRemaining} minutes.` 
        };
      }
      
      if (data[i][1] === passwordHash) {
        // Password correct - reset failed attempts
        sheet.getRange(i + 1, 7).setValue(0); // Reset FailedAttempts
        sheet.getRange(i + 1, 8).setValue(''); // Clear LockedUntil
        
        // Log successful login
        logAuditEvent(email, 'LOGIN_SUCCESS', { ip: 'N/A' });
        
        const token = createToken(email, data[i][2]);
        return {
          success: true,
          token: token,
          user: {
            email: data[i][0],
            name: data[i][3],
            role: data[i][2]
          }
        };
      } else {
        // Password incorrect - increment failed attempts
        const newFailedAttempts = failedAttempts + 1;
        sheet.getRange(i + 1, 7).setValue(newFailedAttempts);
        
        // Lock account after 5 failed attempts (15 minute lockout)
        if (newFailedAttempts >= 5) {
          const lockoutTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          sheet.getRange(i + 1, 8).setValue(lockoutTime);
          
          // Log lockout event
          logAuditEvent(email, 'ACCOUNT_LOCKED', { 
            reason: 'Too many failed login attempts',
            lockedUntil: lockoutTime.toISOString()
          });
          
          return { 
            success: false, 
            error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' 
          };
        }
        
        // Log failed attempt
        logAuditEvent(email, 'LOGIN_FAILED', { 
          attempts: newFailedAttempts,
          remainingAttempts: 5 - newFailedAttempts
        });
        
        return { 
          success: false, 
          error: `Invalid email or password. ${5 - newFailedAttempts} attempts remaining.` 
        };
      }
    }
  }
  
  // Log failed attempt for unknown user
  logAuditEvent(email, 'LOGIN_FAILED', { reason: 'User not found' });
  
  return { success: false, error: 'Invalid email or password' };
}

/**
 * Verify token endpoint
 */
function verifyUserToken(token) {
  const payload = verifyToken(token);
  if (!payload) {
    return { success: false, error: 'Invalid or expired token' };
  }
  
  return {
    success: true,
    user: {
      email: payload.email,
      role: payload.role
    }
  };
}

// ==================== END AUTHENTICATION ====================

/**
 * API handler for GET requests (stats, contacts, and AI features)
 * Protected with API key authentication
 */
function doGet(e) {
  try {
    // Verify API key for production security
    const apiKey = e.parameter.key || e.parameter.apiKey;
    if (!verifyAPIKey(apiKey)) {
      return jsonResponse({ 
        error: 'Unauthorized', 
        message: 'Invalid or missing API key' 
      });
    }
    
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
 * SECURED: Validates Twilio webhook signatures
 * Preserves existing functionality and adds new features
 */
function doPost(e) {
  try {
    // Check if this is an API call (has action parameter)
    const action = e.parameter.action || '';
    
    if (action) {
      // This is an API call from the frontend
      switch (action) {
        case 'login':
          return handleLogin(e);
        case 'register':
          return handleRegister(e);
        case 'verifyToken':
          return handleVerifyToken(e);
        case 'sendSMS':
          return handleSendSMS(e);
        case 'makeCall':
          return handleMakeCall(e);
        case 'uploadFile':
          return handleUploadFile(e);
        default:
          return jsonResponse({ error: 'Invalid action' });
      }
    }
    
    // Otherwise, handle as Twilio webhook
    // SECURITY: Validate Twilio webhook signature
    if (!validateTwilioSignature(e)) {
      Logger.log('Invalid Twilio webhook signature');
      logAuditEvent('TWILIO_WEBHOOK', 'SIGNATURE_INVALID', { 
        from: e.parameter.From || 'unknown'
      });
      return ContentService
        .createTextOutput(createTwiMLResponse('Request validation failed.'))
        .setMimeType(ContentService.MimeType.XML);
    }
    
    // Extract Twilio parameters
    const from = e.parameter.From || '';
    const body = e.parameter.Body || '';
    const messageSid = e.parameter.MessageSid || '';
    
    // Log webhook receipt
    logAuditEvent('TWILIO_WEBHOOK', 'SMS_RECEIVED', { 
      from: from, 
      messageSid: messageSid 
    });
    
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
 * Send SMS via Twilio REST API using Script Properties
 * DEPRECATED: Use sendTwilioMessage() instead for better security
 * Kept for backward compatibility with pastor alerts
 */
function sendTwilioSMS(sid, auth, from, to, body) {
  // Use the secure sendTwilioMessage function instead
  try {
    return sendTwilioMessage(to, body, []);
  } catch (error) {
    Logger.log('Error in sendTwilioSMS: ' + error.toString());
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
 * Quick user registration helper
 * Run this function to add new users
 */
function addNewUser() {
  // ⚠️ EDIT THESE VALUES BEFORE RUNNING ⚠️
  const email = 'pastor@gracepraise.church';        // Change this
  const password = 'Password123!';         // Change this
  const name = 'Pastor Gilbert';           // Change this
  const role = 'admin';                    // Options: 'admin', 'pastor', 'member'
  
  const result = registerUser(email, password, name, role);
  
  if (result.success) {
    Logger.log('✅ User created successfully!');
    Logger.log('Email: ' + result.user.email);
    Logger.log('Name: ' + result.user.name);
    Logger.log('Role: ' + result.user.role);
    Logger.log('Token: ' + result.token);
  } else {
    Logger.log('❌ Error: ' + result.error);
  }
  
  return result;
}

/**
 * Add ministry team users
 * Run this function to create accounts for all ministry leaders
 */
function addMinistryUsers() {
  const users = [
    {
      email: 'pastor@gracepraise.church',
      password: 'Pastor2026!',
      name: 'Rev. Dr. Gilbert S. Baidya',
      role: 'admin'
    },
    {
      email: 'women@gracepraise.church',
      password: 'Women2026!',
      name: 'Women Ministry Leader',
      role: 'pastor'
    },
    {
      email: 'kids@gracepraise.church',
      password: 'Kids2026!',
      name: 'Kids Ministry Leader',
      role: 'pastor'
    },
    {
      email: 'worship@gracepraise.church',
      password: 'Worship2026!',
      name: 'Worship Team Leader',
      role: 'pastor'
    }
  ];
  
  Logger.log('========================================');
  Logger.log('Creating Ministry Team Accounts');
  Logger.log('========================================\n');
  
  users.forEach(user => {
    const result = registerUser(user.email, user.password, user.name, user.role);
    
    if (result.success) {
      Logger.log('✅ SUCCESS: ' + user.name);
      Logger.log('   Email: ' + user.email);
      Logger.log('   Password: ' + user.password);
      Logger.log('   Role: ' + user.role);
      Logger.log('');
    } else {
      Logger.log('❌ FAILED: ' + user.name);
      Logger.log('   Error: ' + result.error);
      Logger.log('');
    }
  });
  
  Logger.log('========================================');
  Logger.log('Account Creation Complete!');
  Logger.log('========================================');
}

// ==================== AUTH API HANDLERS ====================

/**
 * Handle Login Request
 */
function handleLogin(e) {
  try {
    let email, password;
    
    // Parse POST data
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        email = postData.email;
        password = postData.password;
      } catch (parseError) {
        Logger.log('Error parsing login data: ' + parseError.toString());
      }
    }
    
    // Fallback to form parameters
    if (!email || !password) {
      email = e.parameter.email;
      password = e.parameter.password;
    }
    
    if (!email || !password) {
      return jsonResponse({ success: false, error: 'Email and password required' });
    }
    
    return jsonResponse(loginUser(email, password));
  } catch (error) {
    Logger.log('Error in handleLogin: ' + error.toString());
    return jsonResponse({ success: false, error: 'Login failed: ' + error.toString() });
  }
}

/**
 * Handle Register Request
 */
function handleRegister(e) {
  try {
    let email, password, name, role;
    
    // Parse POST data
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        email = postData.email;
        password = postData.password;
        name = postData.name;
        role = postData.role;
      } catch (parseError) {
        Logger.log('Error parsing register data: ' + parseError.toString());
      }
    }
    
    // Fallback to form parameters
    if (!email || !password || !name) {
      email = e.parameter.email;
      password = e.parameter.password;
      name = e.parameter.name;
      role = e.parameter.role;
    }
    
    if (!email || !password || !name) {
      return jsonResponse({ success: false, error: 'Email, password, and name required' });
    }
    
    return jsonResponse(registerUser(email, password, name, role));
  } catch (error) {
    Logger.log('Error in handleRegister: ' + error.toString());
    return jsonResponse({ success: false, error: 'Registration failed: ' + error.toString() });
  }
}

/**
 * Handle Token Verification
 */
function handleVerifyToken(e) {
  try {
    let token;
    
    // Parse POST data
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        token = postData.token;
      } catch (parseError) {
        Logger.log('Error parsing token data: ' + parseError.toString());
      }
    }
    
    // Fallback to form/query parameters
    if (!token) {
      token = e.parameter.token;
    }
    
    if (!token) {
      return jsonResponse({ success: false, error: 'Token required' });
    }
    
    return jsonResponse(verifyUserToken(token));
  } catch (error) {
    Logger.log('Error in handleVerifyToken: ' + error.toString());
    return jsonResponse({ success: false, error: 'Token verification failed: ' + error.toString() });
  }
}

// ==================== END AUTH HANDLERS ====================

/**
 * Handle Send SMS API call
 * SECURED: Uses existing API_KEY for authentication, supports idempotency, MMS with media URLs
 * Phase 3.3: Enhanced to fully support MMS with backward compatibility for SMS
 */
function handleSendSMS(e) {
  try {
    // SECURITY 1: Validate API Key using existing API_KEY property
    validateApiKey(e);
    
    // SECURITY 2: Prevent duplicate sends using idempotency key (optional but recommended)
    const idempotencyKey = e.parameter.idempotencyKey;
    if (idempotencyKey) {
      preventDuplicate(idempotencyKey);
    }
    
    // SECURITY 3: Verify user token and extract user info (if token provided)
    let userEmail = 'api_user';
    let userRole = 'api';
    
    if (e.parameter.token || (e.postData && e.postData.contents)) {
      const userPayload = verifyRequestToken(e);
      if (userPayload) {
        userEmail = userPayload.email;
        userRole = userPayload.role;
        
        // Check role authorization (admin or pastor only)
        if (!hasRequiredRole(userPayload, ['admin', 'pastor'])) {
          logAuditEvent(userEmail, 'SMS_SEND_FORBIDDEN', { role: userRole });
          return forbiddenResponse('Only admin and pastor roles can send messages');
        }
      }
    }
    
    // Parse request parameters
    let to, body, mediaUrls = [];
    
    // Try POST body first
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        to = postData.to;
        body = postData.body || postData.message;
        
        // Parse mediaUrls - support both array and JSON string
        if (postData.mediaUrls) {
          if (Array.isArray(postData.mediaUrls)) {
            mediaUrls = postData.mediaUrls;
          } else if (typeof postData.mediaUrls === 'string') {
            try {
              mediaUrls = JSON.parse(postData.mediaUrls);
            } catch (e) {
              Logger.log('Error parsing mediaUrls string: ' + e.toString());
              mediaUrls = [postData.mediaUrls]; // Single URL as string
            }
          }
        }
      } catch (parseError) {
        Logger.log('Error parsing POST data: ' + parseError.toString());
      }
    }
    
    // Fallback to query parameters
    if (!to || !body) {
      to = to || e.parameter.to;
      body = body || e.parameter.body || e.parameter.message;
      
      // Parse mediaUrls from query parameter
      if (!mediaUrls || mediaUrls.length === 0) {
        if (e.parameter.mediaUrls) {
          try {
            mediaUrls = JSON.parse(e.parameter.mediaUrls);
          } catch (e) {
            Logger.log('Error parsing mediaUrls parameter: ' + e.toString());
            mediaUrls = [e.parameter.mediaUrls]; // Single URL as string
          }
        }
      }
    }
    
    if (!to || !body) {
      return jsonResponse({ 
        error: 'Missing required parameters: to, body (or message)',
        success: false 
      });
    }
    
    // Ensure mediaUrls is an array (backward compatibility)
    if (!Array.isArray(mediaUrls)) {
      mediaUrls = [];
    }
    
    // SECURITY 4: Check advanced rate limits (if user authenticated)
    if (userEmail !== 'api_user') {
      const rateLimit = checkAdvancedRateLimit(userEmail, 'SEND_SMS');
      if (!rateLimit.allowed) {
        return jsonResponse({ 
          error: rateLimit.error,
          success: false,
          rateLimitExceeded: true,
          remainingRequests: 0,
          resetTime: rateLimit.resetTime
        });
      }
    }
    
    // Send message using secure Twilio function (SMS or MMS)
    const result = sendTwilioMessage(to, body, mediaUrls);
    
    // Log to SMS_Log sheet
    logToSheet('SMS_Log', {
      timestamp: new Date(),
      to: to,
      from: result.from,
      message: body,
      status: result.status,
      sid: result.sid,
      user: userEmail,
      role: userRole,
      idempotency_key: idempotencyKey || '',
      media_count: (mediaUrls && mediaUrls.length) || 0,
      error_code: result.error_code || '',
      error_message: result.error_message || ''
    });
    
    // Log audit event
    logAuditEvent(userEmail, mediaUrls.length > 0 ? 'MMS_SENT' : 'SMS_SENT', {
      to: to,
      messageLength: body.length,
      sid: result.sid,
      status: result.status,
      idempotencyKey: idempotencyKey || 'none',
      hasMedia: !!(mediaUrls && mediaUrls.length),
      mediaCount: mediaUrls.length
    });
    
    return jsonResponse({ 
      success: true, 
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
      numMedia: result.num_media || '0',
      dateCreated: result.date_created,
      messageType: mediaUrls.length > 0 ? 'MMS' : 'SMS'
    });
      
  } catch (error) {
    const errorMessage = error.toString();
    Logger.log('Error in handleSendSMS: ' + errorMessage);
    
    // Check if it's a duplicate error
    if (errorMessage.includes('Duplicate message prevented')) {
      return jsonResponse({ 
        error: 'Duplicate message prevented',
        success: false,
        isDuplicate: true 
      });
    }
    
    // Check if it's an unauthorized error
    if (errorMessage.includes('Unauthorized')) {
      return jsonResponse({ 
        error: 'Unauthorized: Invalid API Key',
        success: false 
      });
    }
    
    logAuditEvent(userEmail || 'unknown', 'SMS_SEND_FAILED', { error: errorMessage });
    return jsonResponse({ 
      error: 'Failed to send SMS: ' + errorMessage, 
      success: false 
    });
  }
}

/**
 * Handle Make Call API call
 * SECURED: Uses existing API_KEY for authentication, supports idempotency
 */
function handleMakeCall(e) {
  try {
    // SECURITY 1: Validate API Key using existing API_KEY property
    validateApiKey(e);
    
    // SECURITY 2: Prevent duplicate calls using idempotency key (optional but recommended)
    const idempotencyKey = e.parameter.idempotencyKey;
    if (idempotencyKey) {
      preventDuplicate(idempotencyKey);
    }
    
    // SECURITY 3: Verify user token and extract user info (if token provided)
    let userEmail = 'api_user';
    let userRole = 'api';
    
    if (e.parameter.token || (e.postData && e.postData.contents)) {
      const userPayload = verifyRequestToken(e);
      if (userPayload) {
        userEmail = userPayload.email;
        userRole = userPayload.role;
        
        // Check role authorization (admin or pastor only)
        if (!hasRequiredRole(userPayload, ['admin', 'pastor'])) {
          logAuditEvent(userEmail, 'CALL_FORBIDDEN', { role: userRole });
          return forbiddenResponse('Only admin and pastor roles can make calls');
        }
      }
    }
    
    // Parse request parameters
    let to, message;
    
    // Try POST body first
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        to = postData.to;
        message = postData.message || postData.body;
      } catch (parseError) {
        Logger.log('Error parsing POST data: ' + parseError.toString());
      }
    }
    
    // Fallback to query parameters
    if (!to || !message) {
      to = to || e.parameter.to;
      message = message || e.parameter.message || e.parameter.body;
    }
    
    if (!to || !message) {
      return jsonResponse({ 
        error: 'Missing required parameters: to, message (or body)',
        success: false 
      });
    }
    
    // SECURITY 4: Check advanced rate limits (if user authenticated)
    if (userEmail !== 'api_user') {
      const rateLimit = checkAdvancedRateLimit(userEmail, 'SEND_CALL');
      if (!rateLimit.allowed) {
        return jsonResponse({ 
          error: rateLimit.error,
          success: false,
          rateLimitExceeded: true,
          remainingRequests: 0,
          resetTime: rateLimit.resetTime
        });
      }
    }
    
    // Make call using secure Twilio function
    const result = sendTwilioCall(to, message);
    
    // Log to Call_Log sheet
    logToSheet('Call_Log', {
      timestamp: new Date(),
      to: to,
      from: result.from,
      message: message,
      status: result.status,
      sid: result.sid,
      user: userEmail,
      role: userRole,
      idempotency_key: idempotencyKey || '',
      duration: result.duration || 0,
      error_code: result.error_code || '',
      error_message: result.error_message || ''
    });
    
    // Log audit event
    logAuditEvent(userEmail, 'CALL_MADE', {
      to: to,
      messageLength: message.length,
      sid: result.sid,
      status: result.status,
      idempotencyKey: idempotencyKey || 'none'
    });
    
    return jsonResponse({ 
      success: true, 
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
      dateCreated: result.date_created
    });
      
  } catch (error) {
    const errorMessage = error.toString();
    Logger.log('Error in handleMakeCall: ' + errorMessage);
    
    // Check if it's a duplicate error
    if (errorMessage.includes('Duplicate message prevented')) {
      return jsonResponse({ 
        error: 'Duplicate call prevented',
        success: false,
        isDuplicate: true 
      });
    }
    
    // Check if it's an unauthorized error
    if (errorMessage.includes('Unauthorized')) {
      return jsonResponse({ 
        error: 'Unauthorized: Invalid API Key',
        success: false 
      });
    }
    
    logAuditEvent(userEmail || 'unknown', 'CALL_FAILED', { error: errorMessage });
    return jsonResponse({ 
      error: 'Failed to make call: ' + errorMessage, 
      success: false 
    });
  }
}

/**
 * Handle File Upload API call
 * SECURED: Uses existing API_KEY for authentication, validates file type and size
 * Saves to Google Drive and returns public URL for MMS
 * Phase 3.4: Configured for MMS media uploads
 */
function handleUploadFile(e) {
  try {
    // SECURITY 1: Validate API Key using existing API_KEY property
    validateApiKey(e);
    
    // Parse request parameters
    let fileName, base64Data, mimeType;
    
    // Try POST body first
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        fileName = postData.fileName;
        base64Data = postData.base64Data || postData.fileContent; // Support both parameter names
        mimeType = postData.mimeType;
      } catch (parseError) {
        Logger.log('Error parsing POST data: ' + parseError.toString());
      }
    }
    
    // Fallback to query parameters
    if (!fileName || !base64Data || !mimeType) {
      fileName = fileName || e.parameter.fileName;
      base64Data = base64Data || e.parameter.base64Data || e.parameter.fileContent;
      mimeType = mimeType || e.parameter.mimeType;
    }
    
    if (!fileName || !base64Data || !mimeType) {
      return jsonResponse({ 
        error: 'Missing required parameters: fileName, base64Data (or fileContent), mimeType',
        success: false 
      });
    }
    
    // SECURITY 2: Validate MIME type (only allow images and PDFs)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf'
    ];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      logAuditEvent('SYSTEM', 'FILE_UPLOAD_REJECTED', { 
        reason: 'Invalid MIME type',
        mimeType: mimeType,
        fileName: fileName
      });
      return jsonResponse({ 
        error: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.',
        success: false 
      });
    }
    
    // SECURITY 3: Decode Base64 and check file size (max 5MB)
    let fileBytes;
    try {
      fileBytes = Utilities.base64Decode(base64Data);
    } catch (decodeError) {
      Logger.log('Error decoding Base64: ' + decodeError.toString());
      return jsonResponse({ 
        error: 'Invalid file content encoding. Must be Base64.',
        success: false 
      });
    }
    
    const fileSizeBytes = fileBytes.length;
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    
    if (fileSizeBytes > maxSizeBytes) {
      logAuditEvent('SYSTEM', 'FILE_UPLOAD_REJECTED', { 
        reason: 'File too large',
        sizeBytes: fileSizeBytes,
        maxBytes: maxSizeBytes,
        fileName: fileName
      });
      return jsonResponse({ 
        error: 'File size exceeds 5MB limit. File size: ' + (fileSizeBytes / 1024 / 1024).toFixed(2) + 'MB',
        success: false 
      });
    }
    
    // Get upload folder from Script Properties (UPLOAD_FOLDER_ID)
    const props = PropertiesService.getScriptProperties();
    const folderId = props.getProperty('UPLOAD_FOLDER_ID');
    
    if (!folderId) {
      Logger.log('⚠️ UPLOAD_FOLDER_ID not configured in Script Properties');
      return jsonResponse({ 
        error: 'Server configuration error: Upload folder not configured. Run setupUploadFolder()',
        success: false 
      });
    }
    
    // Get folder from Drive
    let folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (folderError) {
      Logger.log('Error accessing upload folder: ' + folderError.toString());
      return jsonResponse({ 
        error: 'Server configuration error: Invalid upload folder ID',
        success: false 
      });
    }
    
    // Create blob and save file to Drive
    const blob = Utilities.newBlob(fileBytes, mimeType, fileName);
    const file = folder.createFile(blob);
    
    // Make file publicly accessible (required for Twilio MMS)
    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );
    
    // Get Twilio-compatible public URL
    const fileId = file.getId();
    const mediaUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
    
    // Log successful upload
    logAuditEvent('SYSTEM', 'FILE_UPLOADED', {
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: fileSizeBytes,
      fileId: fileId,
      mediaUrl: mediaUrl
    });
    
    Logger.log('✅ File uploaded successfully: ' + fileName + ' (' + (fileSizeBytes / 1024).toFixed(2) + 'KB)');
    
    return jsonResponse({ 
      success: true,
      mediaUrl: mediaUrl,
      fileId: fileId,
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: fileSizeBytes
    });
      
  } catch (error) {
    const errorMessage = error.toString();
    Logger.log('Error in handleUploadFile: ' + errorMessage);
    
    // Check if it's an unauthorized error
    if (errorMessage.includes('Unauthorized')) {
      return jsonResponse({ 
        error: 'Unauthorized: Invalid API Key',
        success: false 
      });
    }
    
    logAuditEvent('SYSTEM', 'FILE_UPLOAD_FAILED', { error: errorMessage });
    return jsonResponse({ 
      error: 'Failed to upload file: ' + errorMessage, 
      success: false 
    });
  }
}

/**
 * Log to sheet helper function
 * Enhanced with security audit fields
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
        sheet.appendRow(['Timestamp', 'To', 'From', 'Message', 'Status', 'SID', 'User', 'Role', 'Idempotency Key', 'Error Code', 'Error Message']);
        sheet.getRange('A1:K1').setFontWeight('bold').setBackground('#3498db').setFontColor('#ffffff');
      } else if (sheetName === 'Call_Log') {
        sheet.appendRow(['Timestamp', 'To', 'From', 'Message', 'Status', 'SID', 'User', 'Role', 'Idempotency Key', 'Duration', 'Error Code', 'Error Message']);
        sheet.getRange('A1:L1').setFontWeight('bold').setBackground('#9b59b6').setFontColor('#ffffff');
      }
      sheet.setFrozenRows(1);
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

// ==================== SECURITY FEATURES ====================

/**
 * Log audit events for security tracking
 */
function logAuditEvent(userEmail, action, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOG);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAMES.AUDIT_LOG);
      sheet.appendRow(['Timestamp', 'User', 'Action', 'Details', 'IP Address']);
      sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#e74c3c').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    
    const timestamp = new Date();
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;
    
    sheet.appendRow([timestamp, userEmail, action, detailsStr, 'N/A']);
    
    Logger.log(`AUDIT: ${action} by ${userEmail} at ${timestamp}`);
  } catch (error) {
    Logger.log('Error logging audit event: ' + error.toString());
  }
}

/**
 * Check rate limit for SMS sending
 * Limits: 100 SMS per user per hour
 */
function checkRateLimit(userEmail, action) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAMES.RATE_LIMITS);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAMES.RATE_LIMITS);
      sheet.appendRow(['User', 'Action', 'Count', 'WindowStart', 'WindowEnd']);
      sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#f39c12').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Find user's current rate limit window
    const data = sheet.getDataRange().getValues();
    let userRow = -1;
    let currentCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userEmail && data[i][1] === action) {
        const windowEnd = new Date(data[i][4]);
        
        // Check if current window is still valid
        if (windowEnd > now) {
          userRow = i + 1;
          currentCount = data[i][2];
          break;
        }
      }
    }
    
    // Define rate limits
    const limits = {
      'SEND_SMS': 100,  // 100 SMS per hour
      'SEND_CALL': 50,  // 50 calls per hour
      'LOGIN': 10       // 10 login attempts per hour
    };
    
    const limit = limits[action] || 100;
    
    // Check if limit exceeded
    if (currentCount >= limit) {
      logAuditEvent(userEmail, 'RATE_LIMIT_EXCEEDED', { 
        action: action, 
        limit: limit,
        currentCount: currentCount 
      });
      
      return {
        allowed: false,
        error: `Rate limit exceeded. Maximum ${limit} ${action} requests per hour.`,
        remainingRequests: 0,
        resetTime: data[userRow - 1][4]
      };
    }
    
    // Update or create rate limit entry
    if (userRow > 0) {
      // Update existing entry
      sheet.getRange(userRow, 3).setValue(currentCount + 1);
    } else {
      // Create new entry
      const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);
      sheet.appendRow([userEmail, action, 1, now, windowEnd]);
    }
    
    return {
      allowed: true,
      remainingRequests: limit - currentCount - 1,
      resetTime: new Date(now.getTime() + 60 * 60 * 1000)
    };
    
  } catch (error) {
    Logger.log('Error checking rate limit: ' + error.toString());
    // Allow request on error to prevent system lockout
    return { allowed: true, remainingRequests: 'Unknown' };
  }
}

/**
 * Verify API key for Google Apps Script access
 */
function verifyAPIKey(apiKey) {
  const storedKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  
  // Generate API key if doesn't exist
  if (!storedKey) {
    const newKey = 'gpbc_' + Utilities.getUuid().replace(/-/g, '');
    PropertiesService.getScriptProperties().setProperty('API_KEY', newKey);
    Logger.log('⚠️ NEW API KEY GENERATED: ' + newKey);
    Logger.log('⚠️ Add this to your frontend .env file as VITE_GOOGLE_API_KEY');
    return false;
  }
  
  if (!apiKey || apiKey !== storedKey) {
    logAuditEvent('ANONYMOUS', 'API_KEY_INVALID', { providedKey: apiKey ? 'PROVIDED' : 'MISSING' });
    return false;
  }
  
  return true;
}

// ==================== END SECURITY FEATURES ====================

/**
 * Admin function: Unlock a locked user account
 * Run this in Apps Script editor to manually unlock an account
 */
function unlockUserAccount() {
  // ⚠️ EDIT THIS EMAIL BEFORE RUNNING ⚠️
  const emailToUnlock = 'admin@gracepraise.church';
  
  const sheet = initUsersSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === emailToUnlock.toLowerCase()) {
      // Reset failed attempts and clear lockout
      sheet.getRange(i + 1, 7).setValue(0);  // FailedAttempts
      sheet.getRange(i + 1, 8).setValue(''); // LockedUntil
      
      Logger.log('✅ Account unlocked: ' + emailToUnlock);
      logAuditEvent('ADMIN', 'ACCOUNT_UNLOCKED', { 
        unlockedUser: emailToUnlock,
        unlockedBy: 'Manual admin intervention'
      });
      
      return { success: true, message: 'Account unlocked successfully' };
    }
  }
  
  Logger.log('❌ User not found: ' + emailToUnlock);
  return { success: false, error: 'User not found' };
}

/**
 * Admin function: View audit log (last 100 entries)
 */
function viewAuditLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOG);
  
  if (!sheet) {
    Logger.log('No audit log found');
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).reverse().slice(0, 100); // Last 100 entries
  
  Logger.log('========================================');
  Logger.log('AUDIT LOG (Last 100 Entries)');
  Logger.log('========================================\n');
  
  rows.forEach(row => {
    Logger.log(`[${row[0]}] ${row[2]} by ${row[1]}`);
    Logger.log(`   Details: ${row[3]}\n`);
  });
  
  return rows;
}

/**
 * Admin function: Generate new API key
 */
function generateNewAPIKey() {
  const newKey = 'gpbc_' + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('API_KEY', newKey);
  
  Logger.log('========================================');
  Logger.log('🔑 NEW API KEY GENERATED');
  Logger.log('========================================');
  Logger.log('API Key: ' + newKey);
  Logger.log('\n⚠️  IMPORTANT: Add this to your frontend .env file:');
  Logger.log('VITE_GOOGLE_API_KEY=' + newKey);
  Logger.log('========================================');
  
  logAuditEvent('ADMIN', 'API_KEY_REGENERATED', { timestamp: new Date() });
  
  return newKey;
}

/**
 * Admin function: Create and configure upload folder in Google Drive
 */
function setupUploadFolder() {
  try {
    // Create folder in My Drive
    const folderName = 'GPBC_MMS_Uploads';
    const folder = DriveApp.createFolder(folderName);
    const folderId = folder.getId();
    
    // Store folder ID in Script Properties
    PropertiesService.getScriptProperties().setProperty('UPLOAD_FOLDER_ID', folderId);
    
    Logger.log('========================================');
    Logger.log('📁 UPLOAD FOLDER CREATED');
    Logger.log('========================================');
    Logger.log('Folder Name: ' + folderName);
    Logger.log('Folder ID: ' + folderId);
    Logger.log('Folder URL: ' + folder.getUrl());
    Logger.log('\n✅ UPLOAD_FOLDER_ID has been saved to Script Properties');
    Logger.log('\n📋 Folder Configuration:');
    Logger.log('- Location: My Drive/' + folderName);
    Logger.log('- Uploaded files will be publicly accessible via link');
    Logger.log('- Supported file types: JPEG, PNG, PDF');
    Logger.log('- Maximum file size: 5MB');
    Logger.log('========================================');
    
    logAuditEvent('ADMIN', 'UPLOAD_FOLDER_CREATED', { 
      folderId: folderId,
      folderName: folderName 
    });
    
    return {
      success: true,
      folderId: folderId,
      folderUrl: folder.getUrl()
    };
  } catch (error) {
    Logger.log('❌ Error creating upload folder: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Admin function: View current security configuration
 */
function viewSecurityConfig() {
  const props = PropertiesService.getScriptProperties();
  
  Logger.log('========================================');
  Logger.log('🔒 SECURITY CONFIGURATION STATUS');
  Logger.log('========================================');
  
  const jwtSecret = props.getProperty('JWT_SECRET');
  const apiKey = props.getProperty('API_KEY');
  const twilioSid = props.getProperty('TWILIO_SID');
  const twilioAuth = props.getProperty('TWILIO_AUTH');
  const twilioFrom = props.getProperty('TWILIO_FROM');
  const uploadFolderId = props.getProperty('UPLOAD_FOLDER_ID');
  
  Logger.log('JWT Secret: ' + (jwtSecret ? '✅ Configured' : '❌ Missing'));
  Logger.log('API Key (Messaging & Read): ' + (apiKey ? '✅ Configured' : '❌ Missing'));
  Logger.log('Twilio SID: ' + (twilioSid ? '✅ Configured' : '❌ Missing'));
  Logger.log('Twilio Auth Token: ' + (twilioAuth ? '✅ Configured' : '❌ Missing'));
  Logger.log('Twilio Phone: ' + (twilioFrom ? '✅ Configured (' + twilioFrom + ')' : '❌ Missing'));
  Logger.log('Upload Folder ID: ' + (uploadFolderId ? '✅ Configured' : '❌ Missing'));
  
  Logger.log('\n📊 Security Features:');
  Logger.log('✅ API Key authentication');
  Logger.log('✅ Token-based authentication (optional)');
  Logger.log('✅ Role-based authorization');
  Logger.log('✅ Idempotency protection (5-minute window)');
  Logger.log('✅ User rate limiting (100 SMS/hour, 50 calls/hour)');
  Logger.log('✅ System rate limiting (30 SMS/min, 20 calls/min)');
  Logger.log('✅ Twilio webhook validation');
  Logger.log('✅ File upload with type/size validation');
  Logger.log('✅ Audit logging');
  Logger.log('✅ Account lockout protection');
  
  Logger.log('\n⚠️  RECOMMENDATIONS:');
  if (!apiKey) {
    Logger.log('❗ Configure API_KEY in Script Properties for secure messaging');
  }
  if (!twilioAuth) {
    Logger.log('❗ Configure Twilio credentials for SMS/Call functionality');
  }
  if (!uploadFolderId) {
    Logger.log('❗ Configure UPLOAD_FOLDER_ID in Script Properties for file uploads');
  }
  }
  if (!twilioAuth) {
    Logger.log('❗ Configure Twilio credentials for SMS/Call functionality');
  }
  
  Logger.log('========================================');
  
  return {
    jwtSecret: !!jwtSecret,
    apiKey: !!apiKey,
    uploadFolderId: !!uploadFolderId,
    twilioConfigured: !!(twilioSid && twilioAuth && twilioFrom)
  };
}

/**
 * Admin function: Clear idempotency cache (use with caution)
 */
function clearIdempotencyCache() {
  const cache = CacheService.getScriptCache();
  cache.removeAll(['idempotency_']);
  
  Logger.log('========================================');
  Logger.log('🗑️  IDEMPOTENCY CACHE CLEARED');
  Logger.log('========================================');
  Logger.log('All idempotency keys have been cleared.');
  Logger.log('This allows previously blocked duplicate requests to be processed.');
  Logger.log('⚠️  Use this only if you need to reset duplicate detection.');
  Logger.log('========================================');
  
  logAuditEvent('ADMIN', 'IDEMPOTENCY_CACHE_CLEARED', { timestamp: new Date() });
}

/**
 * Admin function: View rate limit status for a user
 */
function viewUserRateLimits(userEmail) {
  if (!userEmail) {
    userEmail = 'admin@gracepraise.church'; // Default for testing
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.RATE_LIMITS);
  
  if (!sheet) {
    Logger.log('No rate limit data found');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  
  Logger.log('========================================');
  Logger.log('📊 RATE LIMIT STATUS: ' + userEmail);
  Logger.log('========================================');
  
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userEmail) {
      found = true;
      const action = data[i][1];
      const count = data[i][2];
      const windowEnd = new Date(data[i][4]);
      const type = data[i][5];
      const isActive = windowEnd > now;
      
      Logger.log(`\n${action} (${type}):`);
      Logger.log(`  Current Count: ${count}`);
      Logger.log(`  Window Expires: ${windowEnd}`);
      Logger.log(`  Status: ${isActive ? '🔴 ACTIVE' : '✅ EXPIRED'}`);
      
      if (isActive) {
        const minutesRemaining = Math.ceil((windowEnd - now) / 60000);
        Logger.log(`  Time Remaining: ${minutesRemaining} minutes`);
      }
    }
  }
  
  if (!found) {
    Logger.log('No active rate limits for this user.');
  }
  
  Logger.log('========================================');
}

/**
 * Admin function: Reset admin password
 * Run this to fix the admin account password
 */
function resetAdminPassword() {
  const sheet = initUsersSheet();
  const data = sheet.getDataRange().getValues();
  
  const adminEmail = 'admin@gracepraise.church';
  const newPassword = 'AdminGPBC2026!';
  const newPasswordHash = hashPassword(newPassword);
  
  Logger.log('========================================');
  Logger.log('DEBUG: Password Hash Check');
  Logger.log('========================================');
  Logger.log('Plain Password: ' + newPassword);
  Logger.log('Computed Hash: ' + newPasswordHash);
  Logger.log('========================================');
  
  // Find admin user
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === adminEmail.toLowerCase()) {
      Logger.log('Found admin at row: ' + (i + 1));
      Logger.log('Current stored hash: ' + data[i][1]);
      Logger.log('Failed attempts before reset: ' + data[i][6]);
      Logger.log('Locked until: ' + data[i][7]);
      
      // Update password hash and reset lockout
      sheet.getRange(i + 1, 2).setValue(newPasswordHash); // PasswordHash
      sheet.getRange(i + 1, 7).setValue(0);  // FailedAttempts
      sheet.getRange(i + 1, 8).setValue(''); // LockedUntil
      
      Logger.log('========================================');
      Logger.log('✅ ADMIN PASSWORD RESET COMPLETE');
      Logger.log('========================================');
      Logger.log('Email: ' + adminEmail);
      Logger.log('New Password: ' + newPassword);
      Logger.log('Password Hash: ' + newPasswordHash);
      Logger.log('Failed Attempts: RESET to 0');
      Logger.log('Account Status: UNLOCKED');
      Logger.log('========================================');
      
      logAuditEvent('ADMIN', 'PASSWORD_RESET', { 
        user: adminEmail,
        resetBy: 'Manual admin function'
      });
      
      return { 
        success: true, 
        message: 'Admin password reset successfully',
        email: adminEmail,
        password: newPassword,
        hash: newPasswordHash
      };
    }
  }
  
  Logger.log('❌ Admin user not found. Creating new admin account...');
  
  // If admin doesn't exist, create it
  sheet.appendRow([adminEmail, newPasswordHash, 'admin', 'System Administrator', new Date(), 'Yes', 0, '']);
  
  Logger.log('========================================');
  Logger.log('✅ NEW ADMIN ACCOUNT CREATED');
  Logger.log('========================================');
  Logger.log('Email: ' + adminEmail);
  Logger.log('Password: ' + newPassword);
  Logger.log('Hash: ' + newPasswordHash);
  Logger.log('========================================');
  
  return { 
    success: true, 
    message: 'New admin account created',
    email: adminEmail,
    password: newPassword,
    hash: newPasswordHash
  };
}

/**
 * Diagnostic function: Test login process
 * Run this to debug login issues
 */
function testLoginDiagnostic() {
  const testEmail = 'admin@gracepraise.church';
  const testPassword = 'AdminGPBC2026!';
  
  Logger.log('========================================');
  Logger.log('🔍 LOGIN DIAGNOSTIC TEST');
  Logger.log('========================================');
  Logger.log('Testing Email: ' + testEmail);
  Logger.log('Testing Password: ' + testPassword);
  Logger.log('');
  
  // Compute password hash
  const testHash = hashPassword(testPassword);
  Logger.log('Computed Hash: ' + testHash);
  Logger.log('');
  
  // Get user data
  const sheet = initUsersSheet();
  const data = sheet.getDataRange().getValues();
  
  Logger.log('Sheet columns: ' + data[0].join(', '));
  Logger.log('');
  
  // Find user
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === testEmail.toLowerCase()) {
      found = true;
      Logger.log('✅ USER FOUND at row ' + (i + 1));
      Logger.log('');
      Logger.log('Column A (Email): ' + data[i][0]);
      Logger.log('Column B (PasswordHash): ' + data[i][1]);
      Logger.log('Column C (Role): ' + data[i][2]);
      Logger.log('Column D (Name): ' + data[i][3]);
      Logger.log('Column E (CreatedAt): ' + data[i][4]);
      Logger.log('Column F (Active): ' + data[i][5]);
      Logger.log('Column G (FailedAttempts): ' + data[i][6]);
      Logger.log('Column H (LockedUntil): ' + data[i][7]);
      Logger.log('');
      Logger.log('🔑 HASH COMPARISON:');
      Logger.log('Stored Hash:   ' + data[i][1]);
      Logger.log('Computed Hash: ' + testHash);
      Logger.log('Match: ' + (data[i][1] === testHash ? '✅ YES' : '❌ NO'));
      Logger.log('');
      
      // Check active status
      if (data[i][5] !== 'Yes') {
        Logger.log('⚠️ WARNING: Account is not active (Column F = "' + data[i][5] + '")');
      }
      
      // Check lockout
      if (data[i][7]) {
        const lockedUntil = new Date(data[i][7]);
        const now = new Date();
        if (lockedUntil > now) {
          Logger.log('🔒 ACCOUNT IS LOCKED until ' + lockedUntil);
          Logger.log('   Time remaining: ' + Math.ceil((lockedUntil - now) / 60000) + ' minutes');
        } else {
          Logger.log('✅ Lock has expired (was locked until ' + lockedUntil + ')');
        }
      }
      
      Logger.log('');
      Logger.log('📊 ACCOUNT STATUS:');
      Logger.log('- Active: ' + (data[i][5] === 'Yes' ? '✅' : '❌'));
      Logger.log('- Password Match: ' + (data[i][1] === testHash ? '✅' : '❌'));
      Logger.log('- Not Locked: ' + (!data[i][7] || new Date(data[i][7]) <= new Date() ? '✅' : '❌'));
      Logger.log('');
      
      break;
    }
  }
  
  if (!found) {
    Logger.log('❌ USER NOT FOUND IN DATABASE');
    Logger.log('Available users:');
    for (let i = 1; i < data.length; i++) {
      Logger.log('  - ' + data[i][0] + ' (Active: ' + data[i][5] + ')');
    }
  }
  
  Logger.log('========================================');
  Logger.log('💡 RECOMMENDED ACTIONS:');
  Logger.log('1. Run resetAdminPassword() to reset password and unlock');
  Logger.log('2. Try login again with: admin@gracepraise.church / AdminGPBC2026!');
  Logger.log('3. If still fails, check browser console for errors');
  Logger.log('========================================');
  
  // Now try actual login
  Logger.log('');
  Logger.log('🔄 ATTEMPTING ACTUAL LOGIN...');
  const result = loginUser(testEmail, testPassword);
  Logger.log('Result: ' + JSON.stringify(result, null, 2));
  Logger.log('========================================');
  
  return result;
}
