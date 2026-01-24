import React, { useState, useEffect } from 'react';
import { fetchContacts, Contact } from '../services/googleAppsScriptService';
import { Users, Search, Loader, Send, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchContacts();
      setContacts(data);
      toast.success(`Loaded ${data.length} contacts from Google Sheets`);
    } catch (error: any) {
      console.error('Failed to load contacts:', error);
      setError(error.message || 'Failed to load contacts');
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredContacts = contacts.filter((contact) => {
    const name = (contact.name ?? '').toString().toLowerCase();
    const phone = (contact.phone ?? '').toString();
    const city = (contact.city ?? '').toString().toLowerCase();
    return (
      name.includes(normalizedSearch) ||
      phone.includes(search) ||
      city.includes(normalizedSearch)
    );
  });

  const toggleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContacts(newSelected);
  };

  const handleSendToMessaging = () => {
    const selected = contacts.filter(c => selectedContacts.has(c.id));
    if (selected.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }
    sessionStorage.setItem('selectedSheetContacts', JSON.stringify(selected));
    navigate('/messaging');
    toast.success(`${selected.length} contact(s) selected for messaging`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Contacts</h1>
        </div>
        {selectedContacts.size > 0 && (
          <button
            onClick={handleSendToMessaging}
            className="btn btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Send className="w-4 h-4" />
            Send Message ({selectedContacts.size})
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      <div className="card">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name, phone, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <button 
            onClick={loadContacts}
            disabled={loading}
            className="btn btn-primary whitespace-nowrap"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading contacts from Google Sheets...</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-sm text-gray-600">
                Showing {filteredContacts.length} of {contacts.length} contacts
              </div>
              {filteredContacts.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {selectedContacts.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Group
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedContacts.has(contact.id)}
                            onChange={() => toggleSelect(contact.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {contact.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {contact.phone}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {contact.city || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {contact.language}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {contact.group || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            contact.optIn === 'Yes' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {contact.optIn}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        {search ? 'No contacts match your search' : 'No contacts found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-3">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                        className="rounded mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {contact.name}
                          </h3>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                            contact.optIn === 'Yes' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {contact.optIn}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{contact.phone}</span>
                          </div>
                          {contact.city && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">📍</span>
                              <span>{contact.city}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {contact.language}
                            </span>
                            {contact.group && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                {contact.group}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {search ? 'No contacts match your search' : 'No contacts found'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
