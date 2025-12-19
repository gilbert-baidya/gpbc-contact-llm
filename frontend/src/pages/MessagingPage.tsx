import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI, contactsAPI, Contact } from '../api/client';
import { MessageSquare, Send, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export const MessagingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<'sms' | 'voice'>('sms');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);

  // Check if contacts were pre-selected from ContactsPage
  useEffect(() => {
    const preSelectedIds = sessionStorage.getItem('selectedContactIds');
    if (preSelectedIds) {
      const ids = JSON.parse(preSelectedIds);
      setSelectedContacts(ids);
      setSendToAll(false);
      sessionStorage.removeItem('selectedContactIds');
      toast.success(`${ids.length} contact(s) selected`);
    }
  }, []);

  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsAPI.getAll({ active_only: true }).then(res => res.data)
  });

  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => messagesAPI.getAll({ limit: 50 }).then(res => res.data)
  });

  const sendMutation = useMutation({
    mutationFn: messagesAPI.send,
    onSuccess: () => {
      toast.success('Message sent successfully!');
      setMessageContent('');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => toast.error('Failed to send message')
  });

  const handleSend = () => {
    if (!messageContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    sendMutation.mutate({
      content: messageContent,
      message_type: messageType,
      send_to_all: sendToAll,
      contact_ids: sendToAll ? undefined : selectedContacts
    });
  };

  const templates = [
    { name: 'Weekly Service', text: '🙏 Reminder: Church service this Sunday at 10:00 AM. Looking forward to seeing you!' },
    { name: 'Wednesday Prayer', text: '📿 Join us for prayer meeting tonight at 7:00 PM. Your presence will be a blessing!' },
    { name: 'Christmas Greeting', text: '🎄 Merry Christmas! May the joy and peace of Christmas be with you and your family.' },
    { name: 'Easter Greeting', text: '🌸 Happy Easter! Wishing you a blessed and joyful Easter celebration!' },
  ];

  const removeContact = (contactId: number) => {
    setSelectedContacts(prev => prev.filter(id => id !== contactId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Messaging</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Message */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Compose Message</h2>
            
            {/* Message Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="messageType"
                    value="sms"
                    checked={messageType === 'sms'}
                    onChange={(e) => setMessageType(e.target.value as 'sms')}
                    className="text-primary-600"
                  />
                  <span>SMS Text</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="messageType"
                    value="voice"
                    checked={messageType === 'voice'}
                    onChange={(e) => setMessageType(e.target.value as 'voice')}
                    className="text-primary-600"
                  />
                  <span>Voice Call</span>
                </label>
              </div>
            </div>

            {/* Recipients */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipients
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendToAll}
                    onChange={(e) => setSendToAll(e.target.checked)}
                    className="rounded text-primary-600"
                  />
                  <span>Send to all active contacts ({contacts?.length || 0})</span>
                </label>
                
                {/* Show selected contacts */}
                {!sendToAll && selectedContacts.length > 0 && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      {selectedContacts.length} contact(s) selected:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {contacts?.filter(c => selectedContacts.includes(c.id)).map(contact => (
                        <span key={contact.id} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded border border-blue-300 text-sm text-gray-900 font-medium">
                          {contact.name}
                          <button
                            onClick={() => removeContact(contact.id)}
                            className="ml-1 text-red-600 hover:text-red-800"
                            title="Remove contact"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Message Content */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                className="input min-h-[150px] resize-none"
                placeholder={messageType === 'sms' 
                  ? 'Type your message here...'
                  : 'Enter the message to be spoken in the voice call...'}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
              <div className="mt-2 text-sm text-gray-500">
                {messageContent.length} characters
              </div>
            </div>

            {/* Send Button */}
            <button
              className="btn btn-primary w-full flex items-center justify-center gap-2"
              onClick={handleSend}
              disabled={sendMutation.isPending}
            >
              <Send className="w-4 h-4" />
              {sendMutation.isPending ? 'Sending...' : `Send ${messageType === 'sms' ? 'SMS' : 'Voice Call'}`}
            </button>
          </div>

          {/* Message History */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Messages</h2>
            <div className="space-y-3">
              {messages && messages.length > 0 ? (
                messages.slice(0, 10).map((msg) => (
                  <div key={msg.id} className="border-l-4 border-primary-500 pl-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {msg.message_type.toUpperCase()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        msg.status === 'sent' ? 'bg-green-100 text-green-800' :
                        msg.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{msg.content}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No messages sent yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Message Templates */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Templates</h3>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.name}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                  onClick={() => setMessageContent(template.text)}
                >
                  <div className="font-medium text-sm text-gray-900">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{template.text}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
