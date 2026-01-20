/**
 * Message Interpretation for Church Communication System
 * Detects intent, language, and generates appropriate responses
 */

/**
 * Interprets user message and determines intent, language, and appropriate reply
 * @param {string} input - User's message
 * @returns {object} { intent, reply, language, needsData }
 */
export function interpretMessage(input) {
  if (!input || typeof input !== 'string') {
    return {
      intent: 'UNKNOWN',
      reply: 'Sorry, I could not understand your message.',
      language: 'EN',
      needsData: false
    };
  }

  const message = input.trim().toLowerCase();
  
  // Detect language (Bangla Unicode range: 0980-09FF)
  const hasBangla = /[\u0980-\u09FF]/.test(input);
  const language = hasBangla ? 'BN' : 'EN';

  // Detect if user is asking for data/statistics
  const dataRequestPatterns = [
    'how many', 'how much', 'number of', 'total',
    'statistics', 'stats', 'count', 'members',
    'people', 'contacts', 'subscribers',
    'languages supported', 'what languages', 'which languages',
    'opt-in', 'opted in', 'subscription', 'subscribed',
    'active members', 'registered'
  ];
  
  const needsData = dataRequestPatterns.some(pattern => message.includes(pattern));

  // STOP/Unsubscribe detection (highest priority)
  const stopPatterns = [
    'stop', 'unsubscribe', 'opt out', 'opt-out', 'remove', 'no more',
    'don\'t contact', 'do not contact', 'leave me alone', 'stop messaging',
    'বন্ধ', 'থামাও', 'বার্তা বন্ধ' // Bangla: stop, stop sending messages
  ];
  
  if (stopPatterns.some(pattern => message.includes(pattern))) {
    return {
      intent: 'STOP',
      reply: language === 'BN' 
        ? 'আপনার অনুরোধ গ্রহণ করা হয়েছে। আপনি আর কোনো বার্তা পাবেন না। ধন্যবাদ।'
        : 'Your request has been received. You will no longer receive messages from us. Thank you.',
      language,
      needsData: false
    };
  }

  // Prayer request detection
  const prayerPatterns = [
    'pray', 'prayer', 'please pray', 'need prayer', 'pray for',
    'prayer request', 'lift up', 'intercede', 'praying for',
    'পাথনা', 'প্রার্থনা করুন', 'প্রার্থনা', 'দোয়া' // Bangla: prayer
  ];

  const hasPrayerKeyword = prayerPatterns.some(pattern => message.includes(pattern));
  
  // Enhanced prayer detection with context
  const prayerContexts = [
    'sick', 'ill', 'hospital', 'surgery', 'healing', 'health',
    'job', 'work', 'employment', 'interview',
    'family', 'marriage', 'relationship', 'children',
    'financial', 'money', 'debt', 'struggling',
    'exam', 'test', 'school', 'study',
    'travel', 'journey', 'trip', 'safe',
    'lost', 'grief', 'death', 'passed away',
    'troubled', 'anxious', 'worried', 'depressed', 'struggling',
    'blessing', 'guidance', 'wisdom', 'direction'
  ];

  const hasPrayerContext = prayerContexts.some(context => message.includes(context));
  
  if (hasPrayerKeyword || (hasPrayerContext && message.length > 20)) {
    return {
      intent: 'PRAYER',
      reply: language === 'BN'
        ? 'আপনার প্রার্থনার অনুরোধ পেয়েছি। আমরা আপনার জন্য প্রার্থনা করছি। ঈশ্বর আপনার সাথে আছেন। 🙏'
        : 'Thank you for sharing your prayer request. Our church family is praying for you. God is with you. 🙏',
      language,
      needsData: false
    };
  }

  // Information request detection
  const infoPatterns = [
    'service', 'time', 'when', 'where', 'location', 'address',
    'schedule', 'event', 'program', 'ministry', 'meeting',
    'pastor', 'church', 'contact', 'phone', 'email',
    'how', 'what', 'who', 'can you', 'tell me', 'information',
    'সময়', 'কোথায়', 'ঠিকানা', 'যোগাযোগ' // Bangla: time, where, address, contact
  ];

  const hasInfoKeyword = infoPatterns.some(pattern => message.includes(pattern));
  const hasQuestionMark = message.includes('?');

  if (hasInfoKeyword || hasQuestionMark) {
    return {
      intent: 'INFO',
      reply: language === 'BN'
        ? 'আপনার প্রশ্নের জন্য ধন্যবাদ। আরও তথ্যের জন্য অনুগ্রহ করে যোগাযোগ করুন। আমরা সাহায্য করতে এখানে আছি!'
        : 'Thank you for your question! For more information, please contact our church office. We\'re here to help!',
      language,
      needsData
    };
  }

  // Default: UNKNOWN intent
  return {
    intent: 'UNKNOWN',
    reply: language === 'BN'
      ? 'আপনার বার্তার জন্য ধন্যবাদ। আরও সাহায্যের জন্য, অনুগ্রহ করে আমাদের চার্চ অফিসে যোগাযোগ করুন।'
      : 'Thank you for your message. For assistance, please contact our church office.',
    language,
    needsData: false
  };
}
