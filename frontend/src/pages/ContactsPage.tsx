import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsAPI, Contact } from '../api/client';
import { Users, Search, Upload, Plus, Edit2, Trash2, Phone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const ContactsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: () => contactsAPI.getAll({ search }).then(res => res.data)
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
    toast.info('Call feature coming soon!');
  };

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
          
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search contacts by name or phone..."
          className="input pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            <button className="btn btn-secondary" onClick={clearSelection}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={contacts && selectedContacts.length === contacts.length}
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
              ) : contacts && contacts.length > 0 ? (
                contacts.map((contact) => (
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
                          onClick={() => deleteMutation.mutate(contact.id)}
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
    </div>
  );
};
