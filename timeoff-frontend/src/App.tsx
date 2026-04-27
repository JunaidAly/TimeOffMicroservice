import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { HcmAdminPage } from './pages/HcmAdminPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children, managerOnly = false }: { children: JSX.Element; managerOnly?: boolean }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (managerOnly && currentUser.role !== 'MANAGER') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to={currentUser.role === 'MANAGER' ? '/manager' : '/dashboard'} replace /> : <LoginPage />}
      />
      <Route
        path="/dashboard"
        element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>}
      />
      <Route
        path="/manager"
        element={<ProtectedRoute managerOnly><ManagerDashboard /></ProtectedRoute>}
      />
      <Route
        path="/hcm-admin"
        element={<ProtectedRoute managerOnly><HcmAdminPage /></ProtectedRoute>}
      />
      <Route
        path="/settings"
        element={<ProtectedRoute><SettingsPage /></ProtectedRoute>}
      />
      <Route
        path="*"
        element={<Navigate to={currentUser ? (currentUser.role === 'MANAGER' ? '/manager' : '/dashboard') : '/login'} replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
