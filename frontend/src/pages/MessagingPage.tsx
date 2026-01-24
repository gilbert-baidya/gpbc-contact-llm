import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Phone, Loader, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchContacts, bulkSendSMS, bulkMakeCall, Contact } from '../services/googleAppsScriptService';

export const MessagingPage: React.FC = () => {
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<'sms' | 'voice'>('sms');
  const [sendToAll, setSendToAll] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0 });
  const [showContactModal, setShowContactModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadContacts();
    checkPreSelectedContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await fetchContacts();
      setAllContacts(data.filter(c => c.optIn === 'Yes'));
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('Failed to load contacts');
    }
  };

  const checkPreSelectedContacts = () => {
    const preSelected = sessionStorage.getItem('selectedSheetContacts');
    if (preSelected) {
      const contacts = JSON.parse(preSelected);
      setSelectedContacts(contacts);
      setSendToAll(false);
      sessionStorage.removeItem('selectedSheetContacts');
    }
  };

  const handleSend = async () => {
    if (!messageContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const targets = sendToAll ? allContacts : selectedContacts;
    
    if (targets.length === 0) {
      toast.error('Please select contacts or choose "Send to All"');
      return;
    }

    setIsSending(true);
    setProgress({ sent: 0, total: targets.length });

    try {
      const onProgress = (sent: number) => {
        setProgress({ sent, total: targets.length });
      };

      if (messageType === 'sms') {
        await bulkSendSMS(targets, messageContent, onProgress);
        toast.success(`SMS sent to ${targets.length} contact(s)`);
      } else {
        await bulkMakeCall(targets, messageContent, onProgress);
        toast.success(`Calls initiated to ${targets.length} contact(s)`);
      }

      setMessageContent('');
      setSelectedContacts([]);
      setSendToAll(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send messages');
    } finally {
      setIsSending(false);
      setProgress({ sent: 0, total: 0 });
    }
  };

  const templates = [
    { label: 'Weekly Service', text: 'Join us this Sunday at 10 AM for worship service. See you there!' },
    { label: 'Prayer Request', text: 'We are praying for you. Please share your prayer requests with us.' },
    { label: 'Event Invitation', text: 'You are invited to our special event. Please RSVP.' },
    { label: 'Reminder', text: 'This is a friendly reminder about our upcoming service.' }
  ];

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredContacts = allContacts.filter((c) => {
    const name = (c.name ?? '').toString().toLowerCase();
    const phone = (c.phone ?? '').toString();
    return (
      name.includes(normalizedSearchTerm) ||
      phone.includes(searchTerm)
    );
  });

  const toggleContact = (contact: Contact) => {
    if (selectedContacts.find(c => c.id === contact.id)) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const removeContact = (contactId: number) => {
    setSelectedContacts(selectedContacts.filter(c => c.id !== contactId));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Send Message</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Message Composer */}
        <div className="lg:col-span-2 card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Compose Message</h2>

          {/* Message Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Type
            </label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="sms"
                  checked={messageType === 'sms'}
                  onChange={(e) => setMessageType(e.target.value as 'sms')}
                  className="rounded"
                />
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">SMS Text</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="voice"
                  checked={messageType === 'voice'}
                  onChange={(e) => setMessageType(e.target.value as 'voice')}
                  className="rounded"
                />
                <Phone className="w-4 h-4" />
                <span className="font-medium">Voice Call</span>
              </label>
            </div>
          </div>

          {/* Message Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="input min-h-[150px]"
              placeholder={messageType === 'sms' ? 'Type your message...' : 'This message will be read aloud to recipients...'}
            />
            <p className="text-xs text-gray-500 mt-1">
              {messageContent.length} characters
            </p>
          </div>

          {/* Templates */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  key={template.label}
                  onClick={() => setMessageContent(template.text)}
                  className="btn btn-secondary text-sm"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients
            </label>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={sendToAll}
                onChange={(e) => {
                  setSendToAll(e.target.checked);
                  if (e.target.checked) setSelectedContacts([]);
                }}
                className="rounded"
              />
              Send to all opted-in contacts ({allContacts.length})
            </label>
            {!sendToAll && (
              <button
                onClick={() => setShowContactModal(true)}
                className="btn btn-secondary flex items-center gap-2 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Select Contacts ({selectedContacts.length})
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isSending || (!sendToAll && selectedContacts.length === 0)}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Sending {progress.sent}/{progress.total}...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send {messageType === 'sms' ? 'SMS' : 'Voice Call'}
              </>
            )}
          </button>
        </div>

        {/* Selected Contacts Sidebar */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {sendToAll ? 'All Contacts' : 'Selected Contacts'}
          </h2>
          
          {sendToAll ? (
            <p className="text-sm text-gray-600">
              Message will be sent to all {allContacts.length} opted-in contacts
            </p>
          ) : selectedContacts.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-gray-600 text-xs">{contact.phone}</p>
                  </div>
                  <button
                    onClick={() => removeContact(contact.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No contacts selected. Click "Select Contacts" to choose recipients.
            </p>
          )}
        </div>
      </div>

      {/* Contact Selection Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowContactModal(false)}></div>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col relative z-10 shadow-2xl">
            <div className="p-4 sm:p-6 border-b bg-white">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Select Contacts</h2>
                <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full"
                autoFocus
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-2">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedContacts.find(c => c.id === contact.id);
                  return (
                    <label
                      key={contact.id}
                      className={`flex items-center gap-3 p-3 rounded cursor-pointer hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50 border-2 border-blue-500' : 'border-2 border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => toggleContact(contact)}
                        className="rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                        <p className="text-sm text-gray-600 truncate">{contact.phone}</p>
                      </div>
                      {contact.city && (
                        <span className="hidden sm:inline text-xs text-gray-500">{contact.city}</span>
                      )}
                    </label>
                  );
                })}
              </div>
              {filteredContacts.length === 0 && (
                <p className="text-center text-gray-500 py-8">No contacts found</p>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className="text-sm text-gray-600">
                  {selectedContacts.length} contact(s) selected
                </p>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
