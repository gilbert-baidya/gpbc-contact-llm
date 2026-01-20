/**
 * Google Apps Script Service
 * Handles communication with the Google Apps Script Web App
 */

import dotenv from 'dotenv';
dotenv.config();

const GOOGLE_APPS_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbzDMKjMowjTPOpqvvPIiv7YjWNrCs-orCgUhRKlnD7iutv8zif7GcyUFYrVPlrZ8_51pQ/exec';
const API_KEY = process.env.GPBC_API_KEY || process.env.API_KEY;

/**
 * Fetch statistics from Google Apps Script
 * @returns {Promise<Object>} Stats object with totalContacts, optInCount, etc.
 * @throws {Error} If the request fails
 */
export async function fetchStats() {
  try {
    if (!API_KEY) {
      throw new Error('GPBC_API_KEY is not configured');
    }

    const url = `${GOOGLE_APPS_SCRIPT_BASE_URL}?action=getStats&key=${encodeURIComponent(API_KEY)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('Error fetching stats from Google Apps Script:', error);
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }
}

/**
 * Fetch contacts from Google Apps Script
 * @returns {Promise<Array>} Array of contact objects
 * @throws {Error} If the request fails
 */
export async function fetchContacts() {
  try {
    if (!API_KEY) {
      throw new Error('GPBC_API_KEY is not configured');
    }

    const url = `${GOOGLE_APPS_SCRIPT_BASE_URL}?action=getContacts&key=${encodeURIComponent(API_KEY)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Ensure we return an array
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected an array of contacts');
    }

    return data;
  } catch (error) {
    console.error('Error fetching contacts from Google Apps Script:', error);
    throw new Error(`Failed to fetch contacts: ${error.message}`);
  }
}
