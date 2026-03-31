import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Upload from './pages/Upload.jsx';
import Badge from './pages/Badge.jsx';

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'unauth'

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => setStatus(res.ok ? 'ok' : 'unauth'))
      .catch(() => setStatus('unauth'));
  }, []);

  if (status === 'checking') return null; // or a spinner
  if (status === 'unauth') return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/event/:id/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/badge/:token" element={<Badge />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
