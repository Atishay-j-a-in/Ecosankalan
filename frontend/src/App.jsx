import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppwriteProvider } from '@appwrite.io/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StatsProvider } from './context/StatsContext';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// ── Pages (only ones that exist in the repo) ──────────────────────
import LandingPage         from './pages/LandingPage';
import LoginPage           from './pages/LoginPage';
import RegisterPage        from './pages/RegisterPage';
import OAuthPage           from './pages/OAuthPage';
import OAuthSuccessPage    from './pages/OAuthSuccessPage';
import OAuthFailurePage    from './pages/OAuthFailurePage';
import OTPPage             from './pages/OTPPage';
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
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

// ── Admin route: requires role admin (backend enforces it too) ────────
const AdminRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

// ── Root: landing page for visitors, dashboard for signed-in users ────
// Waits for auth to settle first — otherwise a valid session flashes
// the landing page (or bounced to /leaderboard) before sync finishes.
const RootRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <LandingPage />;
};

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const authGate = (page) => {
    if (isLoading) return null;
    return user ? <Navigate to="/dashboard" replace /> : page;
  };
  return (
    <Routes>
      {/* Landing — session-aware root */}
      <Route path="/" element={<RootRoute />} />

      {/* Public / Auth routes */}
      <Route path="/login"    element={authGate(<LoginPage />)} />
      <Route path="/register" element={authGate(<RegisterPage />)} />
      <Route path="/auth"         element={<OAuthPage />} />
      <Route path="/auth/success" element={<OAuthSuccessPage />} />
      <Route path="/auth/failure" element={<OAuthFailurePage />} />
      <Route path="/verify-email" element={<OTPPage />} />
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
      <Route path="/admin"               element={<AdminRoute><AdminDashboardPage     /></AdminRoute>} />

      {/* Not yet built — friendly placeholder instead of a dead link */}
      <Route path="/impact"             element={<ProtectedRoute><ComingSoonPage title={t('soon.impactT')} message={t('soon.impactM')} /></ProtectedRoute>} />
      <Route path="/learn"              element={<ProtectedRoute><ComingSoonPage title={t('soon.learnT')} message={t('soon.learnM')} /></ProtectedRoute>} />
      <Route path="/quiz"               element={<ProtectedRoute><ComingSoonPage title={t('soon.quizT')} message={t('soon.quizM')} /></ProtectedRoute>} />
      <Route path="/quiz-result"        element={<ProtectedRoute><ComingSoonPage title={t('soon.quizResultT')} /></ProtectedRoute>} />
      <Route path="/challenge-progress" element={<ProtectedRoute><ComingSoonPage title={t('soon.challengeT')} message={t('soon.challengeM')} /></ProtectedRoute>} />
      <Route path="/analytics" element={<Navigate to="/impact" replace />} />
      <Route path="/otp" element={<Navigate to="/verify-email" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
      <Route path="/verify-phone" element={<Navigate to="/login" replace />} />
      <Route path="/reset-password" element={<Navigate to="/login" replace />} />

      {/* Fallback — unknown URLs follow the same session-aware root */}
      <Route path="*"  element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppwriteProvider
          endpoint={import.meta.env.VITE_APPWRITE_ENDPOINT}
          projectId={import.meta.env.VITE_APPWRITE_PROJECT_ID}
        >
          <LanguageProvider>
            <AuthProvider>
              <StatsProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </StatsProvider>
            </AuthProvider>
          </LanguageProvider>
        </AppwriteProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
