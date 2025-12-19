import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { statisticsAPI, callsAPI } from '../api/client';
import { BarChart3, Users, MessageSquare, Phone, Calendar } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => statisticsAPI.get().then(res => res.data)
  });

  const { data: recentCalls } = useQuery({
    queryKey: ['calls'],
    queryFn: () => callsAPI.getAll({ limit: 10 }).then(res => res.data)
  });

  const StatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: number | string;
    color: string;
  }> = ({ icon, title, value, color }) => (
    <div className="card">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-600" />}
          title="Total Contacts"
          value={stats?.total_contacts || 0}
          color="bg-blue-100"
        />
        <StatCard
          icon={<MessageSquare className="w-6 h-6 text-green-600" />}
          title="Messages Sent"
          value={stats?.total_messages_sent || 0}
          color="bg-green-100"
        />
        <StatCard
          icon={<Phone className="w-6 h-6 text-purple-600" />}
          title="Calls Made"
          value={stats?.total_calls_made || 0}
          color="bg-purple-100"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6 text-orange-600" />}
          title="Active Reminders"
          value={stats?.scheduled_reminders || 0}
          color="bg-orange-100"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Calls */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Calls</h2>
          <div className="space-y-3">
            {recentCalls && recentCalls.length > 0 ? (
              recentCalls.map((call) => (
                <div key={call.id} className="border-l-4 border-primary-500 pl-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {call.caller_phone}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      call.direction === 'inbound' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {call.direction}
                    </span>
                  </div>
                  {call.conversation_summary && (
                    <p className="text-sm text-gray-600 line-clamp-2">{call.conversation_summary}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">
                      Duration: {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(call.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No call history yet</p>
            )}
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
