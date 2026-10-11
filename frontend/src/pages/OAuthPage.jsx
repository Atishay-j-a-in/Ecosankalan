import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Legacy /auth route — Google sign-in now happens inline on the
// login/register screens via the backend (/api/v1/auth/google).
export default function OAuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    navigate(user ? '/dashboard' : '/login', { replace: true });
  }, [user, navigate]);

  return null;
}
