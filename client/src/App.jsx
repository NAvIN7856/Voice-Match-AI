import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Home from './pages/Home';
import Compare from './pages/Compare';
import Analysis from './pages/Analysis';
import Clustering from './pages/Clustering';
import History from './pages/History';
import Login from './pages/Login';
import Share from './pages/Share';

// Initialize TanStack query client
const queryClient = new QueryClient();

export default function App() {
  // Read authenticated user state on startup
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/compare" element={<Compare user={user} />} />
            <Route path="/analysis" element={<Analysis user={user} />} />
            <Route path="/clustering" element={<Clustering />} />
            <Route 
              path="/history" 
              element={user ? <History /> : <Navigate to="/login" replace />} 
            />
            <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
            <Route path="/share/:id" element={<Share />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}
