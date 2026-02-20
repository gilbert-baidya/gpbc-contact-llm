import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, Phone, Loader, UserPlus, X, Sparkles, Wand2, Info, AlertTriangle, Eraser, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchContacts, bulkSendSMS, bulkMakeCall, Contact, sendSMS } from '../services/googleAppsScriptService';
import { llmApi, getBackendInfo } from '../api/llmBackend';
import { FileUpload } from '../components/FileUpload';
import { 
  addCost, 
  getCostSummary, 
  checkBudgetWarning, 
  getBudgetStatus,
  WEEKLY_BUDGET,
  MONTHLY_BUDGET,
  YEARLY_BUDGET,
  type CostTrackerData
} from '../services/costTracker';

export const MessagingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const groupFilter = searchParams.get('group');
  
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<'sms' | 'voice'>('sms');
  const [sendToAll, setSendToAll] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0 });
  const [showContactModal, setShowContactModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [useAIPersonalization, setUseAIPersonalization] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSmsInfo, setShowSmsInfo] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [costSummary, setCostSummary] = useState<CostTrackerData | null>(null);
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [budgetWarningData, setBudgetWarningData] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [expandPreview, setExpandPreview] = useState(false);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const [undoCountdown, setUndoCountdown] = useState<number>(0);
  const [isUndoPending, setIsUndoPending] = useState(false);

  // Twilio USA Pricing Constants
  const SMS_COST_GSM = 0.0083;      // GSM-7 per segment
  const SMS_COST_UNICODE = 0.0166;  // Unicode per segment
  const MMS_COST = 0.02;            // Flat per message

  // SMS Text Sanitizer - Converts Unicode to GSM-safe ASCII
  const sanitizeSmsText = (text: string): string => {
    if (!text) return text;

    let cleaned = text;

    // Step 1: Normalize Unicode to decomposed form (NFKD)
    cleaned = cleaned.normalize('NFKD');

    // Step 2: Replace common Unicode characters with ASCII equivalents
    const replacements: Record<string, string> = {
      // Smart quotes
      '\u2018': "'",  // Left single quotation mark
      '\u2019': "'",  // Right single quotation mark
      '\u201C': '"',  // Left double quotation mark
      '\u201D': '"',  // Right double quotation mark
      '\u201A': ',',  // Single low-9 quotation mark
      '\u201E': '"',  // Double low-9 quotation mark
      '\u2039': '<',  // Single left-pointing angle quotation
      '\u203A': '>',  // Single right-pointing angle quotation
      // Dashes and hyphens
      '\u2013': '-',  // En dash
      '\u2014': '-',  // Em dash
      '\u2015': '-',  // Horizontal bar
      '\u2212': '-',  // Minus sign
      // Spaces
      '\u00A0': ' ',  // Non-breaking space
      '\u2000': ' ',  // En quad
      '\u2001': ' ',  // Em quad
      '\u2002': ' ',  // En space
      '\u2003': ' ',  // Em space
      '\u2004': ' ',  // Three-per-em space
      '\u2005': ' ',  // Four-per-em space
      '\u2006': ' ',  // Six-per-em space
      '\u2007': ' ',  // Figure space
      '\u2008': ' ',  // Punctuation space
      '\u2009': ' ',  // Thin space
      '\u200A': ' ',  // Hair space
      '\u202F': ' ',  // Narrow no-break space
      '\u205F': ' ',  // Medium mathematical space
      // Ellipsis
      '\u2026': '...',  // Horizontal ellipsis
      // Bullets and symbols
      '\u2022': '*',  // Bullet
      '\u2023': '>',  // Triangular bullet
      '\u2043': '-',  // Hyphen bullet
      '\u25E6': '*',  // White bullet
      '\u00B7': '*',  // Middle dot
      '\u2219': '*',  // Bullet operator
      // Currency
      '\u20AC': 'EUR', // Euro sign (keep € for GSM-7)
      '\u00A2': 'c',   // Cent sign
      '\u00A3': '£',   // Pound sign (GSM-7 compatible)
      '\u00A5': '¥',   // Yen sign (GSM-7 compatible)
      // Copyright and trademark
      '\u00A9': '(c)',   // Copyright
      '\u00AE': '(R)',   // Registered trademark
      '\u2122': '(TM)',  // Trademark
      // Arrows
      '\u2190': '<-',  // Leftwards arrow
      '\u2192': '->',  // Rightwards arrow
      '\u2191': '^',   // Upwards arrow
      '\u2193': 'v',   // Downwards arrow
    };

    // Apply replacements
    Object.entries(replacements).forEach(([unicode, ascii]) => {
      cleaned = cleaned.replace(new RegExp(unicode, 'g'), ascii);
    });

    // Step 3: Remove zero-width and invisible characters
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Step 4: Remove emojis and other Unicode symbols (beyond Basic Latin + GSM-7 extensions)
    // Keep only GSM-7 compatible characters (including digits 0-9)
    const gsmCharsPattern = /[^@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-.\/0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà\n\r\^{}\\[~\]|€\s]/g;
    cleaned = cleaned.replace(gsmCharsPattern, '');

    // Step 5: Collapse multiple spaces
    cleaned = cleaned.replace(/  +/g, ' ');

    // Step 6: Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
  };

  // Detect problematic Unicode characters
  const detectUnicodeIssues = (text: string): { hasIssues: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (/[\u2018\u2019\u201C\u201D]/.test(text)) {
      issues.push('Smart quotes detected');
    }
    if (/[\u2013\u2014]/.test(text)) {
      issues.push('Em/en dashes detected');
    }
    if (/\u00A0/.test(text)) {
      issues.push('Non-breaking spaces detected');
    }
    if (/[\u200B-\u200D\uFEFF]/.test(text)) {
      issues.push('Invisible characters detected');
    }
    if (/[\p{Emoji}]/u.test(text)) {
      issues.push('Emojis detected');
    }
    // Detect non-Latin scripts (Bengali, Hindi, Arabic, Chinese, etc.)
    if (/[\u0980-\u09FF]/.test(text)) {
      issues.push('Bengali characters detected');
    }
    if (/[\u0900-\u097F]/.test(text)) {
      issues.push('Hindi characters detected');
    }
    if (/[\u0600-\u06FF]/.test(text)) {
      issues.push('Arabic characters detected');
    }
    if (/[\u4E00-\u9FFF]/.test(text)) {
      issues.push('Chinese characters detected');
    }

    return { hasIssues: issues.length > 0, issues };
  };

  // Calculate SMS segments and cost
  const calculateSmsInfo = (text: string) => {
    const length = text.length;
    
    // Detect if message contains Unicode characters (non-GSM-7)
    // GSM-7 charset: basic ASCII + some European chars + digits 0-9
    const gsmChars = /^[@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-.\/0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà\n\r\^{}\\[~\]|€]*$/;
    const isUnicode = !gsmChars.test(text);
    
    let segments = 0;
    let charLimit = 0;
    let perSegmentLimit = 0;
    
    if (isUnicode) {
      // Unicode: 70 chars for single, 67 for multi-part
      charLimit = 70;
      perSegmentLimit = 67;
    } else {
      // GSM-7: 160 chars for single, 153 for multi-part
      charLimit = 160;
      perSegmentLimit = 153;
    }
    
    if (length === 0) {
      segments = 0;
    } else if (length <= charLimit) {
      segments = 1;
    } else {
      segments = Math.ceil(length / perSegmentLimit);
    }
    
    // Twilio US SMS cost: ~$0.0083 per segment
    const costPerSegment = 0.0083;
    const estimatedCost = segments * costPerSegment;
    
    return {
      length,
      segments,
      isUnicode,
      charLimit: segments <= 1 ? charLimit : perSegmentLimit,
      estimatedCost,
      costPerSegment
    };
  };

  const smsInfo = calculateSmsInfo(messageContent);
  const unicodeIssues = messageType === 'sms' ? detectUnicodeIssues(messageContent) : { hasIssues: false, issues: [] };

  // Detect MMS mode
  const isMMS = messageType === 'sms' && mediaUrls && mediaUrls.length > 0;

  // Calculate total estimated cost with proper breakdown
  const recipientsCount = sendToAll ? allContacts.length : selectedContacts.length;
  
  const calculateCostBreakdown = () => {
    let messageType = 'SMS';
    let perRecipient = 0;

    if (isMMS) {
      messageType = 'MMS';
      perRecipient = MMS_COST;
    } else {
      // SMS: differentiate GSM-7 vs Unicode pricing
      const costPerSegment = smsInfo.isUnicode ? SMS_COST_UNICODE : SMS_COST_GSM;
      perRecipient = smsInfo.segments * costPerSegment;
      messageType = smsInfo.isUnicode ? 'SMS (Unicode)' : 'SMS (GSM-7)';
    }

    const totalCost = perRecipient * recipientsCount;

    return {
      perRecipient,
      totalRecipients: recipientsCount,
      totalCost,
      messageType
    };
  };

  const costBreakdown = calculateCostBreakdown();
  const estimatedCost = costBreakdown.totalCost;

  // Handler to clean text
  const handleCleanText = () => {
    const cleaned = sanitizeSmsText(messageContent);
    if (cleaned !== messageContent) {
      setMessageContent(cleaned);
      toast.success('Text cleaned! Converted to GSM-7 format.');
    } else {
      toast('Text is already GSM-7 compatible', { icon: '✓' });
    }
  };

  useEffect(() => {
    loadContacts();
    
    // Load cost summary
    setCostSummary(getCostSummary());
    
    // Update cost summary every 10 seconds
    const interval = setInterval(() => {
      setCostSummary(getCostSummary());
    }, 10000);
    
    // Cleanup function
    return () => {
      clearInterval(interval);
      // Clear undo timer if component unmounts
      if (undoTimer) {
        clearInterval(undoTimer);
      }
    };
  }, [undoTimer]);

  useEffect(() => {
    checkPreSelectedContacts();
  }, [allContacts, groupFilter]);

  const loadContacts = async () => {
    try {
      const data = await fetchContacts();
      setAllContacts(data.filter(c => c.optIn === 'Yes'));
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('Failed to load contacts');
    }
  };

  const checkPreSelectedContacts = () => {
    // Check if coming from group click
    if (groupFilter && allContacts.length > 0) {
      const groupContacts = allContacts.filter(c => c.group === groupFilter);
      setSelectedContacts(groupContacts);
      setSendToAll(false);
      toast.success(`${groupContacts.length} contacts selected from ${groupFilter} group`);
      return;
    }

    // Check session storage
    const preSelected = sessionStorage.getItem('selectedSheetContacts');
    if (preSelected) {
      const contacts = JSON.parse(preSelected);
      setSelectedContacts(contacts);
      setSendToAll(false);
      sessionStorage.removeItem('selectedSheetContacts');
    }
  };

  const handleSend = async () => {
    if (!messageContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const targets = sendToAll ? allContacts : selectedContacts;
    
    if (targets.length === 0) {
      toast.error('Please select contacts or choose "Send to All"');
      return;
    }

    // Show confirmation modal first
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmModal(false);
    
    // Check budget warning after confirmation
    const budgetCheck = checkBudgetWarning(estimatedCost);
    if (budgetCheck.hasWarning) {
      setBudgetWarningData(budgetCheck);
      setShowBudgetWarning(true);
      return; // Wait for user confirmation
    }

    // Start 10-second undo grace period
    startUndoTimer();
  };

  const startUndoTimer = () => {
    // Clear any existing timer
    if (undoTimer) {
      clearInterval(undoTimer);
    }

    setIsUndoPending(true);
    setUndoCountdown(10);

    // Show toast with undo option
    toast.loading(
      (t) => (
        <div className="flex items-center gap-3">
          <span>Sending in {undoCountdown}s...</span>
          <button
            onClick={() => {
              handleUndo();
              toast.dismiss(t.id);
            }}
            className="px-3 py-1 bg-white text-red-600 rounded font-medium hover:bg-red-50 border border-red-200 transition-colors"
          >
            Undo
          </button>
        </div>
      ),
      { id: 'undo-timer', duration: Infinity }
    );

    // Countdown timer
    let countdown = 10;
    const timer = setInterval(() => {
      countdown -= 1;
      setUndoCountdown(countdown);

      if (countdown <= 0) {
        clearInterval(timer);
        setUndoTimer(null);
        setIsUndoPending(false);
        toast.dismiss('undo-timer');
        // Proceed with send
        executeSend();
      } else {
        // Update toast message
        toast.loading(
          (t) => (
            <div className="flex items-center gap-3">
              <span>Sending in {countdown}s...</span>
              <button
                onClick={() => {
                  handleUndo();
                  toast.dismiss(t.id);
                }}
                className="px-3 py-1 bg-white text-red-600 rounded font-medium hover:bg-red-50 border border-red-200 transition-colors"
              >
                Undo
              </button>
            </div>
          ),
          { id: 'undo-timer', duration: Infinity }
        );
      }
    }, 1000);

    setUndoTimer(timer);
  };

  const handleUndo = () => {
    // Clear the timer
    if (undoTimer) {
      clearInterval(undoTimer);
      setUndoTimer(null);
    }

    setIsUndoPending(false);
    setUndoCountdown(0);
    toast.dismiss('undo-timer');
    toast.success('Send cancelled', { duration: 2000 });
  };

  const executeSend = async () => {
    setShowBudgetWarning(false);
    setIsSending(true);
    setProgress({ sent: 0, total: (sendToAll ? allContacts : selectedContacts).length });
    
    const targets = sendToAll ? allContacts : selectedContacts;
    let successCount = 0;
    
    try {
      if (messageType === 'sms') {
        // Check if this is an MMS (has media attachments)
        const isMMS = mediaUrls.length > 0;
        
        // If AI personalization is enabled, personalize each message
        if (useAIPersonalization) {
          toast.loading('✨ Personalizing messages...', { id: 'personalizing' });
          let sent = 0;
          
          for (const contact of targets) {
            try {
              // Simple personalization - always add name at the start
              let personalizedMsg = messageContent;
              
              // Check if name is already in the message
              const lowerMsg = messageContent.toLowerCase();
              const contactFirstName = contact.name.split(' ')[0]; // Get first name only
              const hasName = lowerMsg.includes(contactFirstName.toLowerCase());
              
              if (!hasName) {
                // Add name at the beginning
                if (lowerMsg.startsWith('hi') || lowerMsg.startsWith('hello')) {
                  // Replace "Hi" with "Hi [Name]"
                  personalizedMsg = messageContent.replace(/^(hi|hello)\s*/i, `$1 ${contactFirstName}, `);
                } else {
                  // Just prepend name
                  personalizedMsg = `${contactFirstName}, ${messageContent}`;
                }
              }

              console.log(`Personalizing for ${contact.name}: "${messageContent}" → "${personalizedMsg}"`);

              // Send personalized message (sanitize for SMS, include media for MMS)
              const finalMsg = sanitizeSmsText(personalizedMsg);
              await sendSMS(contact.phone, finalMsg, undefined, isMMS ? mediaUrls : undefined);
              sent++;
              successCount++;
              setProgress({ sent, total: targets.length });
              
              // Small delay to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`Failed to personalize for ${contact.name}:`, error);
              // Fallback to original message (sanitized)
              const fallbackMsg = sanitizeSmsText(messageContent);
              await sendSMS(contact.phone, fallbackMsg, undefined, isMMS ? mediaUrls : undefined);
              sent++;
              successCount++;
              setProgress({ sent, total: targets.length });
            }
          }
          toast.success(`✨ ${sent} personalized ${isMMS ? 'MMS' : 'SMS'} messages sent!`, { id: 'personalizing' });
        } else {
          // Send same message to everyone
          const onProgress = (sent: number) => {
            setProgress({ sent, total: targets.length });
          };
          // Sanitize message before sending for SMS
          const finalMessage = messageType === 'sms' ? sanitizeSmsText(messageContent) : messageContent;
          
          // Send to each contact (with media URLs if MMS)
          let sent = 0;
          for (const contact of targets) {
            await sendSMS(contact.phone, finalMessage, undefined, isMMS ? mediaUrls : undefined);
            sent++;
            successCount++;
            onProgress(sent);
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          if (finalMessage !== messageContent) {
            toast.success(`${isMMS ? 'MMS' : 'SMS'} cleaned and sent to ${targets.length} contact(s)`);
          } else {
            toast.success(`${isMMS ? 'MMS' : 'SMS'} sent to ${targets.length} contact(s)`);
          }
        }
      } else {
        const onProgress = (sent: number) => {
          setProgress({ sent, total: targets.length });
        };
        await bulkMakeCall(targets, messageContent, onProgress);
        toast.success(`Calls initiated to ${targets.length} contact(s)`);
      }

      setMessageContent('');
      setSelectedContacts([]);
      setSendToAll(false);
      setUseAIPersonalization(false);
      setMediaUrls([]);
      
      // Track cost only for successful sends
      if (successCount > 0 && messageType === 'sms') {
        const actualCost = costBreakdown.perRecipient * successCount;
        addCost(actualCost);
        setCostSummary(getCostSummary());
        console.log(`Cost tracked: $${actualCost.toFixed(4)} for ${successCount} messages`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send messages');
    } finally {
      setIsSending(false);
      setProgress({ sent: 0, total: 0 });
    }
  };

  const handleSendTest = async () => {
    if (!messageContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // Get test phone number from environment variable
    const testPhone = import.meta.env.VITE_TEST_PHONE;
    
    if (!testPhone) {
      toast.error('Test phone number not configured. Set VITE_TEST_PHONE in .env');
      alert('TEST PHONE not configured');
      return;
    }

    // Calculate test message cost
    const isMMS = mediaUrls.length > 0;
    const testCost = isMMS ? MMS_COST : (smsInfo.segments * (smsInfo.isUnicode ? SMS_COST_UNICODE : SMS_COST_GSM));

    // Check budget warning before sending test
    const budgetCheck = checkBudgetWarning(testCost);
    if (budgetCheck.hasWarning) {
      const proceed = window.confirm(
        `Budget Warning: ${budgetCheck.message}\n\n` +
        `${budgetCheck.type.charAt(0).toUpperCase() + budgetCheck.type.slice(1)} Budget: $${budgetCheck.budget.toFixed(2)}\n` +
        `Current: $${budgetCheck.currentCost.toFixed(2)}\n` +
        `Test Message: $${testCost.toFixed(4)}\n` +
        `New Total: $${budgetCheck.newTotal.toFixed(2)}\n\n` +
        `Send test message anyway?`
      );
      if (!proceed) {
        return;
      }
    }

    // Safety logging - confirm test recipient
    console.log('🧪 Sending TEST message to:', testPhone);
    console.log('📝 Message length:', messageContent.length, 'chars');
    console.log('📎 Attachments:', mediaUrls.length);
    console.log('💰 Test cost:', `$${testCost.toFixed(4)}`);

    setIsSending(true);
    
    try {
      const finalMessage = sanitizeSmsText(messageContent);
      
      // Safety check - ensure we're only sending to test phone
      console.log('✅ SAFETY CHECK: Test recipient confirmed as', testPhone);
      
      // Send test message (with media URLs if MMS)
      await sendSMS(testPhone, finalMessage, undefined, isMMS ? mediaUrls : undefined);
      
      // Track cost after successful test send
      addCost(testCost);
      setCostSummary(getCostSummary());
      console.log(`✅ Test message sent successfully - Cost tracked: $${testCost.toFixed(4)}`);
      
      toast.success(`Test ${isMMS ? 'MMS' : 'SMS'} sent to ${testPhone}`);
    } catch (error: any) {
      console.error('❌ Test message failed:', error);
      toast.error(error.message || 'Failed to send test message');
    } finally {
      setIsSending(false);
    }
  };

  const templates = [
    { label: 'Weekly Service', text: 'Join us this Sunday at 10 AM for worship service. See you there!' },
    { label: 'Prayer Request', text: 'We are praying for you. Please share your prayer requests with us.' },
    { label: 'Event Invitation', text: 'You are invited to our special event. Please RSVP.' },
    { label: 'Reminder', text: 'This is a friendly reminder about our upcoming service.' }
  ];

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredContacts = allContacts.filter((c) => {
    const name = (c.name ?? '').toString().toLowerCase();
    const phone = (c.phone ?? '').toString();
    return (
      name.includes(normalizedSearchTerm) ||
      phone.includes(searchTerm)
    );
  });

  const toggleContact = (contact: Contact) => {
    if (selectedContacts.find(c => c.id === contact.id)) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const removeContact = (contactId: number) => {
    setSelectedContacts(selectedContacts.filter(c => c.id !== contactId));
  };

  const getAISuggestions = async () => {
    if (!messageContent.trim()) {
      toast.error('Enter a message first to get AI suggestions');
      return;
    }

    setLoadingSuggestions(true);
    try {
      const suggestions = await llmApi.getReplySuggestions(messageContent);
      setAiSuggestions(suggestions);
      
      // Show backend info in console
      const backendInfo = getBackendInfo();
      console.log('AI Suggestions from:', backendInfo.type);
      
      toast.success(`✨ AI suggestions generated (${backendInfo.type})`);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      const backendInfo = getBackendInfo();
      toast.error(`Failed to generate suggestions. Check ${backendInfo.type} connection.`);
      setAiSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Page Header - Compact on mobile */}
      <div className="flex items-center gap-2 sm:gap-3">
        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primary-600" />
        <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900">Send Message</h1>
      </div>

      {/* Undo Banner */}
      {isUndoPending && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-md animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-900">
                  Sending in {undoCountdown} second{undoCountdown !== 1 ? 's' : ''}...
                </p>
                <p className="text-sm text-yellow-700">
                  Your message will be sent to {recipientsCount} recipient{recipientsCount !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
            <button
              onClick={handleUndo}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <X className="w-4 h-4" />
              Undo
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Message Composer */}
        <div className="lg:col-span-2 card p-3 sm:p-4 lg:p-6">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Compose Message</h2>

          {/* Message Type - Compact toggle buttons */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Message Type
            </label>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
              <button
                type="button"
                onClick={() => setMessageType('sms')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  messageType === 'sms'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>SMS Text</span>
              </button>
              <button
                type="button"
                onClick={() => setMessageType('voice')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  messageType === 'voice'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Voice Call</span>
              </button>
            </div>
          </div>

          {/* Message Content */}
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Message
              </label>
              <button
                type="button"
                onClick={getAISuggestions}
                disabled={loadingSuggestions || !messageContent.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingSuggestions ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Improve
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="input min-h-[120px] sm:min-h-[140px] lg:min-h-[150px] text-sm"
                placeholder={messageType === 'sms' ? 'Type your message...' : 'This message will be read aloud...'}
              />
              
              {/* SMS Cost Info Icon - Right Side */}
              {messageType === 'sms' && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="relative group">
                    <button
                      type="button"
                      onMouseEnter={() => setShowSmsInfo(true)}
                      onMouseLeave={() => setShowSmsInfo(false)}
                      onClick={() => setShowSmsInfo(!showSmsInfo)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                      aria-label="SMS cost information"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    
                    {/* Tooltip */}
                    {showSmsInfo && (
                      <div className="absolute top-0 right-full mr-2 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 text-left">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-gray-900 border-b pb-2">
                            📱 SMS Cost & Character Guide
                          </h4>
                          
                          <div className="space-y-2 text-xs text-gray-700">
                            <div>
                              <p className="font-medium text-gray-800 mb-1">English SMS:</p>
                              <ul className="list-disc list-inside space-y-0.5 ml-2">
                                <li>160 characters = 1 segment (~$0.0083/segment)</li>
                                <li>Long SMS: 153 chars per segment when split</li>
                              </ul>
                            </div>
                            
                            <div>
                              <p className="font-medium text-gray-800 mb-1">Bangla / Emoji / Unicode SMS:</p>
                              <ul className="list-disc list-inside space-y-0.5 ml-2">
                                <li>70 characters = 1 segment (~$0.0083/segment)</li>
                                <li>Long SMS: 67 chars per segment when split</li>
                              </ul>
                            </div>
                            
                            <div className="pt-2 border-t">
                              <p className="font-medium text-gray-800 mb-1">💡 Examples:</p>
                              <ul className="list-disc list-inside space-y-0.5 ml-2">
                                <li>150 English chars = $0.0083</li>
                                <li>300 English chars = $0.0166</li>
                                <li>60 Bangla chars = $0.0083</li>
                                <li>120 Bangla chars = $0.0166</li>
                              </ul>
                            </div>
                            
                            <div className="pt-2 border-t text-gray-600">
                              <p className="mb-1">📞 Monthly costs:</p>
                              <ul className="list-disc list-inside space-y-0.5 ml-2">
                                <li>Local number: ~$1.15/month</li>
                                <li>Toll-free: ~$2.15/month</li>
                              </ul>
                              <p className="mt-2 text-[10px] italic">* Carrier fees may apply. Each segment billed separately.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Unicode Warning Banner */}
            {messageType === 'sms' && smsInfo.isUnicode && unicodeIssues.hasIssues && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-900 mb-1">
                      Unicode Detected – SMS Cost May Double!
                    </p>
                    <p className="text-xs text-amber-700 mb-2">
                      {unicodeIssues.issues.join(', ')}. Your message will use Unicode encoding (70 chars/segment vs 160 for GSM).
                    </p>
                    <button
                      onClick={handleCleanText}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      Clean Text (Convert to GSM-7)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Estimated Cost Panel */}
            {messageType === 'sms' && recipientsCount > 0 && (
              <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-blue-900">Estimated Cost</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Type</div>
                    <div className="font-semibold text-gray-900">
                      {isMMS ? 'MMS' : smsInfo.isUnicode ? 'SMS (Unicode)' : 'SMS (GSM-7)'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Recipients</div>
                    <div className="font-semibold text-gray-900">{recipientsCount}</div>
                  </div>
                  
                  {!isMMS && (
                    <>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Segments</div>
                        <div className="font-semibold text-gray-900">{smsInfo.segments}</div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Encoding</div>
                        <div className={`font-semibold ${smsInfo.isUnicode ? 'text-amber-700' : 'text-green-700'}`}>
                          {smsInfo.isUnicode ? 'Unicode' : 'GSM-7'}
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Per Recipient</div>
                    <div className="font-semibold text-gray-900">${costBreakdown.perRecipient.toFixed(4)}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Total Cost</div>
                    <div className={`text-lg font-bold ${isMMS ? 'text-orange-600' : 'text-blue-600'}`}>
                      ${costBreakdown.totalCost.toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* SMS/MMS Stats Display with Cost Calculator */}
            {messageType === 'sms' && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-3 text-gray-600">
                    <span>
                      {smsInfo.length} chars
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      smsInfo.isUnicode ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {smsInfo.isUnicode ? 'Unicode' : 'GSM-7'}
                    </span>
                    <span className="font-medium">
                      {smsInfo.segments} segment{smsInfo.segments !== 1 ? 's' : ''}
                    </span>
                    {smsInfo.isUnicode && !isMMS && (
                      <button
                        onClick={handleCleanText}
                        className="ml-2 px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-[10px] font-medium transition-colors inline-flex items-center gap-1"
                        title="Convert to GSM-7 to reduce cost"
                      >
                        <Eraser className="w-3 h-3" />
                        Clean
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Cost Estimator */}
                {recipientsCount > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm space-y-1.5">
                    <div className="font-semibold text-blue-900">
                      Estimated Cost
                    </div>
                    
                    <div className="text-blue-800">
                      Type: <span className="font-medium">{costBreakdown.messageType}</span>
                    </div>
                    
                    <div className="text-gray-700">
                      Recipients: <span className="font-medium text-gray-900">{costBreakdown.totalRecipients}</span>
                    </div>
                    
                    {!isMMS && (
                      <div className="text-gray-700">
                        Segments: <span className="font-medium text-gray-900">{smsInfo.segments}</span>
                      </div>
                    )}
                    
                    <div className="text-gray-700">
                      Cost per recipient: <span className="font-medium text-gray-900">${costBreakdown.perRecipient.toFixed(4)}</span>
                    </div>
                    
                    <div className={`text-lg font-bold pt-1 ${
                      isMMS ? 'text-orange-600' : 'text-green-700'
                    }`}>
                      Total cost: ${costBreakdown.totalCost.toFixed(4)}
                    </div>
                  </div>
                )}

                {/* Budget Status Display */}
                {costSummary && messageType === 'sms' && (
                  <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-sm space-y-1.5 mt-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-yellow-800" />
                      <div className="font-bold text-yellow-800">
                        Messaging Budget Status
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Weekly:</span>
                        <span className={`font-medium ${
                          costSummary.weeklyCost > WEEKLY_BUDGET * 0.8 
                            ? costSummary.weeklyCost > WEEKLY_BUDGET 
                              ? 'text-red-600' 
                              : 'text-orange-600'
                            : 'text-gray-900'
                        }`}>
                          ${costSummary.weeklyCost.toFixed(2)} / ${WEEKLY_BUDGET}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-700">Monthly:</span>
                        <span className={`font-medium ${
                          costSummary.monthlyCost > MONTHLY_BUDGET * 0.8 
                            ? costSummary.monthlyCost > MONTHLY_BUDGET 
                              ? 'text-red-600' 
                              : 'text-orange-600'
                            : 'text-gray-900'
                        }`}>
                          ${costSummary.monthlyCost.toFixed(2)} / ${MONTHLY_BUDGET}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-700">Yearly:</span>
                        <span className={`font-medium ${
                          costSummary.yearlyCost > YEARLY_BUDGET * 0.8 
                            ? costSummary.yearlyCost > YEARLY_BUDGET 
                              ? 'text-red-600' 
                              : 'text-orange-600'
                            : 'text-gray-900'
                        }`}>
                          ${costSummary.yearlyCost.toFixed(2)} / ${YEARLY_BUDGET}
                        </span>
                      </div>
                      
                      <div className="flex justify-between pt-1 border-t border-yellow-200">
                        <span className="text-gray-700 font-medium">Lifetime:</span>
                        <span className="font-bold text-gray-900">
                          ${costSummary.lifetimeCost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="mb-3 sm:mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-purple-900">AI Suggestions</h3>
              </div>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setMessageContent(suggestion)}
                    className="w-full text-left p-2.5 bg-white hover:bg-purple-50 border border-purple-200 rounded text-xs sm:text-sm text-gray-700 hover:text-purple-900 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Templates - Scrollable on mobile */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Quick Templates
            </label>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  key={template.label}
                  onClick={() => setMessageContent(template.text)}
                  className="btn btn-secondary text-xs sm:text-sm py-2 px-3 whitespace-nowrap"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload for MMS (SMS mode only) */}
          {messageType === 'sms' && (
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <FileUpload
                onFileUploaded={(mediaUrl) => setMediaUrls([...mediaUrls, mediaUrl])}
                onRemove={() => setMediaUrls([])}
                disabled={isSending}
              />
              {mediaUrls.length > 0 && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800">
                    ✅ {mediaUrls.length} file(s) attached • Will send as MMS
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recipients - Compact on mobile */}
          <div className="mb-4 sm:mb-5 lg:mb-6">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Recipients
            </label>
            <label className="flex items-center gap-2 mb-3 p-2.5 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={sendToAll}
                onChange={(e) => {
                  setSendToAll(e.target.checked);
                  if (e.target.checked) setSelectedContacts([]);
                }}
                className="rounded"
              />
              <span className="text-sm">Send to all ({allContacts.length})</span>
            </label>
            {!sendToAll && (
              <div>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="btn btn-secondary flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
                >
                  <UserPlus className="w-4 h-4" />
                  Select Contacts ({selectedContacts.length})
                </button>
                {selectedContacts.length > 0 && (
                  <div className="mt-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-900 mb-1">Selected:</p>
                    <p className="text-xs text-blue-700 line-clamp-2">
                      {selectedContacts.map(c => c.name).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Personalization Toggle */}
          <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useAIPersonalization}
                onChange={(e) => setUseAIPersonalization(e.target.checked)}
                className="mt-1 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-900">Smart Personalization</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Automatically adds each recipient's name to the message. 
                  Makes bulk messages feel personal and increases engagement.
                  <span className="text-purple-700 font-medium"> (No API needed - instant!)</span>
                </p>
              </div>
            </label>
          </div>

          {/* MMS Indicator Badge */}
          {isMMS && (
            <div className="mb-3 p-2.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium text-center border border-orange-200">
              📎 MMS detected — higher carrier cost applies
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Send Test Button */}
            <button
              onClick={handleSendTest}
              disabled={isSending || !messageContent.trim()}
              className="btn bg-gray-600 hover:bg-gray-700 text-white flex-1 flex items-center justify-center gap-2 py-3 text-base font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="w-5 h-5" />
              Send Test
            </button>

            {/* Send Button - Sticky on mobile */}
            <button
              onClick={handleSend}
              disabled={isSending || isUndoPending || (!sendToAll && selectedContacts.length === 0)}
              className="btn btn-primary flex-[2] flex items-center justify-center gap-2 py-3 text-base font-semibold shadow-lg"
            >
              {isSending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Sending {progress.sent}/{progress.total}...
                </>
              ) : isUndoPending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Sending in {undoCountdown}s...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send {messageType === 'sms' ? 'SMS' : 'Call'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Contacts Sidebar - Hidden on mobile when no selection */}
        <div className={`card p-3 sm:p-4 lg:p-6 ${!sendToAll && selectedContacts.length === 0 ? 'hidden lg:block' : ''}`}>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
            {sendToAll ? 'All Contacts' : 'Selected Contacts'}
          </h2>
          
          {sendToAll ? (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-900 font-medium">
                Message will be sent to all {allContacts.length} opted-in contacts
              </p>
            </div>
          ) : selectedContacts.length > 0 ? (
            <div className="space-y-2 max-h-[50vh] sm:max-h-96 overflow-y-auto">
              {selectedContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg text-sm border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                      {contact.name || 'Unknown'}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{contact.phone}</p>
                  </div>
                  <button
                    onClick={() => removeContact(contact.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-md transition-colors flex-shrink-0"
                    aria-label="Remove contact"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <UserPlus className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                No contacts selected. Click "Select Contacts" to choose recipients.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Selection Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowContactModal(false)}></div>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col relative z-10 shadow-2xl">
            <div className="p-4 sm:p-6 border-b bg-white">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Select Contacts</h2>
                <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full"
                autoFocus
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-2">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedContacts.find(c => c.id === contact.id);
                  return (
                    <label
                      key={contact.id}
                      className={`flex items-center gap-3 p-3 rounded cursor-pointer hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50 border-2 border-blue-500' : 'border-2 border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => toggleContact(contact)}
                        className="rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                        <p className="text-sm text-gray-600 truncate">{contact.phone}</p>
                      </div>
                      {contact.city && (
                        <span className="hidden sm:inline text-xs text-gray-500">{contact.city}</span>
                      )}
                    </label>
                  );
                })}
              </div>
              {filteredContacts.length === 0 && (
                <p className="text-center text-gray-500 py-8">No contacts found</p>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-sm text-gray-600">
                  {selectedContacts.length} contact(s) selected
                </p>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Send Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <Send className="w-8 h-8 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Confirm Send</h3>
            </div>
            
            <div className="mb-6 space-y-4">
              {/* Message Preview */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Message Preview:</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className={`text-sm text-gray-800 whitespace-pre-wrap ${!expandPreview && messageContent.length > 200 ? 'line-clamp-3' : ''}`}>
                    {messageContent}
                  </p>
                  {messageContent.length > 200 && (
                    <button
                      onClick={() => setExpandPreview(!expandPreview)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium"
                    >
                      {expandPreview ? '▲ Show Less' : '▼ Show More'}
                    </button>
                  )}
                </div>
              </div>

              {/* Message Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Type:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {isMMS ? 'MMS' : smsInfo.isUnicode ? 'SMS (Unicode)' : 'SMS (GSM-7)'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Recipients:</span>
                  <span className="text-sm font-semibold text-gray-900">{recipientsCount}</span>
                </div>
                
                {!isMMS && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Segments:</span>
                    <span className="text-sm font-semibold text-gray-900">{smsInfo.segments}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-2 border-t border-blue-300">
                  <span className="text-sm font-bold text-gray-800">Estimated Cost:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${costBreakdown.totalCost.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Attachments List (if MMS) */}
              {isMMS && mediaUrls.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Attachments:</label>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-orange-800">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">{mediaUrls.length} file(s) attached</span>
                    </div>
                    <p className="text-xs text-orange-700 mt-1">
                      MMS will be sent with attachments
                    </p>
                  </div>
                </div>
              )}

              {/* Warning for large sends */}
              {recipientsCount > 50 && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">
                      You are about to send to <strong>{recipientsCount} recipients</strong>. Please review carefully before confirming.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setExpandPreview(false);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Confirm Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Warning Modal */}
      {showBudgetWarning && budgetWarningData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <h3 className="text-xl font-bold text-gray-900">Budget Warning</h3>
            </div>
            
            <div className="mb-6 space-y-3">
              <p className="text-gray-700">
                {budgetWarningData.message}
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">
                    {budgetWarningData.type.charAt(0).toUpperCase() + budgetWarningData.type.slice(1)} budget:
                  </span>
                  <span className="font-medium text-gray-900">
                    ${budgetWarningData.budget.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-700">Current spending:</span>
                  <span className="font-medium text-gray-900">
                    ${budgetWarningData.currentCost.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-700">This message:</span>
                  <span className="font-medium text-gray-900">
                    ${(budgetWarningData.newTotal - budgetWarningData.currentCost).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between pt-2 border-t border-orange-300">
                  <span className="font-bold text-orange-800">New total:</span>
                  <span className="font-bold text-orange-800">
                    ${budgetWarningData.newTotal.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                Do you want to continue sending this message?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowBudgetWarning(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeSend}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
