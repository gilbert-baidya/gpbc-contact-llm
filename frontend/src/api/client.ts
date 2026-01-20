import axios from 'axios';

// Node.js backend for Google Sheets data (contacts, stats)
const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'http://localhost:3001';

// Python backend for Twilio SMS/Voice (messaging, calls)
const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

console.log('Node API URL:', NODE_API_URL);
console.log('Python API URL:', PYTHON_API_URL);

// Default API client for Google Sheets data (Node.js)
export const api = axios.create({
  baseURL: NODE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Python API client for SMS/Voice features
export const pythonAPI = axios.create({
  baseURL: PYTHON_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Contact {
  id: number;
  sl_no?: string;
  name: string;
  address?: string;
  city?: string;
  state_zip?: string;
  phone: string;
  preferred_language: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Message {
  id: number;
  contact_id: number;
  message_type: 'sms' | 'voice';
  content: string;
  status: string;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

export interface ScheduledReminder {
  id: number;
  name: string;
  message_content: string;
  message_type: 'sms' | 'voice';
  schedule_type: string;
  schedule_day?: string;
  schedule_time: string;
  schedule_date?: string;
  active: boolean;
  send_to_all: boolean;
}

export interface CallLog {
  id: number;
  contact_id?: number;
  caller_phone: string;
  caller_name?: string;
  direction: string;
  duration: number;
  conversation_summary?: string;
  language_detected?: string;
  created_at: string;
}

export interface Statistics {
  total_contacts: number;
  active_contacts: number;
  total_messages_sent: number;
  total_calls_made: number;
  scheduled_reminders: number;
}

// Contacts API
export const contactsAPI = {
  getAll: (params?: { skip?: number; limit?: number; active_only?: boolean; search?: string }) =>
    api.get<Contact[]>('/api/contacts', { params }),
  
  getById: (id: number) =>
    api.get<Contact>(`/api/contacts/${id}`),
  
  create: (data: Partial<Contact>) =>
    api.post<Contact>('/api/contacts', data),
  
  update: (id: number, data: Partial<Contact>) =>
    api.put<Contact>(`/api/contacts/${id}`, data),
  
  delete: (id: number) =>
    api.delete(`/api/contacts/${id}`),
  
  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// Messages API - Uses Python backend for real Twilio integration
export const messagesAPI = {
  getAll: (params?: { skip?: number; limit?: number; contact_id?: number }) =>
    pythonAPI.get<Message[]>('/api/messages', { params }),
  
  send: (data: {
    content: string;
    message_type: 'sms' | 'voice';
    contact_id?: number;
    contact_ids?: number[];
    phone_numbers?: { id: number; name: string; phone: string }[];
    send_to_all?: boolean;
    scheduled_at?: string;
  }) =>
    pythonAPI.post('/api/messages/send', data)
};

// Calls API - Uses Python backend for real Twilio integration
export const callsAPI = {
  getAll: (params?: { skip?: number; limit?: number }) =>
    pythonAPI.get<CallLog[]>('/api/calls', { params }),
  
  make: (data: {
    contact_id?: number;
    contact_ids?: number[];
    phone_number?: string;
    message?: string;
  }) =>
    pythonAPI.post('/api/calls/make', data)
};

// Reminders API - Uses Python backend for Celery scheduling
export const remindersAPI = {
  getAll: (params?: { skip?: number; limit?: number; active_only?: boolean }) =>
    pythonAPI.get<ScheduledReminder[]>('/api/reminders', { params }),
  
  create: (data: Omit<ScheduledReminder, 'id' | 'active'>) =>
    pythonAPI.post<ScheduledReminder>('/api/reminders', data),
  
  delete: (id: number) =>
    pythonAPI.delete(`/api/reminders/${id}`)
};

// Statistics API
export const statisticsAPI = {
  get: () =>
    api.get<Statistics>('/api/statistics')
};
