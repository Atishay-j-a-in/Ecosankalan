/**
 * frontend/src/services/api.js
 * Central Axios instance + all API call functions.
 *
 * Authentication is handled by Appwrite:
 *   - On each request, an Appwrite JWT is created via account.createJWT()
 *   - The JWT is attached as a Bearer token
 *   - The backend verifies the JWT via node-appwrite
 *
 * Base URL is set by VITE_API_URL env var (defaults to localhost:5000 in dev).
 */

import axios from 'axios';
import { Account } from 'appwrite';
import appwriteClient from '../lib/appwrite';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : ''),
  timeout: 20000,
});

// ── Auto-attach Appwrite JWT to every request ────────────────────────────────
// Uses the shared Appwrite client from lib/appwrite.js which is configured
// with the same endpoint/projectId as the AppwriteProvider. Sessions created
// by useSignIn/useSignUp are stored in localStorage and accessible here.
api.interceptors.request.use(async (config) => {
  try {
    const account = new Account(appwriteClient);
    const jwtResponse = await account.createJWT();
    config.headers.Authorization = `Bearer ${jwtResponse.jwt}`;
  } catch (err) {
    // Expected when logged out (401 from /sessions/token): the request
    // simply goes without auth. Warn only for unexpected failures.
    const status = err?.response?.status ?? err?.code;
    if (import.meta.env.DEV && status !== 401) {
      console.warn('[api] createJWT failed:', err?.message || err);
    }
  }
  return config;
});

// ── Response error interceptor: strip axios wrapper for consistency ──────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Never wrap cancellations — callers detect AbortController/cancel
    // via err.name / axios.isCancel. Wrapping them breaks that detection
    // and surfaces phantom "Fetch error: canceled" logs.
    if (
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError' ||
      axios.isCancel?.(error)
    ) {
      return Promise.reject(error);
    }
    const status = error?.response?.status;
    // Expired/revoked Appwrite JWT: drop cached profile so ProtectedRoute redirects.
    if (status === 401) {
      localStorage.removeItem('user');
    }
    // Re-throw with a clean error message but keep the status for callers.
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Network error. Please check your connection.';
    const clean = new Error(msg);
    clean.status = status;
    clean.data = error?.response?.data;
    return Promise.reject(clean);
  }
);

// ════════════════════════════════════════════════════════════════════════════
// AUTH — Appwrite integration
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /auth/sync
 * Called after Appwrite authentication to sync with MongoDB.
 * Returns the MongoDB user profile.
 */
export const syncUser = () => api.post('/api/v1/auth/sync');

/**
 * GET /auth/me
 * Returns the current authenticated user's MongoDB profile.
 */
export const getMe = () => api.get('/api/v1/auth/me');

// ════════════════════════════════════════════════════════════════════════════
// USER PROFILE
// ════════════════════════════════════════════════════════════════════════════
export const getProfile    = ()     => api.get('/api/v1/users/profile');
export const updateProfile = (data) => api.put('/api/v1/users/profile', data);

// ════════════════════════════════════════════════════════════════════════════
// WASTE  (FR-03, FR-04, FR-05 + M3 carryover FR stats)
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /waste/log
 * Body: { category, quantity, unit?, description?, logMethod? }
 * Returns: { success, log, pointsEarned, co2Saved }
 */
export const logWaste = (data) => api.post('/api/v1/waste/log', data);

/**
 * GET /waste/history?category=&page=&limit=
 * Returns: { logs: [], pagination: { page, limit, total, pages } }
 */
export const getWasteHistory = (params = {}) =>
  api.get('/api/v1/waste/history', { params });

/**
 * GET /waste/stats?range=week|month|all
 * Returns: { totalKg, totalCo2Saved, totalPointsEarned, categoryBreakdown, weeklyTrend }
 */
export const getWasteStats = (range = 'week') =>
  api.get('/api/v1/waste/stats', { params: { range } });

/**
 * POST /waste/scan  (AI image scan)
 * Body: FormData with key "images" (file upload)
 * Returns: { success, model, usage, parsed: { label, category, material, confidence, steps } }
 */
