import React, { useState, useEffect } from 'react';
import { fetchStats, getMessageHistory, Stats, Message } from '../services/googleAppsScriptService';
import { BarChart3, Users, MessageSquare, Phone, Calendar } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [backendStats, setBackendStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);

  // Load stats from Google Apps Script on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        setStatsError(null);
        const data = await fetchStats();
        setBackendStats(data);
        
        // Also load recent messages
        const messages = await getMessageHistory();
        setRecentMessages(messages.slice(0, 10));
      } catch (error: any) {
        console.error('Failed to load stats:', error);
        setStatsError(error.message || 'Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Error Message */}
      {statsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading statistics: {statsError}
        </div>
      )}

      {/* Google Apps Script Stats from Backend */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading statistics...</div>
      ) : backendStats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card bg-blue-50">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Total Contacts</h3>
              <p className="text-3xl font-bold text-blue-600">{backendStats.totalContacts || 0}</p>
            </div>
            <div className="card bg-green-50">
              <h3 className="text-sm font-semibold text-green-900 mb-1">Opted In (Yes)</h3>
              <p className="text-3xl font-bold text-green-600">{backendStats.optInCount || 0}</p>
            </div>
            <div className="card bg-red-50">
              <h3 className="text-sm font-semibold text-red-900 mb-1">Opted Out (No)</h3>
              <p className="text-3xl font-bold text-red-600">{backendStats.optOutCount || 0}</p>
            </div>
            <div className="card bg-purple-50">
              <h3 className="text-sm font-semibold text-purple-900 mb-1">Messages Sent</h3>
              <p className="text-3xl font-bold text-purple-600">{recentMessages.filter(m => m.type === 'sms').length}</p>
            </div>
            <div className="card bg-orange-50">
              <h3 className="text-sm font-semibold text-orange-900 mb-1">Calls Made</h3>
              <p className="text-3xl font-bold text-orange-600">{recentMessages.filter(m => m.type === 'call').length}</p>
            </div>
          </div>
          
          {/* Group Statistics */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Groups</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <div className="text-4xl">👨</div>
                <div>
                  <h3 className="text-sm font-semibold text-blue-900">Men</h3>
                  <p className="text-2xl font-bold text-blue-600">{backendStats.menCount || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-pink-50 rounded-lg">
                <div className="text-4xl">👩</div>
                <div>
                  <h3 className="text-sm font-semibold text-pink-900">Women</h3>
                  <p className="text-2xl font-bold text-pink-600">{backendStats.womenCount || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg">
                <div className="text-4xl">🎓</div>
                <div>
                  <h3 className="text-sm font-semibold text-indigo-900">Young Adults</h3>
                  <p className="text-2xl font-bold text-indigo-600">{backendStats.youngAdultCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </>

      ) : null}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Messages</h2>
          <div className="space-y-3">
            {recentMessages.length > 0 ? (
              recentMessages.map((message, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{message.to}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      message.type === 'sms' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {message.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{message.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">
                      Status: {message.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(message.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No message history yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="space-y-3">
          <button className="w-full btn btn-primary flex items-center justify-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Send Bulk Message
          </button>
          <button className="w-full btn btn-primary flex items-center justify-center gap-2">
            <Phone className="w-5 h-5" />
            Make Announcement Call
          </button>
          <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Reminder
          </button>
          <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
            <Users className="w-5 h-5" />
            Import Contacts
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="card bg-primary-50 border border-primary-200">
        <h3 className="text-lg font-semibold text-primary-900 mb-2">System Features</h3>
        <ul className="space-y-2 text-sm text-primary-800">
          <li>✓ AI-powered voice conversations in multiple languages</li>
          <li>✓ Automated weekly and event-based reminders</li>
          <li>✓ Inbound call handling with intelligent responses</li>
          <li>✓ SMS and voice message broadcasting</li>
          <li>✓ Contact management and import from CSV</li>
        </ul>
      </div>
    </div>
  );
};
