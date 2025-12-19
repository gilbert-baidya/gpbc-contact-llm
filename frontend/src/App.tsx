import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Users, MessageSquare, Calendar, Phone, Menu } from 'lucide-react';

import { DashboardPage } from './pages/DashboardPage';
import { ContactsPage } from './pages/ContactsPage';
import { MessagingPage } from './pages/MessagingPage';
import { RemindersPage } from './pages/RemindersPage';

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-4">
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
            </NavLink>
            <NavLink to="/reminders" icon={<Calendar className="w-5 h-5" />}>
              {sidebarOpen && 'Reminders'}
            </NavLink>
          </nav>
        </div>

        <button
          className="absolute bottom-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
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
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/messaging" element={<MessagingPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
