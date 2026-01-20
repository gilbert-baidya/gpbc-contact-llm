/**
 * GPBC Church Dashboard API Client
 * Connects to Google Apps Script Web App backend
 */

const BASE_URL = 'https://script.google.com/macros/s/AKfycbzve9b56eA8ax_8_m93M9jgNDZJKF_onK9uNiFw1pr-cCNaD7UwPKbdcfzATvYNCOdxZg/exec';

/**
 * Generic API request handler
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise<any>} Response data
 * @throws {Error} Descriptive error message
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Handle non-200 responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    // Parse JSON response
    const data = await response.json();
    
    // Check for application-level errors
    if (data.error) {
      throw new Error(`API error: ${data.error}`);
    }

    return data;
  } catch (error) {
    // Network or parsing errors
    if (error instanceof TypeError) {
      throw new Error(`Network error: Unable to reach the server. ${error.message}`);
    }
    
    // Re-throw other errors with context
    throw new Error(`API request failed: ${error.message}`);
  }
}

/**
 * Fetch all contacts from the church database
 * @returns {Promise<Array>} List of contact objects
 * @throws {Error} If the request fails
 */
export async function getContacts() {
  try {
    const data = await apiRequest('?action=getContacts');
    
    if (!Array.isArray(data.contacts)) {
      throw new Error('Invalid response format: expected contacts array');
    }
    
    return data.contacts;
  } catch (error) {
    throw new Error(`Failed to fetch contacts: ${error.message}`);
  }
}

/**
 * Fetch dashboard statistics
 * @returns {Promise<object>} Statistics object with metrics
 * @throws {Error} If the request fails
 */
export async function getStats() {
  try {
    const data = await apiRequest('?action=getStats');
    
    if (typeof data.stats !== 'object') {
      throw new Error('Invalid response format: expected stats object');
    }
    
    return data.stats;
  } catch (error) {
    throw new Error(`Failed to fetch statistics: ${error.message}`);
  }
}
