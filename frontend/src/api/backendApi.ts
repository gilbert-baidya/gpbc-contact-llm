/**
 * Frontend API Utility
 * Handles communication with the Node.js backend on port 3001
 */

const API_BASE_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

export interface BackendStats {
  totalContacts: number;
  optInYes: number;
  optInNo: number;
  english: number;
  bangla: number;
  menCount?: number;
  womenCount?: number;
  youngAdultCount?: number;
}

export interface BackendContact {
  id?: number;
  name: string;
  phone?: string;
  phone_e164?: string;
  phone_raw?: string;
  city?: string;
  language: string;
  optIn: string;
  notes?: string;
  lastSent?: string;
}

/**
 * Get dashboard statistics
 * @returns Stats object with totalContacts, optInCount, etc.
 */
export async function getStats(): Promise<BackendStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/statistics`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
}

/**
 * Get list of contacts
 * @returns Array of contact objects
 */
export async function getContacts(): Promise<BackendContact[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/contacts`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
}
