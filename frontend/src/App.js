import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import '@/App.css';
import { Toaster } from '@/components/ui/sonner';

// Pages
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import CustomerDashboard from '@/pages/CustomerDashboard';
import RetailerDashboard from '@/pages/RetailerDashboard';
import WholesalerDashboard from '@/pages/WholesalerDashboard';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrdersPage from '@/pages/OrdersPage';
import OrderDetailPage from '@/pages/OrderDetailPage';

// ⭐ ADD THIS
import RetailerbuyingPage from "@/pages/RetailerbuyingPage";


const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />

      {/* Customer Routes */}
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Retailer Routes */}
      <Route
        path="/retailer/dashboard"
        element={
          <ProtectedRoute allowedRoles={['retailer']}>
            <RetailerDashboard />
          </ProtectedRoute>
        }
      />

      {/* ⭐ NEW RETAILER BUY ROUTE */}
      <Route
        path="/retailer/buy"
        element={
          <ProtectedRoute allowedRoles={['retailer']}>
            <RetailerbuyingPage />
          </ProtectedRoute>
        }
      />

      {/* Wholesaler Routes */}
      <Route
        path="/wholesaler/dashboard"
        element={
          <ProtectedRoute allowedRoles={['wholesaler']}>
            <WholesalerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Shared Routes */}
      <Route
        path="/product/:id"
        element={
          <ProtectedRoute>
            <ProductDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cart"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CartPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkout"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/order/:id"
        element={
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <AppRoutes />
          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
