
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import LoginPage from '@/pages/LoginPage';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardPage from '@/pages/DashboardPage';
import WorkSuitePage from '@/pages/WorkSuitePage';
import BoardroomPage from '@/pages/BoardroomPage';
import ShelfSnapPage from '@/pages/ShelfSnapPage';
import SettingsPage from '@/pages/SettingsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import FinancePage from '@/pages/FinancePage';
import { Toaster } from '@/components/ui/toaster';

function App() {
  const { session, loading } = useAuth();

  const PlaceholderPage = ({ title }) => (
    <div className="text-center py-16 text-slate-400">
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p>This page is under construction. 🚧</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {!session ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            
            {/* Operations */}
            <Route path="project-management" element={<WorkSuitePage />} />
            <Route path="task-board" element={<PlaceholderPage title="Task Board"/>} />
            <Route path="scheduling" element={<PlaceholderPage title="Scheduling"/>} />
            <Route path="resource-overview" element={<PlaceholderPage title="Resource Overview"/>} />
            <Route path="project/:projectId" element={<ProjectDetailPage />} />

            {/* Business Suite */}
            <Route path="analytics" element={<PlaceholderPage title="Analytics & Reporting"/>} />
            <Route path="finance-hub" element={<FinancePage />} />
            <Route path="team-management" element={<PlaceholderPage title="Team Management"/>} />
            <Route path="human-resources" element={<PlaceholderPage title="Human Resources"/>} />
            
            {/* Company Tools */}
            <Route path="communication-hub" element={<PlaceholderPage title="Communication Hub"/>} />
            <Route path="work-suite-academy" element={<PlaceholderPage title="Work Suite Academy"/>} />

            {/* Modules */}
            <Route path="boardroom" element={<BoardroomPage />} />
            <Route path="shelfsnap" element={<ShelfSnapPage />} />
            
            {/* System */}
            <Route path="crm" element={<PlaceholderPage title="CRM"/>} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        )}
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
