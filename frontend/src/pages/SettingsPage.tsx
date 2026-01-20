import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Mail, Key, Lock, CheckCircle, X } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">Manage authentication and permissions</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current User Info */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            Your Account
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border-2 border-primary-200">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xl">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <div className="mt-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user?.role === 'pastor' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {user?.role === 'admin' ? '👤 Admin' : 
                     user?.role === 'pastor' ? '👨‍✝️ Pastor' : 
                     '👥 Member'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Key className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Role</p>
                  <p className="text-sm text-gray-900 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-600" />
            Your Permissions
          </h2>

          <div className="space-y-3">
            <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
              true ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">View Dashboard</p>
                  <p className="text-xs text-gray-600">Access statistics and overview</p>
                </div>
              </div>
              <span className="text-green-600 font-semibold">Allowed</span>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
              true ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">View Contacts</p>
                  <p className="text-xs text-gray-600">Browse contact list</p>
                </div>
              </div>
              <span className="text-green-600 font-semibold">Allowed</span>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
              (user?.role === 'admin' || user?.role === 'pastor') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {(user?.role === 'admin' || user?.role === 'pastor') ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Send Messages</p>
                  <p className="text-xs text-gray-600">Send SMS and voice messages</p>
                </div>
              </div>
              <span className={`font-semibold ${
                (user?.role === 'admin' || user?.role === 'pastor') ? 'text-green-600' : 'text-red-600'
              }`}>
                {(user?.role === 'admin' || user?.role === 'pastor') ? 'Allowed' : 'Restricted'}
              </span>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
              user?.role === 'admin' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {user?.role === 'admin' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Manage Users</p>
                  <p className="text-xs text-gray-600">Add/remove users and permissions</p>
                </div>
              </div>
              <span className={`font-semibold ${
                user?.role === 'admin' ? 'text-green-600' : 'text-red-600'
              }`}>
                {user?.role === 'admin' ? 'Allowed' : 'Admin Only'}
              </span>
            </div>
          </div>
        </div>

        {/* Authentication Info */}
        <div className="card lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            Authentication System
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">👤</span>
                <h3 className="font-semibold text-purple-900">Admin Role</h3>
              </div>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>✓ Full system access</li>
                <li>✓ Send messages</li>
                <li>✓ Manage users</li>
                <li>✓ System settings</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">👨‍✝️</span>
                <h3 className="font-semibold text-blue-900">Pastor Role</h3>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ View dashboard</li>
                <li>✓ Send messages</li>
                <li>✓ View contacts</li>
                <li>✗ No user management</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">👥</span>
                <h3 className="font-semibold text-gray-900">Member Role</h3>
              </div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ View dashboard</li>
                <li>✓ View contacts</li>
                <li>✗ Cannot send messages</li>
                <li>✗ No user management</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">🔐 Security Note</h3>
            <p className="text-sm text-blue-800">
              Only Admin and Pastor accounts can send SMS and voice messages to protect against unauthorized communications. 
              Contact your administrator if you need messaging permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
