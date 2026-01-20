import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Users, MessageSquare, Calendar, Phone, Menu, LogOut, Shield, Settings } from 'lucide-react';

import { DashboardPage } from './pages/DashboardPage';
import { ContactsPage } from './pages/ContactsPage';
import { MessagingPage } from './pages/MessagingPage';
import { RemindersPage } from './pages/RemindersPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import toast from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const NavLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ to, icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-primary-600 text-white'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="font-medium">{children}</span>
    </Link>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const { user, logout, canSendMessages } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 flex-1">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-primary-600 text-white p-2 rounded-lg">
                <Phone className="w-6 h-6" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="font-bold text-lg text-gray-900">Church Contact</h1>
                  <p className="text-xs text-gray-500">Communication System</p>
                </div>
              )}
            </div>

            <nav className="space-y-2">
              <NavLink to="/" icon={<LayoutDashboard className="w-5 h-5" />}>
                {sidebarOpen && 'Dashboard'}
              </NavLink>
              <NavLink to="/contacts" icon={<Users className="w-5 h-5" />}>
                {sidebarOpen && 'Contacts'}
              </NavLink>
              <NavLink to="/messaging" icon={<MessageSquare className="w-5 h-5" />}>
                {sidebarOpen && 'Messaging'}
                {!canSendMessages && sidebarOpen && (
                  <span className="ml-auto">
                    <Shield className="w-4 h-4 text-gray-400" />
                  </span>
                )}
              </NavLink>
              <NavLink to="/reminders" icon={<Calendar className="w-5 h-5" />}>
                {sidebarOpen && 'Reminders'}
              </NavLink>
              <NavLink to="/settings" icon={<Settings className="w-5 h-5" />}>
                {sidebarOpen && 'Settings'}
              </NavLink>
            </nav>
          </div>

          {/* User Profile Section */}
          <div className="p-4 border-t border-gray-200">
            {sidebarOpen ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5 mx-auto" />
              </button>
            )}
          </div>

          <button
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ContactsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messaging"
              element={
                <ProtectedRoute requiresMessagingAccess={true}>
                  <Layout>
                    <MessagingPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reminders"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RemindersPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SettingsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
