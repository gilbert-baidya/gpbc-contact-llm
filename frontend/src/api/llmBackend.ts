/**
 * Backend Configuration
 * Switch between Python backend and Google Apps Script
 */

// Configuration
export const USE_GOOGLE_SCRIPT = import.meta.env.VITE_USE_GOOGLE_SCRIPT === 'true' || false;
export const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';
export const PYTHON_BACKEND_URL = 'http://localhost:8000';

// Active backend URL
export const BACKEND_URL = USE_GOOGLE_SCRIPT ? GOOGLE_SCRIPT_URL : PYTHON_BACKEND_URL;

/**
 * LLM API Client for Google Apps Script
 */
export const llmApiGoogleScript = {
  /**
   * Personalize message with contact name
   */
  async personalizeMessage(message: string, name: string): Promise<{ success: boolean; personalized: string }> {
    const url = `${GOOGLE_SCRIPT_URL}?action=personalizeMessage&message=${encodeURIComponent(message)}&name=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Get AI-improved message suggestions
   */
  async improveMessage(message: string): Promise<{ success: boolean; suggestions: string[] }> {
    const url = `${GOOGLE_SCRIPT_URL}?action=improveMessage&message=${encodeURIComponent(message)}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Translate message to different language
   */
  async translateMessage(text: string, language: string): Promise<{ success: boolean; translated: string; language: string }> {
    const url = `${GOOGLE_SCRIPT_URL}?action=translateMessage&text=${encodeURIComponent(text)}&language=${language}`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * Get 3 reply suggestions for a message
   * Note: This uses improveMessage as Google Script doesn't have separate reply endpoint
   */
  async getReplySuggestions(message: string): Promise<string[]> {
    const result = await this.improveMessage(message);
    return result.success ? result.suggestions : [];
  }
};

/**
 * LLM API Client for Python Backend
 */
export const llmApiPython = {
  /**
   * Personalize message with contact name
   */
  async personalizeMessage(message: string, contactName: string): Promise<{ success: boolean; personalized_message: string }> {
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/llm/personalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, contact_name: contactName })
    });
    return response.json();
  },

  /**
   * Get AI-improved message suggestions
   */
  async improveMessage(message: string): Promise<{ success: boolean; suggestions: string[] }> {
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/llm/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversation_history: [] })
    });
    const data = await response.json();
    
    // Generate 3 variations from the single response
    if (data.success && data.reply) {
      return {
        success: true,
        suggestions: [
          data.reply,
          data.reply + ' 🙏',
          'Join us! ' + message
        ]
      };
    }
    
    return { success: false, suggestions: [] };
  },

  /**
   * Translate message to different language
   */
  async translateMessage(text: string, targetLanguage: string): Promise<{ success: boolean; translated: string; language: string }> {
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/llm/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target_language: targetLanguage })
    });
    const data = await response.json();
    return {
      success: data.success,
      translated: data.translated_text || text,
      language: targetLanguage
    };
  },

  /**
   * Get 3 reply suggestions for a message
   */
  async getReplySuggestions(message: string): Promise<string[]> {
    const result = await this.improveMessage(message);
    return result.success ? result.suggestions : [];
  }
};

/**
 * Unified LLM API - automatically uses correct backend
 */
export const llmApi = USE_GOOGLE_SCRIPT ? llmApiGoogleScript : llmApiPython;

/**
 * Helper to check if backend is configured
 */
export function isBackendConfigured(): boolean {
  if (USE_GOOGLE_SCRIPT) {
    return GOOGLE_SCRIPT_URL.length > 0;
  }
  return true; // Python backend always available in dev
}

/**
 * Get backend info for debugging
 */
export function getBackendInfo() {
  return {
    type: USE_GOOGLE_SCRIPT ? 'Google Apps Script' : 'Python Backend',
    url: USE_GOOGLE_SCRIPT ? GOOGLE_SCRIPT_URL : PYTHON_BACKEND_URL,
    configured: isBackendConfigured()
  };
}
