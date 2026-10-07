/**
 * LoginForm — handles email/password login
 * Used by: LoginPage.jsx
<<<<<<< HEAD
 * API: loginUser() from services/api.js (mock in Month 1, real in Month 2)
=======
 * Auth: Appwrite useSignIn() hook (email) + OAuth2 token flow (Google)
 *
 * Strict verify-before-use: email logins check the emailVerification flag
 * and bounce unverified users back out. Google OAuth is exempt
 * (provider-verified emails) and follows the token flow:
 * createOAuth2Token → /auth/success → createSession → /dashboard.
>>>>>>> 7e04cc1 (feat: implement OAuth2 token flow for Google sign-in and enhance user feedback)
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
<<<<<<< HEAD
import { useGoogleLogin, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { loginUser, authGoogle } from '../../services/api';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
=======
import { useSignIn } from '@appwrite.io/react';
import { OAuthProvider, Account } from 'appwrite';
import appwriteClient from '../../lib/appwrite';
import OAuthReturnHint, { markOAuthPending } from './OAuthReturnHint';

export default function LoginForm() {
  const navigate = useNavigate();
  const { emailPassword, isPending } = useSignIn();
>>>>>>> 7e04cc1 (feat: implement OAuth2 token flow for Google sign-in and enhance user feedback)

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

<<<<<<< HEAD
  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      const res = await authGoogle({ token: tokenResponse.credential });
      if (res.data && res.data.token) {
        login(res.data.user, res.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Google login failed. Please try again.');
    } finally {
=======
  const handleEmailAuthSuccess = useCallback(async () => {
    // Strict gate: block unverified emails regardless of the Console's
    // "require verification" toggle.
    try {
      const account = new Account(appwriteClient);
      const me = await account.get();
      if (me && me.emailVerification === false) {
        try {
          await account.deleteSession('current');
        } catch {
          // Ignore — session cleanup is best-effort
        }
        setError('Please verify your email before signing in. Check your inbox for the verification link.');
        setLoading(false);
        return;
      }
    } catch {
      // If the check itself fails, fall through — AuthContext and
      // ProtectedRoute will handle invalid sessions.
    }
    navigate('/dashboard');
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    markOAuthPending();
    try {
      // Token flow: navigates the browser to Google; do not redirect manually.
      // Google → Appwrite → /auth/success (createSession) → /dashboard.
      const account = new Account(appwriteClient);
      await account.createOAuth2Token({
        provider: OAuthProvider.Google,
        success: `${window.location.origin}/auth/success`,
        failure: `${window.location.origin}/auth/failure`,
      });
    } catch (err) {
      setError(err.message || 'Google login failed. Please try again.');
>>>>>>> 7e04cc1 (feat: implement OAuth2 token flow for Google sign-in and enhance user feedback)
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setError('');
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      // ── Call real backend API ────────────────────────────────
      const res = await loginUser(formData);
      
      // Using Context login method (which sets localStorage and state)
      if (res.data && res.data.token) {
        login(res.data.user, res.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-wrapper">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
<<<<<<< HEAD
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google login failed')}
          useOneTap
        />
=======
        <button
          type="button"
          className="google-btn"
          onClick={handleGoogleLogin}
          disabled={loading || isPending}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.2rem', border: '1px solid #ddd', borderRadius: '8px',
            background: '#fff', cursor: loading ? 'wait' : 'pointer',
            fontSize: '0.95rem', fontWeight: 500,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
>>>>>>> 7e04cc1 (feat: implement OAuth2 token flow for Google sign-in and enhance user feedback)
      </div>

      <div className="divider">
        <div className="divider-line" />
        <span className="divider-text">Or with email</span>
        <div className="divider-line" />
      </div>

      {error && <div className="error-banner">{error}</div>}
      <OAuthReturnHint />

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="email">Email Address</label>
          <div className="input-wrap">
            <span className="material-symbols-outlined input-icon">mail</span>
            <input
              id="email" name="email" type="email"
              placeholder="name@impact.com"
              value={formData.email} onChange={handleChange}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="field-group">
          <div className="label-row">
            <label htmlFor="password">Password</label>
            <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); navigate('/forgot-password'); }}>Forgot?</a>
          </div>
          <div className="input-wrap">
            <span className="material-symbols-outlined input-icon">lock</span>
            <input
              id="password" name="password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password} onChange={handleChange}
              autoComplete="current-password"
            />
            <button
              type="button" className="toggle-pass"
              onClick={() => setShowPass(p => !p)}
              aria-label="Toggle password visibility"
            >
              <span className="material-symbols-outlined">
                {showPass ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className="remember-row">
          <input
            id="remember" type="checkbox"
            checked={remember} onChange={e => setRemember(e.target.checked)}
          />
          <label htmlFor="remember">Remember for 30 days</label>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading
            ? <span className="spinner" />
            : <> Sign In <span className="material-symbols-outlined">arrow_forward</span> </>
          }
        </button>
      </form>
    </div>
  );
}
