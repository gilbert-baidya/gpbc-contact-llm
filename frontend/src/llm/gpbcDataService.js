/**
 * GPBC Data Service for LLM Integration
 * Securely fetches data from Google Apps Script API
 */

const BASE_URL =
  'https://script.google.com/macros/s/AKfycbzve9b56eA8ax_8_m93M9jgNDZJKF_onK9uNiFw1pr-cCNaD7UwPKbdcfzATvYNCOdxZg/exec';

/**
 * Get API key from environment
 */
function getApiKey() {
  const apiKey = process.env.GPBC_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error(
      'GPBC_API_KEY is missing or invalid. Check your .env file.'
    );
  }

  return apiKey;
}

/**
 * Make authenticated request to GPBC API
 */
async function authenticatedRequest(action) {
  const apiKey = getApiKey();
  const url = `${BASE_URL}?action=${action}&key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `GPBC API HTTP ${response.status}: ${text}`
    );
  }

  const data = await response.json();

  if (data && data.error) {
    throw new Error(`GPBC API error: ${data.error}`);
  }

  return data;
}

/**
 * Fetch dashboard statistics
 */
export async function fetchStats() {
  const data = await authenticatedRequest('getStats');

  // GAS returns stats directly
  if (
    typeof data !== 'object' ||
    data.totalContacts === undefined
  ) {
    throw new Error('Invalid stats response from GPBC API');
  }

  return data;
}

/**
 * Fetch contacts list
 */
export async function fetchContacts() {
  const data = await authenticatedRequest('getContacts');

  // GAS returns array directly
  if (!Array.isArray(data)) {
    throw new Error('Invalid contacts response from GPBC API');
  }

  return data;
}
