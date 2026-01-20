import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remindersAPI } from '../api/client';
import { Calendar, Plus, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export const RemindersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    message_content: '',
    message_type: 'sms' as 'sms' | 'voice',
    schedule_type: 'weekly',
    schedule_day: 'sunday',
    schedule_time: '09:00',
    send_to_all: true
  });

  const { data: reminders } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersAPI.getAll().then(res => res.data)
  });

  const createMutation = useMutation({
    mutationFn: remindersAPI.create,
    onSuccess: () => {
      toast.success('Reminder created!');
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      resetForm();
    },
    onError: () => toast.error('Failed to create reminder')
  });

  const deleteMutation = useMutation({
    mutationFn: remindersAPI.delete,
    onSuccess: () => {
      toast.success('Reminder deleted');
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      message_content: '',
      message_type: 'sms',
      schedule_type: 'weekly',
      schedule_day: 'sunday',
      schedule_time: '09:00',
      send_to_all: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Reminders</h1>
        </div>
        <button
          className="btn btn-primary flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" />
          New Reminder
        </button>
      </div>

      {/* Reminders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reminders && reminders.length > 0 ? (
          reminders.map((reminder) => (
            <div key={reminder.id} className="card border-l-4 border-primary-500">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{reminder.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {reminder.schedule_type === 'weekly' 
                        ? `Every ${reminder.schedule_day} at ${reminder.schedule_time}`
                        : `Once on ${reminder.schedule_date}`}
                    </span>
                  </div>
                </div>
                <button
                  className="p-1 hover:bg-red-100 rounded"
                  onClick={() => deleteMutation.mutate(reminder.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                {reminder.message_content}
              </p>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  reminder.message_type === 'sms' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {reminder.message_type.toUpperCase()}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                  {reminder.send_to_all ? 'All Contacts' : 'Selected'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full card text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No reminders scheduled yet</p>
            <button
              className="btn btn-primary mt-4"
              onClick={() => setShowModal(true)}
            >
              Create Your First Reminder
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Reminder</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Message Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="message_type"
                      value="sms"
                      checked={formData.message_type === 'sms'}
                      onChange={(e) => setFormData({ ...formData, message_type: e.target.value as 'sms' })}
                    />
                    SMS
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="message_type"
                      value="voice"
                      checked={formData.message_type === 'voice'}
                      onChange={(e) => setFormData({ ...formData, message_type: e.target.value as 'voice' })}
                    />
                    Voice
                  </label>
                </div>
              </div>

              {/* Schedule Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Type
                </label>
                <select
                  className="input"
                  value={formData.schedule_type}
                  onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                >
                  <option value="weekly">Weekly</option>
                  <option value="once">One Time</option>
                </select>
              </div>

              {/* Day (for weekly) */}
              {formData.schedule_type === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day of Week
                  </label>
                  <select
                    className="input"
                    value={formData.schedule_day}
                    onChange={(e) => setFormData({ ...formData, schedule_day: e.target.value })}
                  >
                    <option value="sunday">Sunday</option>
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                  </select>
                </div>
              )}

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  className="input"
                  value={formData.schedule_time}
                  onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                  required
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  className="input min-h-[120px]"
                  value={formData.message_content}
                  onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                  required
                />
              </div>

              {/* Recipients */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_to_all}
                    onChange={(e) => setFormData({ ...formData, send_to_all: e.target.checked })}
                    className="rounded"
                  />
                  Send to all active contacts
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Create Reminder
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
