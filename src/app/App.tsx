import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Auth } from '../components/Auth';
import { Dashboard } from '../components/Dashboard';
import { ProjectCreation } from '../components/ProjectCreation';
import { EditProject } from '../components/EditProject';
import { CityViewer } from '../components/CityViewer';
import { useAuthStore } from '../store/authStore';
import { useDarkMode } from '../hooks/useDarkMode';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center transition-colors">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  return session ? <>{children}</> : <Navigate to="/auth" />;
}

function App() {
  // Initialize dark mode
  useDarkMode();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/create"
          element={
            <PrivateRoute>
              <ProjectCreation />
            </PrivateRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <PrivateRoute>
              <EditProject />
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:id"
          element={
            <PrivateRoute>
              <CityViewer />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;