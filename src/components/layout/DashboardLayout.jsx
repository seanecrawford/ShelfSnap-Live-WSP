
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();

  const currentUser = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0],
    email: user?.email,
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentUser={currentUser} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 transition-all duration-300 lg:ml-64">
        <Header currentUser={currentUser} onSignOut={signOut} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-8">
          <div className="w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
