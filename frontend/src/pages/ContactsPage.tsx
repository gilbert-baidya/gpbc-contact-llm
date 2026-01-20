import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsAPI, Contact } from '../api/client';
import { getContacts, BackendContact } from '../api/backendApi';
import { Users, Search, Upload, Plus, Edit2, Trash2, Phone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const ContactsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [selectedSheetContacts, setSelectedSheetContacts] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [backendContacts, setBackendContacts] = useState<BackendContact[]>([]);
  const [backendLoading, setBackendLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state_zip: '',
    preferred_language: 'english'
  });

  // Load contacts from backend on mount
  useEffect(() => {
    const loadBackendContacts = async () => {
      try {
        setBackendLoading(true);
        setBackendError(null);
        const data = await getContacts();
        setBackendContacts(data);
      } catch (error: any) {
        console.error('Failed to load contacts from backend:', error);
        setBackendError(error.message || 'Failed to load contacts');
      } finally {
        setBackendLoading(false);
      }
    };

    loadBackendContacts();
  }, []);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => contactsAPI.getAll({ search, limit: 1000 }).then(res => res.data)
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => contactsAPI.import(file),
    onSuccess: (response) => {
      toast.success(`Imported ${response.data.imported} contacts!`);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: () => toast.error('Failed to import contacts')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contactsAPI.delete(id),
    onSuccess: () => {
      toast.success('Contact removed');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Delete all contacts in parallel
      await Promise.all(ids.map(id => contactsAPI.delete(id)));
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} contact(s) removed`);
      setSelectedContacts([]);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: () => {
      toast.error('Failed to delete contacts');
      setShowDeleteConfirm(false);
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Contact>) => contactsAPI.create(data),
    onSuccess: () => {
      toast.success('Contact added successfully!');
      setShowAddModal(false);
      setNewContact({
        name: '',
        phone: '',
        address: '',
        city: '',
        state_zip: '',
        preferred_language: 'english'
      });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: () => toast.error('Failed to add contact')
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  const toggleSelectContact = (id: number) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (contacts) {
      setSelectedContacts(contacts.map(c => c.id));
    }
  };

  const clearSelection = () => setSelectedContacts([]);

  const handleSendMessage = () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }
    // Store selected contacts in sessionStorage and navigate
    sessionStorage.setItem('selectedContactIds', JSON.stringify(selectedContacts));
    navigate('/messaging');
  };

  const handleMakeCall = () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }
    toast('Call feature coming soon!', { icon: 'ℹ️' });
  };

  const handleDeleteSelected = () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteMultipleMutation.mutate(selectedContacts);
  };

  const handleDeleteSingle = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this contact?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) {
      toast.error('Name and phone are required');
      return;
    }
    createMutation.mutate({
      ...newContact,
      active: true
    });
  };

  // Handler for Google Sheets contacts
  const handleSheetContactToggle = (id: number) => {
    setSelectedSheetContacts(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSendToSheetContacts = () => {
    if (selectedSheetContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }
    // Store phone numbers in sessionStorage and navigate
    const selectedPhones = backendContacts
      .filter(c => c.id && selectedSheetContacts.includes(c.id))
      .map(c => ({ id: c.id, name: c.name, phone: c.phone_e164 || c.phone }));
    
    sessionStorage.setItem('selectedSheetContacts', JSON.stringify(selectedPhones));
    navigate('/messaging');
  };

  // Filter contacts based on search
  const filteredBackendContacts = backendContacts.filter(contact => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.phone?.includes(search) ||
      contact.phone_e164?.includes(search)
    );
  });

  // Group contacts by category
  const groupedContacts = filteredBackendContacts.reduce((acc, contact) => {
    const group = (contact as any).group || 'Unassigned';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(contact);
    return acc;
  }, {} as Record<string, BackendContact[]>);

  // Sort groups: Men, Women, YoungAdult, then others alphabetically
  const groupOrder = ['Men', 'Women', 'YoungAdult'];
  const sortedGroups = Object.keys(groupedContacts).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
        </div>
        
        <div className="flex gap-3">
          <label className="btn btn-secondary cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          <button 
            className="btn btn-primary flex items-center gap-2"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Google Apps Script Contacts from Backend */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Google Sheets Contacts (Opted In)</h2>
          {selectedSheetContacts.length > 0 && (
            <button 
              className="btn btn-primary flex items-center gap-2"
              onClick={handleSendToSheetContacts}
            >
              <MessageSquare className="w-4 h-4" />
              Send Message ({selectedSheetContacts.length})
            </button>
          )}
        </div>

        {/* Quick Group Selection */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Group Selection:</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const menIds = backendContacts
                  .filter(c => (c as any).group === 'Men' && c.id)
                  .map(c => c.id!);
                setSelectedSheetContacts(menIds);
              }}
              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span className="text-xl">👨</span>
              Select All Men ({backendContacts.filter(c => (c as any).group === 'Men').length})
            </button>
            <button
              onClick={() => {
                const womenIds = backendContacts
                  .filter(c => (c as any).group === 'Women' && c.id)
                  .map(c => c.id!);
                setSelectedSheetContacts(womenIds);
              }}
              className="px-4 py-2 bg-pink-100 hover:bg-pink-200 text-pink-800 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span className="text-xl">👩</span>
              Select All Women ({backendContacts.filter(c => (c as any).group === 'Women').length})
            </button>
            <button
              onClick={() => {
                const youngAdultIds = backendContacts
                  .filter(c => (c as any).group === 'YoungAdult' && c.id)
                  .map(c => c.id!);
                setSelectedSheetContacts(youngAdultIds);
              }}
              className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span className="text-xl">🎓</span>
              Select All Young Adults ({backendContacts.filter(c => (c as any).group === 'YoungAdult').length})
            </button>
            <button
              onClick={() => {
                const allIds = backendContacts
                  .filter(c => c.id)
                  .map(c => c.id!);
                setSelectedSheetContacts(allIds);
              }}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Select All ({backendContacts.length})
            </button>
            {selectedSheetContacts.length > 0 && (
              <button
                onClick={() => setSelectedSheetContacts([])}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name or phone..."
              className="input pl-10 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        {backendError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            Error loading contacts: {backendError}
          </div>
        )}

        {backendLoading ? (
          <div className="text-center py-8 text-gray-500">Loading contacts from Google Sheets...</div>
        ) : filteredBackendContacts.length > 0 ? (
          <>
            {search && (
              <div className="mb-3 text-sm text-gray-600">
                Showing {filteredBackendContacts.length} of {backendContacts.length} contacts
              </div>
            )}
            
            {/* Display contacts grouped by category */}
            {sortedGroups.map((groupName) => (
              <div key={groupName} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-700">
                    {groupName === 'Men' && '👨 Men'}
                    {groupName === 'Women' && '👩 Women'}
                    {groupName === 'YoungAdult' && '🎓 Young Adults'}
                    {!['Men', 'Women', 'YoungAdult'].includes(groupName) && `📋 ${groupName}`}
                  </h3>
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                    {groupedContacts[groupName].length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={groupedContacts[groupName].every(c => selectedSheetContacts.includes(c.id!))}
                            onChange={(e) => {
                              const groupIds = groupedContacts[groupName].map(c => c.id!).filter(Boolean);
                              if (e.target.checked) {
                                setSelectedSheetContacts(prev => [...new Set([...prev, ...groupIds])]);
                              } else {
                                setSelectedSheetContacts(prev => prev.filter(id => !groupIds.includes(id)));
                              }
                            }}
                            className="rounded text-primary-600"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">City</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Language</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedContacts[groupName].map((contact, index) => (
                        <tr key={contact.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {contact.id && (
                              <input
                                type="checkbox"
                                checked={selectedSheetContacts.includes(contact.id)}
                                onChange={() => handleSheetContactToggle(contact.id!)}
                                className="rounded text-primary-600"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{contact.name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{contact.phone_e164 || contact.phone || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{(contact as any).city || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{contact.language || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="mt-4 text-sm text-gray-600">
              Total: {filteredBackendContacts.length} contact(s)
            </div>
          </>
        ) : search ? (
          <div className="text-center py-8 text-gray-500">
            No contacts found matching "{search}"
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No contacts found in Google Sheets</div>
        )}
      </div>

      {/* Selection Actions */}
      {selectedContacts.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-primary-900 font-medium">
            {selectedContacts.length} contact(s) selected
          </span>
          <div className="flex gap-2">
            <button className="btn btn-primary flex items-center gap-2" onClick={handleSendMessage}>
              <MessageSquare className="w-4 h-4" />
              Send Message
            </button>
            <button className="btn btn-primary flex items-center gap-2" onClick={handleMakeCall}>
              <Phone className="w-4 h-4" />
              Make Call
            </button>
            <button className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2" onClick={handleDeleteSelected}>
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
            <button className="btn btn-secondary" onClick={clearSelection}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Local Database Contacts Table - Hidden since using Google Sheets */}
      {false && contacts && contacts.length > 0 && (
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedContacts.length === (contacts?.length || 0)}
                    onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">City</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Language</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading contacts...
                  </td>
                </tr>
              ) : contacts?.length ? (
                contacts?.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleSelectContact(contact.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{contact.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contact.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contact.city || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{contact.preferred_language}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="p-1 hover:bg-gray-200 rounded">
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          className="p-1 hover:bg-red-100 rounded"
                          onClick={(e) => handleDeleteSingle(contact.id, e)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No contacts found. Import a CSV file to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {selectedContacts.length} contact(s)? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMultipleMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn bg-red-600 text-white hover:bg-red-700"
                onClick={confirmDelete}
                disabled={deleteMultipleMutation.isPending}
              >
                {deleteMultipleMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Contact</h3>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+1234567890"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  className="input"
                  value={newContact.address}
                  onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  className="input"
                  value={newContact.city}
                  onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Zip
                </label>
                <input
                  type="text"
                  className="input"
                  value={newContact.state_zip}
                  onChange={(e) => setNewContact({ ...newContact, state_zip: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Language
                </label>
                <select
                  className="input"
                  value={newContact.preferred_language}
                  onChange={(e) => setNewContact({ ...newContact, preferred_language: e.target.value })}
                >
                  <option value="english">English</option>
                  <option value="bengali">Bengali</option>
                  <option value="spanish">Spanish</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
