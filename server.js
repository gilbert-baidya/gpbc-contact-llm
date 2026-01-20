/**
 * Node.js Server for GPBC Church Dashboard
 * Provides API endpoints for dashboard statistics and contacts
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'dotenv/config';
import { fetchStats, fetchContacts } from './services/googleScriptService.js';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for development and production
const corsOptions = {
  origin: [
    'http://localhost:3005',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://gpbc-contact.netlify.app',
    'https://*.netlify.app'
  ],
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Google Apps Script API configuration - USING SINGLE SOURCE OF TRUTH
const GPBC_API_URL = 'https://script.google.com/macros/s/AKfycbzDMKjMowjTPOpqvvPIiv7YjWNrCs-orCgUhRKlnD7iutv8zif7GcyUFYrVPlrZ8_51pQ/exec';
const API_KEY = process.env.VITE_GPBC_API_KEY || process.env.GPBC_API_KEY;

/**
 * Makes authenticated request to GPBC API
 * @param {string} action - API action to perform
 * @returns {Promise<any>} API response data
 */
async function callGPBCAPI(action) {
  if (!API_KEY) {
    throw new Error('GPBC API key is not configured');
  }

  const url = `${GPBC_API_URL}?action=${action}&key=${encodeURIComponent(API_KEY)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`GPBC API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`GPBC API error: ${data.error}`);
    }

    if (data.status === 'unauthorized') {
      throw new Error('Invalid or missing API key');
    }

    return data;
  } catch (error) {
    throw new Error(`Failed to fetch from GPBC API: ${error.message}`);
  }
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    name: 'GPBC Church Dashboard API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      stats: '/stats',
      contacts: '/contacts',
      chat: '/chat'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// GET /stats - Fetch dashboard statistics
app.get('/stats', async (req, res) => {
  try {
    const data = await fetchStats();
    
    // If group counts are not in the stats, calculate them from contacts
    if (!data.menCount && !data.womenCount && !data.youngAdultCount) {
      try {
        const contacts = await fetchContacts();
        data.menCount = contacts.filter(c => c.group === 'Men').length;
        data.womenCount = contacts.filter(c => c.group === 'Women').length;
        data.youngAdultCount = contacts.filter(c => c.group === 'YoungAdult').length;
      } catch (error) {
        console.warn('Could not fetch contacts for group counts:', error.message);
      }
    }
    
    console.log('📊 Stats received from Google Apps Script:', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Error fetching stats:', error.message);
    res.status(500).json({
      error: 'Failed to fetch statistics from Google Apps Script',
      message: error.message
    });
  }
});

// GET /contacts - Fetch contact list
app.get('/contacts', async (req, res) => {
  try {
    const contacts = await fetchContacts();
    console.log('📇 Contacts received from Google Apps Script:', {
      count: contacts.length,
      sample: contacts.slice(0, 3),
      allData: JSON.stringify(contacts, null, 2)
    });
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error.message);
    res.status(500).json({
      error: 'Failed to fetch contacts from Google Apps Script',
      message: error.message
    });
  }
});

// GET /api/contacts - API endpoint for contacts (with filters)
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await fetchContacts();
    const { active_only, search, limit, skip } = req.query;
    
    let filteredContacts = contacts;
    
    // Filter by active status if requested
    if (active_only === 'true') {
      filteredContacts = filteredContacts.filter(c => c.optIn === 'Yes' || c.optIn === 'yes');
    }
    
    // Search filter
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      filteredContacts = filteredContacts.filter(c => 
        c.name?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(search) ||
        c.phone_e164?.includes(search)
      );
    }
    
    // Pagination
    const skipNum = parseInt(skip) || 0;
    const limitNum = parseInt(limit) || filteredContacts.length;
    filteredContacts = filteredContacts.slice(skipNum, skipNum + limitNum);
    
    // Transform to match API format expected by frontend
    const transformedContacts = filteredContacts.map((c, index) => ({
      id: c.id || index + 1,
      name: c.name || 'Unknown',
      phone: c.phone_e164 || c.phone || '',
      preferred_language: c.language || 'EN',
      active: c.optIn === 'Yes' || c.optIn === 'yes',
      city: c.city || '',
      group: c.group || 'Unassigned',
      created_at: new Date().toISOString()
    }));
    
    res.json(transformedContacts);
  } catch (error) {
    console.error('Error fetching contacts:', error.message);
    res.status(500).json({
      error: 'Failed to fetch contacts',
      message: error.message
    });
  }
});

// GET /api/messages - Mock messages endpoint
app.get('/api/messages', async (req, res) => {
  try {
    const { limit, contact_id } = req.query;
    
    // Return empty messages array for now (no Python backend)
    res.json([]);
  } catch (error) {
    console.error('Error fetching messages:', error.message);
    res.status(500).json({
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
});

// POST /api/messages/send - Mock send message endpoint
app.post('/api/messages/send', async (req, res) => {
  try {
    const { content, message_type, contact_id, contact_ids, send_to_all } = req.body;
    
    // Validate required fields
    if (!content) {
      return res.status(400).json({
        error: 'Message content is required'
      });
    }
    
    // Mock response - in production this would integrate with Twilio
    console.log('📱 Message send request:', {
      content,
      message_type,
      contact_id,
      contact_ids,
      send_to_all,
      note: 'Mock mode - Python backend not running'
    });
    
    res.json({
      id: Date.now(),
      status: 'queued',
      message: 'Message queued for sending (mock mode)',
      recipients: contact_ids?.length || (send_to_all ? 'all' : 1)
    });
  } catch (error) {
    console.error('Error sending message:', error.message);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message
    });
  }
});

// POST /chat - Chat endpoint (placeholder for future LLM integration)
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Message is required'
      });
    }

    // TODO: Implement LLM chat logic using messageHandler
    // For now, return a simple response
    res.json({
      reply: 'Thank you for your message. This chat feature is under development.',
      intent: 'INFO',
      language: 'EN'
    });
  } catch (error) {
    console.error('Error handling chat:', error.message);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ GPBC Church Dashboard Server running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ Stats endpoint: http://localhost:${PORT}/stats`);
  console.log(`✓ Contacts endpoint: http://localhost:${PORT}/contacts`);
  console.log(`✓ Chat endpoint: http://localhost:${PORT}/chat`);
});
