import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI, contactsAPI } from '../api/client';
import { MessageSquare, Send, Users, Clock, X, Search, UserPlus, Sparkles, Save, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { getContacts, BackendContact } from '../api/backendApi';

export const MessagingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<'sms' | 'voice'>('sms');
  const [sendToAll, setSendToAll] = useState(false);
  const [sheetContacts, setSheetContacts] = useState<BackendContact[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [backendContacts, setBackendContacts] = useState<BackendContact[]>([]);
  const [showTemplates, setShowTemplates] = useState(true);
  const [templateCategory, setTemplateCategory] = useState<string>('all');

  // Load all backend contacts
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const data = await getContacts();
        setBackendContacts(data);
      } catch (error) {
        console.error('Failed to load contacts:', error);
      }
    };
    loadContacts();
  }, []);

  // Check if contacts were pre-selected from ContactsPage
  useEffect(() => {
    const preSelectedSheet = sessionStorage.getItem('selectedSheetContacts');
    
    if (preSelectedSheet) {
      const sheetData = JSON.parse(preSelectedSheet);
      setSheetContacts(sheetData.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        phone_e164: c.phone,
        language: 'English',
        optIn: 'Yes'
      })));
      setSendToAll(false);
      sessionStorage.removeItem('selectedSheetContacts');
      toast.success(`${sheetData.length} contact(s) selected`);
    }
  }, []);


  useQuery({
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
      setSheetContacts([]);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => toast.error('Failed to send message')
  });

  // Calculate SMS segments (160 chars per segment)
  const smsSegments = Math.ceil(messageContent.length / 160) || 1;
  
  // Get total recipients
  const totalRecipients = sendToAll 
    ? backendContacts.length 
    : sheetContacts.length;

  // Filter contacts for modal
  const filteredModalContacts = backendContacts.filter(contact => {
    const matchesSearch = !contactSearch || 
      contact.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      contact.phone?.includes(contactSearch) ||
      contact.phone_e164?.includes(contactSearch);
    
    const matchesGroup = groupFilter === 'all' || (contact as any).group === groupFilter;
    
    return matchesSearch && matchesGroup;
  });

  // Get unique groups
  const uniqueGroups = ['all', ...new Set(backendContacts.map(c => (c as any).group).filter(Boolean))];

  const handleSend = () => {
    if (!messageContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    let phoneNumbers: { id: number; name: string; phone: string }[] | undefined;
    
    if (sendToAll && backendContacts.length > 0) {
      phoneNumbers = backendContacts.map(c => ({
        id: c.id || 0,
        name: c.name,
        phone: c.phone_e164 || c.phone || ''
      })).filter(c => c.phone);
    } else if (sheetContacts.length > 0) {
      phoneNumbers = sheetContacts.map(c => ({
        id: c.id || 0,
        name: c.name,
        phone: c.phone_e164 || c.phone || ''
      })).filter(c => c.phone);
    }

    if (!phoneNumbers || phoneNumbers.length === 0) {
      toast.error('No contacts selected');
      return;
    }

    sendMutation.mutate({
      content: messageContent,
      message_type: messageType,
      send_to_all: sendToAll,
      phone_numbers: phoneNumbers,
      contact_ids: undefined
    });
  };

  const handleSelectFromModal = (contact: BackendContact) => {
    const exists = sheetContacts.some(c => c.id === contact.id);
    if (exists) {
      setSheetContacts(prev => prev.filter(c => c.id !== contact.id));
    } else {
      setSheetContacts(prev => [...prev, contact]);
    }
  };

  const handleSelectGroup = (group: string) => {
    const groupContacts = backendContacts.filter(c => (c as any).group === group);
    const allSelected = groupContacts.every(gc => sheetContacts.some(sc => sc.id === gc.id));
    
    if (allSelected) {
      // Deselect all in group
      setSheetContacts(prev => prev.filter(c => !(c as any).group || (c as any).group !== group));
    } else {
      // Select all in group
      const newContacts = groupContacts.filter(gc => !sheetContacts.some(sc => sc.id === gc.id));
      setSheetContacts(prev => [...prev, ...newContacts]);
    }
  };

  const templates = [
    { 
      name: 'Weekly Service', 
      category: 'Service',
      text: '🙏 Reminder: Church service this Sunday at 10:00 AM. Looking forward to seeing you!',
      icon: '⛪'
    },
    { 
      name: 'Wednesday Prayer', 
      category: 'Prayer',
      text: '📿 Join us for prayer meeting tonight at 7:00 PM. Your presence will be a blessing!',
      icon: '🙏'
    },
    { 
      name: 'Christmas Greeting', 
      category: 'Holiday',
      text: '🎄 Merry Christmas! May the joy and peace of Christmas be with you and your family.',
      icon: '🎄'
    },
    { 
      name: 'Easter Greeting', 
      category: 'Holiday',
      text: '🌸 Happy Easter! Wishing you a blessed and joyful Easter celebration!',
      icon: '🌸'
    },
    {
      name: 'Birthday Blessing',
      category: 'Personal',
      text: '🎂 Happy Birthday! May God bless you with joy, health, and prosperity on your special day!',
      icon: '🎂'
    },
    {
      name: 'Welcome New Member',
      category: 'Welcome',
      text: '👋 Welcome to our church family! We are blessed to have you. Feel free to reach out if you need anything.',
      icon: '👋'
    },
    {
      name: 'Event Reminder',
      category: 'Event',
      text: '📅 Don\'t forget! Our special event is coming up. Mark your calendar and join us!',
      icon: '📅'
    },
    {
      name: 'Thanksgiving',
      category: 'Holiday',
      text: '🦃 Happy Thanksgiving! Grateful for your presence in our church community. God bless you!',
      icon: '🦃'
    }
  ];

  const templateCategories = ['all', ...new Set(templates.map(t => t.category))];
  const filteredTemplates = templateCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === templateCategory);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Messaging</h1>
            <p className="text-sm text-gray-500">Send SMS or voice messages to your contacts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Compose Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recipient Selection Card */}
          <div className="card border-2 border-primary-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                Recipients
              </h2>
              <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-bold">
                {totalRecipients} selected
              </span>
            </div>

            {/* Quick Options */}
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={() => {
                  setSendToAll(!sendToAll);
                  if (!sendToAll) setSheetContacts([]);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  sendToAll 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4" />
                All Contacts ({backendContacts.length})
              </button>
              
              <button
                onClick={() => {
                  setShowContactModal(true);
                  setSendToAll(false);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                Select Contacts
              </button>

              {/* Quick Group Buttons */}
              {uniqueGroups.filter(g => g !== 'all' && g !== 'Unassigned').map(group => {
                const groupCount = backendContacts.filter(c => (c as any).group === group).length;
                const isSelected = sheetContacts.some(c => (c as any).group === group);
                return (
                  <button
                    key={group}
                    onClick={() => {
                      handleSelectGroup(group);
                      setSendToAll(false);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                    }`}
                  >
                    {group === 'Men' && '👨'}
                    {group === 'Women' && '👩'}
                    {group === 'YoungAdult' && '🎓'}
                    {group} ({groupCount})
                  </button>
                );
              })}
            </div>

            {/* Selected Contacts Display */}
            {!sendToAll && sheetContacts.length > 0 && (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-blue-900">
                    {sheetContacts.length} Contact(s) Selected
                  </p>
                  <button
                    onClick={() => setSheetContacts([])}
                    className="text-xs px-3 py-1 bg-white hover:bg-red-50 text-red-600 rounded-full font-medium transition-colors border border-red-200"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {sheetContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="group flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {contact.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                          <p className="text-xs text-gray-500 truncate">{contact.phone_e164 || contact.phone}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSheetContacts(prev => prev.filter(c => c.id !== contact.id))}
                        className="ml-2 p-1 hover:bg-red-100 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!sendToAll && sheetContacts.length === 0 && (
              <div className="text-center py-8 px-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                <Sparkles className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                <p className="text-amber-800 font-medium">No contacts selected</p>
                <p className="text-sm text-amber-600 mt-1">Click "Select Contacts" or choose "All Contacts" to continue</p>
              </div>
            )}
          </div>

          {/* Message Compose Card */}
          <div className="card border-2 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              Compose Message
            </h2>
            
            {/* Message Type Toggle */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
              <div className="inline-flex rounded-lg border-2 border-gray-200 p-1 bg-gray-50">
                <button
                  onClick={() => setMessageType('sms')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    messageType === 'sms'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📱 SMS Text
                </button>
                <button
                  onClick={() => setMessageType('voice')}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    messageType === 'voice'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📞 Voice Call
                </button>
              </div>
            </div>

            {/* Message Textarea */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {messageType === 'sms' ? 'Your Message' : 'Voice Script'}
              </label>
              <textarea
                className="input min-h-[180px] resize-none text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={messageType === 'sms' 
                  ? '✍️ Type your message here...'
                  : '🎤 Enter the message to be spoken in the voice call...'}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
              
              {/* Character Count & SMS Segments */}
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className={`font-medium ${messageContent.length > 160 ? 'text-amber-600' : 'text-gray-600'}`}>
                  {messageContent.length} characters
                </span>
                {messageType === 'sms' && messageContent.length > 0 && (
                  <span className="text-gray-500">
                    📊 {smsSegments} SMS segment{smsSegments > 1 ? 's' : ''}
                    {smsSegments > 1 && ' (charged as ' + smsSegments + ' messages)'}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                className="flex-1 btn bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg flex items-center justify-center gap-2 py-3"
                onClick={handleSend}
                disabled={sendMutation.isPending || (!sendToAll && sheetContacts.length === 0) || !messageContent.trim()}
              >
                <Send className="w-5 h-5" />
                {sendMutation.isPending ? 'Sending...' : `Send to ${totalRecipients} contact${totalRecipients !== 1 ? 's' : ''}`}
              </button>
              
              <button
                className="btn btn-secondary flex items-center gap-2 px-6"
                onClick={() => {
                  localStorage.setItem('messageDraft', messageContent);
                  toast.success('Draft saved!');
                }}
                title="Save draft"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>

            {/* Cost Estimate (if applicable) */}
            {messageType === 'sms' && totalRecipients > 0 && messageContent.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Estimated Cost:</strong> {smsSegments * totalRecipients} SMS credit{smsSegments * totalRecipients > 1 ? 's' : ''}
                  <span className="text-blue-600 ml-2">
                    ({totalRecipients} recipient{totalRecipients > 1 ? 's' : ''} × {smsSegments} segment{smsSegments > 1 ? 's' : ''})
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Recent Messages */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              Recent Messages
            </h2>
            <div className="space-y-3">
              {messages && messages.length > 0 ? (
                messages.slice(0, 10).map((msg) => (
                  <div key={msg.id} className="border-l-4 border-primary-500 pl-4 py-3 bg-gray-50 rounded-r-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                        {msg.message_type === 'sms' ? '📱 SMS' : '📞 Voice'}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        msg.status === 'sent' ? 'bg-green-100 text-green-800' :
                        msg.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {msg.status === 'sent' ? '✓ Sent' : msg.status === 'failed' ? '✗ Failed' : '⏳ Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">{msg.content}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No messages sent yet</p>
                  <p className="text-sm mt-1">Your message history will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Templates */}
        <div className="space-y-6">
          <div className="card sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Quick Templates
              </h3>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {showTemplates ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {showTemplates && (
              <>
                {/* Template Categories */}
                <div className="mb-4">
                  <select
                    className="input text-sm"
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                  >
                    {templateCategories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? '📋 All Templates' : `${cat}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {filteredTemplates.map((template) => (
                    <button
                      key={template.name}
                      className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all group"
                      onClick={() => setMessageContent(template.text)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-900 group-hover:text-primary-700 mb-1">
                            {template.name}
                          </div>
                          <div className="text-xs text-gray-500 line-clamp-2 group-hover:text-gray-700">
                            {template.text}
                          </div>
                          <div className="mt-1">
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              {template.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contact Selection Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary-600" />
                  Select Contacts
                </h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Search & Filter */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    className="input pl-10 w-full"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <select
                  className="input w-48"
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                >
                  {uniqueGroups.map(group => (
                    <option key={group} value={group}>
                      {group === 'all' ? '📋 All Groups' : group}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 text-sm text-gray-600">
                {sheetContacts.length} of {backendContacts.length} contacts selected
              </div>
            </div>

            {/* Modal Body - Contact List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredModalContacts.map((contact) => {
                  const isSelected = sheetContacts.some(c => c.id === contact.id);
                  return (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectFromModal(contact)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                        isSelected ? 'bg-primary-600' : 'bg-gray-400'
                      }`}>
                        {contact.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{contact.name}</p>
                        <p className="text-sm text-gray-600 truncate">{contact.phone_e164 || contact.phone}</p>
                        {(contact as any).group && (
                          <span className="inline-block text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full mt-1">
                            {(contact as any).group}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="text-primary-600 flex-shrink-0">
                          <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {filteredModalContacts.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Search className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No contacts found</p>
                  <p className="text-sm mt-1">Try adjusting your search or filter</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="btn btn-secondary px-6"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="btn btn-primary px-6 flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Done ({sheetContacts.length} selected)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
