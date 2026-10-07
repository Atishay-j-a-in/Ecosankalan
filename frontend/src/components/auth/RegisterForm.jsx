/**
 * RegisterForm — handles new user registration
 * Used by: RegisterPage.jsx
<<<<<<< HEAD
 * API: registerUser() → verifyOTP() from services/api.js (Month 2)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { registerUser, authGoogle } from '../../services/api';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
=======
 * Auth: raw Appwrite SDK for email signup (account-only, no session)
 *       + OAuth2 token flow for Google (createOAuth2Token → /auth/success)
 *
 * Strict verify-before-use flow:
 *   1. Create account via account.create() — no session is created
 *   2. Dispatch the verification email via a short-lived ephemeral session
 *      (createVerification requires auth; the raw SDK calls below never touch
 *      the React Query auth cache, so AuthContext sees no ghost login)
 *   3. Show "Check your email" screen
 *   4. User clicks link → /verify-email → updateVerification → /login
 *   5. MongoDB profile is created on first login sync (nothing reads it before)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OAuthProvider, Account, ID } from 'appwrite';
import appwriteClient from '../../lib/appwrite';
import OAuthReturnHint, { markOAuthPending } from './OAuthReturnHint';

export default function RegisterForm() {
  const navigate = useNavigate();
>>>>>>> 7e04cc1 (feat: implement OAuth2 token flow for Google sign-in and enhance user feedback)

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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
      setError(err.message || 'Google signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
=======
  const handleGoogleSignup = async () => {
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
      setError(err.message || 'Google signup failed. Please try again.');
      setLoading(false);
    }
  };

  const getFriendlyError = (err) => {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('already') && msg.includes('user'))
      return 'An account with this email already exists. Please sign in.';
    if (msg.includes('password') && msg.includes('too'))
      return 'Password must be at least 8 characters.';
    if (msg.includes('email') && msg.includes('invalid'))
      return 'Please enter a valid email address.';
    return err?.message || 'Registration failed. Please try again.';
>>>>>>> 7e04cc1 (feat: implement OAuth2 token flow for Google sign-in and enhance user feedback)
  };

  const handleChange = (e) => {
    setError('');
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      // ── Call real backend API ────────────────────────────────
      const res = await registerUser({ name: formData.name, email: formData.email, password: formData.password });
      
      // Auto login since OTP is bypassed for CPVS
      if (res.data && res.data.token) {
        login(res.data.user, res.data.token);
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
          onError={() => setError('Google signup failed')}
          useOneTap
        />
=======
        <button
          type="button"
          className="google-btn"
          onClick={handleGoogleSignup}
          disabled={loading}
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
          <label htmlFor="reg-name">Full Name</label>
          <div className="input-wrap">
            <span className="material-symbols-outlined input-icon">person</span>
            <input
              id="reg-name" name="name" type="text"
              placeholder="Vipin Gupta"
              value={formData.name} onChange={handleChange}
              autoComplete="name"
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="reg-email">Email Address</label>
          <div className="input-wrap">
            <span className="material-symbols-outlined input-icon">mail</span>
            <input
              id="reg-email" name="email" type="email"
              placeholder="name@impact.com"
              value={formData.email} onChange={handleChange}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="reg-password">Password</label>
          <div className="input-wrap">
            <span className="material-symbols-outlined input-icon">lock</span>
            <input
              id="reg-password" name="password" type="password"
              placeholder="Min. 6 characters"
              value={formData.password} onChange={handleChange}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="reg-confirm">Confirm Password</label>
          <div className="input-wrap">
            <span className="material-symbols-outlined input-icon">lock_reset</span>
            <input
              id="reg-confirm" name="confirmPassword" type="password"
              placeholder="Re-enter password"
              value={formData.confirmPassword} onChange={handleChange}
              autoComplete="new-password"
            />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading
            ? <span className="spinner" />
            : <> Create Account <span className="material-symbols-outlined">arrow_forward</span> </>
          }
        </button>
      </form>
    </div>
  );
}
