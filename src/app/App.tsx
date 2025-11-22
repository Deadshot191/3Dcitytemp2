import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Auth } from '../components/Auth';
import { Dashboard } from '../components/Dashboard';
import { ProjectCreation } from '../components/ProjectCreation';
import { EditProject } from '../components/EditProject';
import { CityViewer } from '../components/CityViewer';
import { useAuthStore } from '../store/authStore';
import { useDarkMode } from '../hooks/useDarkMode';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuthStore();
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