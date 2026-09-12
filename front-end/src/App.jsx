import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import AuthProvider from '@/hooks/AuthProvider';
import ProtectedRoute from '@/routes/ProtectedRoute';
import AdminLayout from '@/layouts/admin/AdminLayout';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import StudentsPage from '@/pages/admin/StudentsPage';
import AttendancePage from '@/pages/admin/AttendancePage';
import RegisterStudentPage from '@/pages/admin/RegisterStudentPage';

const queryClient = new QueryClient();

const theme = createTheme({
  palette: {
    primary: { main: '#0e7490' },
    secondary: { main: '#155e75' },
    background: { default: '#f4f8fb' },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
  shape: { borderRadius: 12 },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/students/register" element={<RegisterStudentPage />} />
                  <Route path="/attendance" element={<AttendancePage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
