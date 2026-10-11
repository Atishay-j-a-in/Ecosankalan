import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Legacy /auth/success callback — the Appwrite flow was removed.
// If a session exists we land on the dashboard, otherwise login.
export default function OAuthSuccessPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    navigate(user ? '/dashboard' : '/login', { replace: true });
  }, [user, navigate]);

  return null;
}