export const scanWasteImage = (formData, config = {}) =>
  api.post('/api/v1/waste/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  });

// ════════════════════════════════════════════════════════════════════════════
// BINS  (FR-11, FR-12)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /bins?lat=&lng=&radius=
 * Returns sorted array of bins nearest-first with distanceMetres field
 */
export const getNearbyBins = ({ lat, lng, radius = 5000 }) =>
  api.get('/api/v1/bins', { params: { lat, lng, radius } });

/**
 * POST /bins  (Admin only)
 * Body: { name, address, location: { type, coordinates }, types[], capacityStatus }
 */
export const createBin = (data) => api.post('/api/v1/bins', data);

// ════════════════════════════════════════════════════════════════════════════
// MAP MARKERS  (from DB — no direct OSM calls)
// ════════════════════════════════════════════════════════════════════════════

export const getMapMarkers = (bounds, config = {}) =>
  api.get('/api/v1/markers', { params: bounds, ...config });

// ════════════════════════════════════════════════════════════════════════════
// EVENTS  (FR-13, FR-14)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /events/upcoming
 * Returns events sorted chronologically, cancelled excluded
 */
export const getUpcomingEvents = () => api.get('/api/v1/events/upcoming');

/**
 * POST /events  (Admin / NGO only)
 * Body: { title, description, address, location, eventDate, organiser, bonusPoints }
 */
export const createEvent = (data) => api.post('/api/v1/events', data);

/**
 * POST /events/:id/rsvp
 * Returns: { success, message, pointsAwarded }
 * 409 if already RSVP'd
 */
export const rsvpEvent = (eventId) => api.post(`/api/v1/events/${eventId}/rsvp`);

// ════════════════════════════════════════════════════════════════════════════
// CHALLENGES  (FR-21, FR-22, FR-23)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /challenges/active
 * Returns this week's challenges with per-user progress and deadline (Sunday 23:59 IST)
 */
export const getActiveChallenges = () => api.get('/api/v1/challenges/active');

/**
 * POST /challenges/:id/progress
 * Body: { action, category?, count? }
 * Returns: { progress, reward }
 */
export const updateChallengeProgress = (challengeId, data) =>
  api.post(`/api/v1/challenges/${challengeId}/progress`, data);

/**
 * GET /challenges/history
 * Returns last 8 weeks of challenge history for the authenticated user
 */
export const getChallengeHistory = () => api.get('/api/v1/challenges/history');

// ════════════════════════════════════════════════════════════════════════════
// CHALLENGES — ADMIN (create / edit / deactivate + full list)
// ════════════════════════════════════════════════════════════════════════════

/** GET /challenges/admin — all challenges, newest week first (admin only) */
export const getAdminChallenges = () => api.get('/api/v1/challenges/admin');

/**
 * POST /challenges (admin only)
 * Body: { title, description, tasks: [{ action, targetCount, category? }],
 *         rewardPoints?, rewardVoucherPartner?, weekStartDate? }
 */
export const createChallenge = (data) => api.post('/api/v1/challenges', data);

/** PUT /challenges/:id (admin only) — partial update */
export const updateChallenge = (id, data) => api.put(`/api/v1/challenges/${id}`, data);

/** DELETE /challenges/:id (admin only) — soft-deactivates (isActive=false) */
export const deleteChallenge = (id) => api.delete(`/api/v1/challenges/${id}`);

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS / ECO-SHOP  (FR-16, FR-17)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /products?category=
 * Returns active partner products, optionally filtered by category
 */
export const getProducts = (category) =>
  api.get('/api/v1/products', { params: category ? { category } : {} });

/**
 * GET /products/:id
 * Returns a single product
 */
export const getProductById = (id) => api.get(`/api/v1/products/${id}`);

/**
 * GET /products/:id/redirect  (returns 302, open in new tab from JS)
 * We build the URL here and open it — no axios needed for a redirect
 */
export const getProductRedirectUrl = (id) => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${base}/api/v1/products/${id}/redirect`;
};

// ════════════════════════════════════════════════════════════════════════════
// VOUCHERS  (FR-18, FR-19)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /vouchers/my
 * Returns all vouchers assigned to the authenticated user (active first)
 */
export const getMyVouchers = () => api.get('/api/v1/vouchers/my');

/**
 * POST /vouchers/unlock
 * Body: { partnerName }
 * Returns the newly assigned voucher, or 409 if none available / 400 if insufficient points
 */
export const unlockVoucher = (partnerName) =>
  api.post('/api/v1/vouchers/unlock', { partnerName });

// ════════════════════════════════════════════════════════════════════════════
// ADMIN  (FR-20, FR-25)
// ════════════════════════════════════════════════════════════════════════════

/** GET /admin/stats — platform-wide aggregated stats */
export const getAdminStats = () => api.get('/api/v1/admin/stats');

/** GET /admin/vouchers/stats — per-partner issued/assigned/remaining */
export const getAdminVoucherStats = () => api.get('/api/v1/admin/vouchers/stats');

/** POST /admin/vouchers — bulk import voucher array */
export const bulkImportVouchers = (vouchers) =>
  api.post('/api/v1/admin/vouchers', vouchers);

// ════════════════════════════════════════════════════════════════════════════
// AI SCAN  (direct to /api/v1/ai/analyze — alternate endpoint)
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /ai/analyze
 * Same as /waste/scan — upload images via multipart/form-data key "images"
 */
export const analyzeWasteAI = (formData) =>
  api.post('/api/v1/ai/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ════════════════════════════════════════════════════════════════════════════
// AVATAR
// ════════════════════════════════════════════════════════════════════════════

/**
 * PUT /users/profile/avatar
 * Body: FormData with key "avatar" (single image)
 */
export const uploadAvatar = (formData) =>
  api.put('/api/v1/users/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ════════════════════════════════════════════════════════════════════════════
// LEADERBOARD  (public — no login required)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /leaderboard?limit=
 * Returns { platform, leaders, features }. Public — no login required
 * (the auth interceptor only attaches a token when one is stored).
 */
export const getLeaderboard = (limit = 20) =>
  api.get('/api/v1/leaderboard', { params: { limit } });

// ════════════════════════════════════════════════════════════════════════════
// BIN REPORTS  (citizen reports with mandatory photo + live location)
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /bins/report
 * Body: FormData { photo (file, required), name, address, types, lat, lng, description }
 */
export const reportBin = (formData) =>
  api.post('/api/v1/bins/report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

/** GET /bins/report/mine — my own bin reports */
export const getMyBinReports = () => api.get('/api/v1/bins/report/mine');

/** GET /bins/requests?status= — admin review queue */
export const getBinRequests = (status = 'pending') =>
  api.get('/api/v1/bins/requests', { params: { status } });

/** POST /bins/requests/:id/approve — admin approves (creates the Bin) */
export const approveBinRequest = (id, note) =>
  api.post(`/api/v1/bins/requests/${id}/approve`, note ? { note } : {});

/** POST /bins/requests/:id/reject — admin rejects with optional reason */
export const rejectBinRequest = (id, reason) =>
  api.post(`/api/v1/bins/requests/${id}/reject`, reason ? { reason } : {});

// Default export for direct api instance usage
export default api;
