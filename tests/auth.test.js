process.env.NODE_ENV = 'test';
process.env.APPWRITE_ENDPOINT = 'https://test.cloud.appwrite.io/v1';
process.env.APPWRITE_PROJECT_ID = 'test-project';
process.env.APPWRITE_API_KEY = 'test-api-key';

// ── Mocks MUST come before app require ──────────────────────────────────────

// Token-aware Appwrite mock (see __mocks__/node-appwrite.js).
jest.mock('node-appwrite');

// Mock User model
jest.mock('../src/models/User');

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Auth Routes (Appwrite)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // protect's findOrCreateMongoUser finds by appwriteUserId on first call.
    User.findOne.mockResolvedValue({
      _id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
    });
    // Default: findById returns null (overridden per test)
    User.findById.mockResolvedValue(null);
  });

  describe('POST /api/v1/auth/sync', () => {
    it('should return existing user when found by appwriteUserId', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        appwriteUserId: 'appwrite-user-123',
      };
      // protect's findOrCreateMongoUser finds by appwriteUserId
      User.findOne.mockResolvedValue(mockUser);
      // Route handler's findById returns the same user
      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/v1/auth/sync')
        .set('Authorization', 'Bearer any-token');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should link existing email user to Appwrite', async () => {
      const existingUser = {
        _id: 'user456',
        name: 'Existing User',
        email: 'test@example.com',
        role: 'user',
        save: jest.fn().mockResolvedValue(true),
      };

      // protect's findOrCreateMongoUser: first findOne by appwriteUserId → null, then by email → found
      User.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser);
      // Route handler's User.findById returns the linked user
      User.findById.mockResolvedValue(existingUser);

      const res = await request(app)
        .post('/api/v1/auth/sync')
        .set('Authorization', 'Bearer any-token');

      expect(res.statusCode).toBe(200);
      expect(existingUser.appwriteUserId).toBe('appwrite-user-123');
      expect(existingUser.save).toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
      const newUser = {
        _id: 'user789',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };

      // protect's findOrCreateMongoUser: both findOne calls return null → creates new user
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(newUser);
      // Route handler's User.findById returns the newly created user
      User.findById.mockResolvedValue(newUser);

      const res = await request(app)
        .post('/api/v1/auth/sync')
        .set('Authorization', 'Bearer any-token');

      expect(res.statusCode).toBe(200);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          appwriteUserId: 'appwrite-user-123',
          email: 'test@example.com',
          name: 'Test User',
        })
      );
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/sync');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };
      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer any-token');

      expect(res.statusCode).toBe(200);
      expect(res.body.user.name).toBe('Test User');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 if MongoDB user not found', async () => {
      User.findById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer any-token');

      expect(res.statusCode).toBe(404);
    });
  });

  describe('User Profile Routes (via Appwrite protect)', () => {
    const token = 'test-user-token';

    it('GET /api/v1/users/profile - should return profile', async () => {
      User.findById.mockResolvedValue({ _id: 'user123', name: 'Test User' });

      const res = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Test User');
    });

    it('PUT /api/v1/users/profile - should update profile', async () => {
      User.findByIdAndUpdate.mockResolvedValue({ _id: 'user123', name: 'New Name' });

      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('New Name');
    });

    it('PUT /api/v1/users/profile - should block email updates', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@example.com' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/not updatable/);
    });
  });
});
