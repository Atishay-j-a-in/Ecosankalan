import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StatsProvider } from './context/StatsContext';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// ── Pages (only ones that exist in the repo) ──────────────────────
import LoginPage           from './pages/LoginPage';
import RegisterPage        from './pages/RegisterPage';
import OAuthPage           from './pages/OAuthPage';
import OAuthSuccessPage    from './pages/OAuthSuccessPage';
import DashboardPage       from './pages/DashboardPage';
import WasteLogPage        from './pages/WasteLogPage';
import ShopPage            from './pages/ShopPage';
import ShopSearchPage      from './pages/ShopSearchPage';
import CommunityPage       from './pages/CommunityPage';
import ProfilePage         from './pages/ProfilePage';
import ScanResultPage      from './pages/ScanResultPage';
import WasteHistoryPage    from './pages/WasteHistoryPage';
import EventDetailPage     from './pages/EventDetailPage';
import WeeklyChallengesPage   from './pages/WeeklyChallengesPage';
import ProductDetailPage      from './pages/ProductDetailPage';
import VouchersPage           from './pages/VouchersPage';
import AdminDashboardPage     from './pages/AdminDashboardPage';
import PrivacyPolicyPage      from './pages/PrivacyPolicyPage';
import LeaderboardPage        from './pages/LeaderboardPage';
import ReportBinPage          from './pages/ReportBinPage';
import ComingSoonPage         from './pages/ComingSoonPage';

import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// ── Protected route: redirects to /login if not authenticated ────────
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  const { user } = useAuth();
  const { t } = useLanguage();
  return (
    <Routes>
      {/* Public / Auth routes */}
      <Route path="/login"    element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      <Route path="/auth"         element={<OAuthPage />} />
      <Route path="/auth/success" element={<OAuthSuccessPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />

      {/* Public global board — visible to everyone, no login needed */}
      <Route path="/leaderboard" element={<LeaderboardPage />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/waste"     element={<ProtectedRoute><WasteLogPage  /></ProtectedRoute>} />
      <Route path="/shop"        element={<ProtectedRoute><ShopPage        /></ProtectedRoute>} />
      <Route path="/shop/search" element={<ProtectedRoute><ShopSearchPage  /></ProtectedRoute>} />
      <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
      <Route path="/profile"   element={<ProtectedRoute><ProfilePage   /></ProtectedRoute>} />
      <Route path="/scan-result"        element={<ProtectedRoute><ScanResultPage          /></ProtectedRoute>} />
      <Route path="/waste-history"       element={<ProtectedRoute><WasteHistoryPage         /></ProtectedRoute>} />
      <Route path="/event-detail"        element={<ProtectedRoute><EventDetailPage          /></ProtectedRoute>} />
      <Route path="/weekly-challenges"   element={<ProtectedRoute><WeeklyChallengesPage     /></ProtectedRoute>} />
      <Route path="/product-detail"      element={<ProtectedRoute><ProductDetailPage   /></ProtectedRoute>} />
      <Route path="/vouchers"            element={<ProtectedRoute><VouchersPage         /></ProtectedRoute>} />
      <Route path="/report-bin"          element={<ProtectedRoute><ReportBinPage       /></ProtectedRoute>} />
      <Route path="/admin"               element={<ProtectedRoute><AdminDashboardPage     /></ProtectedRoute>} />

      {/* Not yet built — friendly placeholder instead of a dead link */}
      <Route path="/impact"             element={<ProtectedRoute><ComingSoonPage title={t('soon.impactT')} message={t('soon.impactM')} /></ProtectedRoute>} />
      <Route path="/learn"              element={<ProtectedRoute><ComingSoonPage title={t('soon.learnT')} message={t('soon.learnM')} /></ProtectedRoute>} />
      <Route path="/quiz"               element={<ProtectedRoute><ComingSoonPage title={t('soon.quizT')} message={t('soon.quizM')} /></ProtectedRoute>} />
      <Route path="/quiz-result"        element={<ProtectedRoute><ComingSoonPage title={t('soon.quizResultT')} /></ProtectedRoute>} />
      <Route path="/challenge-progress" element={<ProtectedRoute><ComingSoonPage title={t('soon.challengeT')} message={t('soon.challengeM')} /></ProtectedRoute>} />
      <Route path="/analytics" element={<Navigate to="/impact" replace />} />
      <Route path="/otp" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
      <Route path="/verify-phone" element={<Navigate to="/login" replace />} />
      <Route path="/reset-password" element={<Navigate to="/login" replace />} />

      {/* Fallback */}
      <Route path="/"  element={<Navigate to="/leaderboard" replace />} />
      <Route path="*"  element={<Navigate to="/leaderboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com'}>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <StatsProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </StatsProvider>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
