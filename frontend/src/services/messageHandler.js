/**
 * Message Handler Service
 * Processes incoming messages and determines appropriate responses
 */

import { interpretMessage } from '../llm/interpretMessage.js';
import { fetchStats, fetchContacts } from '../llm/gpbcDataService.js';

/**
 * Handles incoming message and returns appropriate response action
 * @param {string} message - User's incoming message
 * @returns {Promise<object>} Response object with action type and details
 */
export async function messageHandler(message) {
  // Interpret the message to determine intent and language
  const interpretation = interpretMessage(message);
  const { intent, reply, language, needsData } = interpretation;

  // Fetch data if needed for contextual responses
  let enrichedReply = reply;
  let stats = null;
  let contacts = null;

  if (needsData) {
    try {
      // Fetch data in parallel for efficiency
      const [statsData, contactsData] = await Promise.all([
        fetchStats().catch(() => null),
        fetchContacts().catch(() => null)
      ]);

      stats = statsData;
      contacts = contactsData;

      // Enrich reply with actual data
      if (stats) {
        const totalContacts = stats.totalContacts || 0;
        const optInYes = stats.optInYes || 0;
        const optInNo = stats.optInNo || 0;

        if (language === 'BN') {
          enrichedReply = `আমরা বর্তমানে ${totalContacts} জন যোগাযোগকারীর সেবা করছি। এর মধ্যে ${optInYes} জন বার্তা পেতে সম্মত হয়েছেন এবং আমরা ইংরেজি ও বাংলা উভয় ভাষা সমর্থন করি। ${reply}`;
        } else {
          enrichedReply = `We currently serve ${totalContacts} contacts, with ${optInYes} opted in to receive messages. We support both English and Bangla languages. ${reply}`;
        }
      }
    } catch (error) {
      // If data fetch fails, use original reply
      console.error('Failed to fetch data for enrichment:', error);
    }
  }

  // Handle STOP/Unsubscribe requests
  if (intent === 'STOP') {
    return {
      action: 'UNSUBSCRIBE',
      message: enrichedReply,
      language,
      shouldUpdateOptIn: true,
      optInValue: 'No',
      data: null
    };
  }

  // Handle Prayer Requests
  if (intent === 'PRAYER') {
    return {
      action: 'PRAYER_REQUEST',
      message: enrichedReply,
      language,
      originalRequest: message,
      shouldNotifyPastor: true,
      data: null
    };
  }

  // Handle Information Requests
  if (intent === 'INFO') {
    return {
      action: 'INFO_RESPONSE',
      message: enrichedReply,
      language,
      shouldLogQuery: true,
      data: needsData ? { stats, contacts } : null
    };
  }

  // Handle Unknown/General Messages
  return {
    action: 'GENERAL_RESPONSE',
    message: enrichedReply,
    language,
    requiresReview: true,
    data: needsData ? { stats, contacts } : null
  };
}
