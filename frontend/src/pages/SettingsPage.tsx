import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Mail, Key, Lock, CheckCircle, X, Edit2, Save, Bell, Sun, Moon, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

type ThemeMode = 'light' | 'dark' | 'system';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  
  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    messageAlerts: true,
    weeklyReports: true,
    systemUpdates: false,
  });
  
  // Theme preference
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme') as ThemeMode;
    return saved || 'light';
  });
  
  const [isSaving, setIsSaving] = useState(false);

  // Apply theme on mount and when changed
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };
    
    applyTheme();
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle theme change
  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme === 'system' ? 'system default' : newTheme + ' mode'}`);
  };

  // Handle notification toggle
  const handleNotificationToggle = async (key: keyof typeof notifications) => {
    const newValue = !notifications[key];
    setNotifications(prev => ({ ...prev, [key]: newValue }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Notification preference updated');
    } catch (error) {
      // Revert on error
      setNotifications(prev => ({ ...prev, [key]: !newValue }));
      toast.error('Failed to update preference');
    }
  };

  // Handle profile update
  const handleSaveProfile = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password changed successfully!');
      setIsEditingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setIsEditingProfile(false);
  };

  const handleCancelPassword = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsEditingPassword(false);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="p-2 lg:p-3 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg">
            <Shield className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-xs lg:text-sm text-gray-500">Manage authentication and permissions</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Current User Info */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 lg:w-5 lg:h-5 text-primary-600" />
              Your Account
            </h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit profile"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {!isEditingProfile ? (
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center gap-2 lg:gap-3 p-3 lg:p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border-2 border-primary-200">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg lg:text-xl flex-shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs lg:text-sm text-gray-600 truncate">{user?.email}</p>
                  <div className="mt-1 lg:mt-2">
                    <span className={`text-xs px-2 lg:px-3 py-1 rounded-full font-medium inline-flex items-center gap-1 ${
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

              <div className="grid grid-cols-1 gap-2 lg:gap-3">
                <div className="flex items-center gap-2 lg:gap-3 p-2.5 lg:p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500">Email</p>
                    <p className="text-sm text-gray-900 truncate">{user?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 lg:gap-3 p-2.5 lg:p-3 bg-gray-50 rounded-lg">
                  <Key className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Role</p>
                    <p className="text-sm text-gray-900 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 lg:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Password Change */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 lg:w-5 lg:h-5 text-primary-600" />
              Change Password
            </h2>
          </div>

          {!isEditingPassword ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Keep your account secure by regularly updating your password.
              </p>
              <button
                onClick={() => setIsEditingPassword(true)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Change Password
              </button>
            </div>
          ) : (
            <div className="space-y-3 lg:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  onClick={handleCancelPassword}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-primary-600" />
              Notification Preferences
            </h2>
          </div>

          <div className="space-y-3 lg:space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Choose how you want to receive notifications and updates.
            </p>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-sm lg:text-base text-gray-900">Email Notifications</p>
                <p className="text-xs lg:text-sm text-gray-600 mt-0.5">Receive updates and alerts via email</p>
              </div>
              <button
                onClick={() => handleNotificationToggle('emailNotifications')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  notifications.emailNotifications ? 'bg-primary-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={notifications.emailNotifications}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-sm lg:text-base text-gray-900">SMS Notifications</p>
                <p className="text-xs lg:text-sm text-gray-600 mt-0.5">Get text message alerts for urgent updates</p>
              </div>
              <button
                onClick={() => handleNotificationToggle('smsNotifications')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  notifications.smsNotifications ? 'bg-primary-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={notifications.smsNotifications}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.smsNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Message Alerts */}
            <div className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-sm lg:text-base text-gray-900">Message Alerts</p>
                <p className="text-xs lg:text-sm text-gray-600 mt-0.5">Notify when new messages are received</p>
              </div>
              <button
                onClick={() => handleNotificationToggle('messageAlerts')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  notifications.messageAlerts ? 'bg-primary-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={notifications.messageAlerts}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.messageAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Weekly Reports */}
            <div className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-sm lg:text-base text-gray-900">Weekly Reports</p>
                <p className="text-xs lg:text-sm text-gray-600 mt-0.5">Receive weekly activity summaries</p>
              </div>
              <button
                onClick={() => handleNotificationToggle('weeklyReports')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  notifications.weeklyReports ? 'bg-primary-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={notifications.weeklyReports}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.weeklyReports ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* System Updates */}
            <div className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-sm lg:text-base text-gray-900">System Updates</p>
                <p className="text-xs lg:text-sm text-gray-600 mt-0.5">Get notified about system maintenance and updates</p>
              </div>
              <button
                onClick={() => handleNotificationToggle('systemUpdates')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  notifications.systemUpdates ? 'bg-primary-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={notifications.systemUpdates}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.systemUpdates ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Theme Preference */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Sun className="w-4 h-4 lg:w-5 lg:h-5 text-primary-600" />
              Theme Preference
            </h2>
          </div>

          <div className="space-y-3 lg:space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Choose your preferred theme or let the system decide.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Light Theme */}
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === 'light'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-3 rounded-full ${
                    theme === 'light' ? 'bg-primary-100' : 'bg-gray-200'
                  }`}>
                    <Sun className={`w-6 h-6 ${
                      theme === 'light' ? 'text-primary-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-gray-900">Light</p>
                    <p className="text-xs text-gray-600 mt-0.5">Bright and clear</p>
                  </div>
                  {theme === 'light' && (
                    <CheckCircle className="w-5 h-5 text-primary-600 mt-1" />
                  )}
                </div>
              </button>

              {/* Dark Theme */}
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-3 rounded-full ${
                    theme === 'dark' ? 'bg-primary-100' : 'bg-gray-200'
                  }`}>
                    <Moon className={`w-6 h-6 ${
                      theme === 'dark' ? 'text-primary-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-gray-900">Dark</p>
                    <p className="text-xs text-gray-600 mt-0.5">Easy on eyes</p>
                  </div>
                  {theme === 'dark' && (
                    <CheckCircle className="w-5 h-5 text-primary-600 mt-1" />
                  )}
                </div>
              </button>

              {/* System Theme */}
              <button
                onClick={() => handleThemeChange('system')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === 'system'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-3 rounded-full ${
                    theme === 'system' ? 'bg-primary-100' : 'bg-gray-200'
                  }`}>
                    <Monitor className={`w-6 h-6 ${
                      theme === 'system' ? 'text-primary-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-gray-900">System</p>
                    <p className="text-xs text-gray-600 mt-0.5">Auto adjust</p>
                  </div>
                  {theme === 'system' && (
                    <CheckCircle className="w-5 h-5 text-primary-600 mt-1" />
                  )}
                </div>
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> System theme automatically switches between light and dark based on your device settings.
              </p>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="card">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 lg:w-5 lg:h-5 text-primary-600" />
            Your Permissions
          </h2>

          <div className="space-y-2 lg:space-y-3">
            <div className={`flex items-center justify-between p-3 lg:p-4 rounded-lg border-2 ${
              true ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm lg:text-base text-gray-900">View Dashboard</p>
                  <p className="text-xs text-gray-600 hidden lg:block">Access statistics and overview</p>
                </div>
              </div>
              <span className="text-xs lg:text-sm text-green-600 font-semibold whitespace-nowrap ml-2">Allowed</span>
            </div>

            <div className={`flex items-center justify-between p-3 lg:p-4 rounded-lg border-2 ${
              true ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm lg:text-base text-gray-900">View Contacts</p>
                  <p className="text-xs text-gray-600 hidden lg:block">Browse contact list</p>
                </div>
              </div>
              <span className="text-xs lg:text-sm text-green-600 font-semibold whitespace-nowrap ml-2">Allowed</span>
            </div>

            <div className={`flex items-center justify-between p-3 lg:p-4 rounded-lg border-2 ${
              (user?.role === 'admin' || user?.role === 'pastor') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                {(user?.role === 'admin' || user?.role === 'pastor') ? (
                  <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 lg:w-5 lg:h-5 text-red-600 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm lg:text-base text-gray-900">Send Messages</p>
                  <p className="text-xs text-gray-600 hidden lg:block">Send SMS and voice messages</p>
                </div>
              </div>
              <span className={`text-xs lg:text-sm font-semibold whitespace-nowrap ml-2 ${
                (user?.role === 'admin' || user?.role === 'pastor') ? 'text-green-600' : 'text-red-600'
              }`}>
                {(user?.role === 'admin' || user?.role === 'pastor') ? 'Allowed' : 'Restricted'}
              </span>
            </div>

            <div className={`flex items-center justify-between p-3 lg:p-4 rounded-lg border-2 ${
              user?.role === 'admin' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                {user?.role === 'admin' ? (
                  <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 lg:w-5 lg:h-5 text-red-600 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm lg:text-base text-gray-900">Manage Users</p>
                  <p className="text-xs text-gray-600 hidden lg:block">Add/remove users and permissions</p>
                </div>
              </div>
              <span className={`text-xs lg:text-sm font-semibold whitespace-nowrap ml-2 ${
                user?.role === 'admin' ? 'text-green-600' : 'text-red-600'
              }`}>
                {user?.role === 'admin' ? 'Allowed' : 'Admin Only'}
              </span>
            </div>
          </div>
        </div>

        {/* Authentication Info */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 lg:w-5 lg:h-5 text-primary-600" />
            Authentication System
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
            <div className="p-3 lg:p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl lg:text-2xl">👤</span>
                <h3 className="font-semibold text-sm lg:text-base text-purple-900">Admin Role</h3>
              </div>
              <ul className="text-xs lg:text-sm text-purple-800 space-y-0.5 lg:space-y-1">
                <li>✓ Full system access</li>
                <li>✓ Send messages</li>
                <li>✓ Manage users</li>
                <li>✓ System settings</li>
              </ul>
            </div>

            <div className="p-3 lg:p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl lg:text-2xl">👨‍✝️</span>
                <h3 className="font-semibold text-sm lg:text-base text-blue-900">Pastor Role</h3>
              </div>
              <ul className="text-xs lg:text-sm text-blue-800 space-y-0.5 lg:space-y-1">
                <li>✓ View dashboard</li>
                <li>✓ Send messages</li>
                <li>✓ View contacts</li>
                <li>✗ No user management</li>
              </ul>
            </div>

            <div className="p-3 lg:p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl lg:text-2xl">👥</span>
                <h3 className="font-semibold text-sm lg:text-base text-gray-900">Member Role</h3>
              </div>
              <ul className="text-xs lg:text-sm text-gray-700 space-y-0.5 lg:space-y-1">
                <li>✓ View dashboard</li>
                <li>✓ View contacts</li>
                <li>✗ Cannot send messages</li>
                <li>✗ No user management</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 lg:mt-6 p-3 lg:p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h3 className="font-semibold text-sm lg:text-base text-blue-900 mb-2 flex items-center gap-2">
              <span>🔐</span> Security Note
            </h3>
            <p className="text-xs lg:text-sm text-blue-800 leading-relaxed">
              Only Admin and Pastor accounts can send SMS and voice messages to protect against unauthorized communications. 
              Contact your administrator if you need messaging permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
