import { GoogleOAuthProvider } from '@react-oauth/google';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AccountPage from './pages/AccountPage.jsx';
import OrderDetailsPage from './pages/OrderDetailsPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import HomePage from './pages/HomePage.jsx';
import StoryPage from './pages/StoryPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CartPage from './pages/CartPage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import PaymentResultPage from './pages/PaymentResultPage.jsx';
import { CommerceProvider } from './context/CommerceContext.jsx';

function AppRoutes() {
  return (
    <AuthProvider>
      <CommerceProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/story" element={<StoryPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<Navigate to="/account" replace />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/orders/:orderId" element={<OrderDetailsPage />} />
          <Route path="/account/orders/:orderId/invoice" element={<OrderDetailsPage invoice />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment-result/:orderId" element={<PaymentResultPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </CommerceProvider>
    </AuthProvider>
  );
}

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const content = <AppRoutes />;
  return clientId ? <GoogleOAuthProvider clientId={clientId}>{content}</GoogleOAuthProvider> : content;
}
