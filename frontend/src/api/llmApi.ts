import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface MessageInterpretRequest {
  message: string;
  contact_id?: number;
  language?: string;
}

export interface MessageInterpretResponse {
  intent: string;
  reply: string;
  language: string;
  confidence: number;
  needs_pastoral_care: boolean;
}

export interface GenerateReplyRequest {
  message: string;
  contact_id: number;
  include_context?: boolean;
}

export interface GenerateReplyResponse {
  reply: string;
  language: string;
  conversation_context: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

export interface TranslateRequest {
  text: string;
  to_language: string;
  maintain_tone?: string;
}

export interface ConversationSummary {
  contact_name: string;
  summary: string;
  message_count: number;
  date_range: {
    first: string;
    last: string;
  };
  conversation_preview: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

/**
 * Interpret a message using AI to detect intent and generate appropriate reply
 */
export const interpretMessage = async (
  request: MessageInterpretRequest
): Promise<MessageInterpretResponse> => {
  const response = await axios.post(`${API_URL}/api/llm/interpret`, request);
  return response.data;
};

/**
 * Generate an intelligent, context-aware reply for a contact's message
 */
export const generateReply = async (
  request: GenerateReplyRequest
): Promise<GenerateReplyResponse> => {
  const response = await axios.post(`${API_URL}/api/llm/reply`, request);
  return response.data;
};

/**
 * Translate a message to another language while maintaining pastoral tone
 */
export const translateMessage = async (
  request: TranslateRequest
): Promise<{ original: string; translated: string; to_language: string; tone: string }> => {
  const response = await axios.post(`${API_URL}/api/llm/translate`, request);
  return response.data;
};

/**
 * Personalize a message template for a specific contact
 */
export const personalizeMessage = async (
  template: string,
  contactId: number
): Promise<{
  original_template: string;
  personalized_message: string;
  contact_name: string;
  language: string;
}> => {
  const response = await axios.post(`${API_URL}/api/llm/personalize`, null, {
    params: { template, contact_id: contactId }
  });
  return response.data;
};

/**
 * Get an AI-generated summary of conversations with a contact
 */
export const getConversationSummary = async (
  contactId: number
): Promise<ConversationSummary> => {
  const response = await axios.get(`${API_URL}/api/llm/conversation/${contactId}`);
  return response.data;
};

/**
 * Check if a message contains a prayer request using AI
 */
export const detectPrayerRequest = async (message: string): Promise<boolean> => {
  try {
    const result = await interpretMessage({ message });
    return result.intent === 'prayer_request' || result.needs_pastoral_care;
  } catch (error) {
    console.error('Error detecting prayer request:', error);
    return false;
  }
};

/**
 * Get intelligent reply suggestions for a message
 */
export const getReplySuggestions = async (
  message: string,
  contactId?: number
): Promise<string[]> => {
  try {
    const result = await interpretMessage({ message, contact_id: contactId });
    
    // Return multiple suggestions based on intent
    const suggestions: string[] = [result.reply];
    
    // Add alternative responses based on intent
    if (result.intent === 'prayer_request') {
      suggestions.push(
        "Thank you for sharing. We'll keep you in our prayers. 🙏",
        "Our pastoral team will be praying for you. God bless! 🙏"
      );
    } else if (result.intent === 'question') {
      suggestions.push(
        "Let me find that information for you...",
        "That's a great question! Let me help you with that."
      );
    } else if (result.intent === 'greeting') {
      suggestions.push(
        "Hello! How can we serve you today?",
        "Greetings! It's wonderful to hear from you!"
      );
    }
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  } catch (error) {
    console.error('Error generating reply suggestions:', error);
    return ['Thank you for your message!'];
  }
};

export default {
  interpretMessage,
  generateReply,
  translateMessage,
  personalizeMessage,
  getConversationSummary,
  detectPrayerRequest,
  getReplySuggestions
};
