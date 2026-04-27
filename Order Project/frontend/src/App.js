import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Delivery from './pages/Delivery';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Transactions from './pages/Transactions';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

// Protected route component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Delivery Agent Routes */}
        <Route 
          path="/delivery" 
          element={
            <ProtectedRoute allowedRoles={['delivery_agent', 'admin']}>
              <Delivery />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute allowedRoles={['delivery_agent', 'admin']}>
              <Profile />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/customers" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Customers />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/transactions" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Transactions />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/payments" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Payments />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Settings />
            </ProtectedRoute>
          } 
        />
        
        {/* Default redirect */}
        <Route 
          path="/" 
          element={
            <Navigate 
              to={localStorage.getItem('token') ? 
                (JSON.parse(localStorage.getItem('user'))?.role === 'admin' ? '/dashboard' : '/delivery') 
                : '/login'} 
              replace 
            />
          } 
        />
        
        {/* Catch all */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-8">Page not found</p>
                <button 
                  onClick={() => window.history.back()}
                  className="btn btn-primary"
                >
                  Go Back
                </button>
              </div>
            </div>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
