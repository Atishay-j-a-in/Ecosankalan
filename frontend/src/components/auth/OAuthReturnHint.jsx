/**
 * OAuthReturnHint — placeholder shown after Google OAuth redirects.
 * The Appwrite-based flow was removed; Google sign-in now goes through
 * the backend (/api/v1/auth/google), so there is nothing to diagnose here.
 * Kept as a null-rendering stub so existing imports keep working.
 */

export const markOAuthPending = () => {
  // no-op: retained for backwards compatibility
};

export default function OAuthReturnHint() {
  return null;
}
