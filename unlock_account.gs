/**
 * Quick unlock function - paste this into Apps Script editor and run
 */
function quickUnlock() {
  const SHEET_NAMES = {
    USERS: 'Users'
  };
  
  // Email to unlock - change this if needed
  const emailToUnlock = 'admin@gracepraise.church';
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  
  if (!sheet) {
    Logger.log('❌ Users sheet not found');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === emailToUnlock.toLowerCase()) {
      // Reset failed attempts (column G/7) and clear lockout (column H/8)
      sheet.getRange(i + 1, 7).setValue(0);
      sheet.getRange(i + 1, 8).setValue('');
      
      Logger.log('✅ Account unlocked: ' + emailToUnlock);
      Logger.log('Failed attempts reset to 0');
      Logger.log('You can now login immediately');
      return;
    }
  }
  
  Logger.log('❌ User not found: ' + emailToUnlock);
}
