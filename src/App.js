import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { createAppTheme } from './theme';
import { ThemeContextProvider, useThemeContext } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SnackbarProvider } from './context/SnackbarContext';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DealersPage from './pages/DealersPage';
import CategoriesPage from './pages/CategoriesPage';
import ProductsPage from './pages/ProductsPage';
import QRStickerPage from './pages/QRStickerPage';
import BillingPage from './pages/BillingPage';
import SalesReportPage from './pages/SalesReportPage';
import ProductReportPage from './pages/ProductReportPage';
import ReturnReportPage from './pages/ReturnReportPage';
import RestockReportPage from './pages/RestockReportPage';
import LowStockPage from './pages/LowStockPage';
import StockCostReportPage from './pages/StockCostReportPage';
import StockTransferPage from './pages/StockTransferPage';

const AppRoutes = () => {
  const { loading } = useAuth();
  if (loading) return <SplashScreen />;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dealers" element={<DealersPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="qr-stickers" element={<QRStickerPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="sales-report" element={<SalesReportPage />} />
          <Route path="product-report" element={<ProductReportPage />} />
          <Route path="return-report" element={<ReturnReportPage />} />
          <Route path="low-stock" element={<LowStockPage />} />
          <Route path="restock-report" element={<RestockReportPage />} />
          <Route path="stock-transfer" element={<StockTransferPage />} />
          <Route path="stock-cost-report" element={<ProtectedRoute roles={['admin']}><StockCostReportPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

function ThemedApp() {
  const { activeTheme } = useThemeContext();
  const muiTheme = createAppTheme(activeTheme);
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AuthProvider>
        <SnackbarProvider>
          <AppRoutes />
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeContextProvider>
      <ThemedApp />
    </ThemeContextProvider>
  );
}

export default App;
