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
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      {children}
    </Link>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lock sidebar open on desktop (>= 1024px), closed on mobile
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user, logout, canSendMessages } = useAuth();
  const navigate = useNavigate();

  // Close mobile menu on route change
  const location = useLocation();
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 text-white p-2 rounded-lg">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-gray-900 dark:text-gray-100">Church Contact</h1>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed state: expanded on desktop, overlay on mobile */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-50 w-64 lg:block ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 flex-1">
            {/* Mobile: Show phone icon only */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="bg-primary-600 text-white p-2 rounded-lg">
                <Phone className="w-6 h-6" />
              </div>
            </div>

            {/* Desktop: Show logo + text (always expanded) */}
            <div className="hidden lg:flex items-center gap-3 mb-8">
              <div className="bg-primary-600 text-white p-2 rounded-lg flex-shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">Church Contact</h1>
                <p className="text-xs text-gray-500">Communication System</p>
              </div>
            </div>

            <nav className="space-y-2">
              <NavLink to="/" icon={<LayoutDashboard className="w-5 h-5" />}>
                <span className="font-medium">Dashboard</span>
              </NavLink>
              <NavLink to="/contacts" icon={<Users className="w-5 h-5" />}>
                <span className="font-medium">Contacts</span>
              </NavLink>
              <NavLink to="/messaging" icon={<MessageSquare className="w-5 h-5" />}>
                <span className="font-medium">Messaging</span>
                {!canSendMessages && (
                  <span className="ml-auto">
                    <Shield className="w-4 h-4 text-gray-400" />
                  </span>
                )}
              </NavLink>
              <NavLink to="/reminders" icon={<Calendar className="w-5 h-5" />}>
                <span className="font-medium">Reminders</span>
              </NavLink>
              <NavLink to="/settings" icon={<Settings className="w-5 h-5" />}>
                <span className="font-medium">Settings</span>
              </NavLink>
            </nav>
          </div>

          {/* User Profile Section - Always expanded */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
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
            </div>
          </div>
        </aside>

      {/* Main Content - Fixed margin: 0 on mobile, 256px on desktop */}
      <main
        className="transition-all duration-300 pt-16 lg:pt-0 pb-20 lg:pb-0 lg:ml-64"
      >
        <div className="px-3 py-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="flex items-center justify-around h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              location.pathname === '/' ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link
            to="/contacts"
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              location.pathname === '/contacts' ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs mt-1">Contacts</span>
          </Link>
          <Link
            to="/messaging"
            className={`flex flex-col items-center justify-center flex-1 h-full relative ${
              location.pathname === '/messaging' ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs mt-1">Messages</span>
            {!canSendMessages && (
              <Shield className="w-3 h-3 text-gray-400 absolute top-2 right-2" />
            )}
          </Link>
          <Link
            to="/reminders"
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              location.pathname === '/reminders' ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs mt-1">Reminders</span>
          </Link>
        </div>
      </nav>
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
