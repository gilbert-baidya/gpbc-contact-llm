import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Church } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(true);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password);
      
      if (success) {
        toast.success('Welcome back!');
        navigate(from, { replace: true });
      } else {
        toast.error('Invalid email or password');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg mb-4">
            <Church className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Church Contact System</h1>
          <p className="text-gray-600">Sign in to access the dashboard</p>
        </div>

        {/* Login Card */}
        <div className="card shadow-xl border-2 border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  className="input pl-10 w-full"
                  placeholder="your.email@gpbc.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10 w-full"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 w-full py-3 shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        {showDemoCredentials && (
          <div className="mt-6 card bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Demo Credentials</h3>
              </div>
              <button
                onClick={() => setShowDemoCredentials(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <button
                type="button"
                onClick={() => quickLogin('pastor@gpbc.org', 'pastor123')}
                className="w-full text-left p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <div className="font-semibold text-gray-900">👨‍✝️ Pastor Account</div>
                <div className="text-gray-600 text-xs mt-1">
                  pastor@gpbc.org / pastor123
                </div>
                <div className="text-blue-600 text-xs mt-1 font-medium">
                  ✓ Can send messages
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('admin@gpbc.org', 'admin123')}
                className="w-full text-left p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <div className="font-semibold text-gray-900">👤 Admin Account</div>
                <div className="text-gray-600 text-xs mt-1">
                  admin@gpbc.org / admin123
                </div>
                <div className="text-blue-600 text-xs mt-1 font-medium">
                  ✓ Can send messages
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('member@gpbc.org', 'member123')}
                className="w-full text-left p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <div className="font-semibold text-gray-900">👥 Regular Member</div>
                <div className="text-gray-600 text-xs mt-1">
                  member@gpbc.org / member123
                </div>
                <div className="text-red-600 text-xs mt-1 font-medium">
                  ✗ Cannot send messages (View only)
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Only Pastor and Admin accounts can send messages</p>
        </div>
      </div>
    </div>
  );
};
