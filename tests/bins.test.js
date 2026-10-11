process.env.NODE_ENV = 'test';
process.env.APPWRITE_ENDPOINT = 'https://test.cloud.appwrite.io/v1';
process.env.APPWRITE_PROJECT_ID = 'test-project';
process.env.APPWRITE_API_KEY = 'test-api-key';

const request = require('supertest');
const app = require('../src/app');
const Bin = require('../src/models/Bin');
const User = require('../src/models/User');

jest.mock('node-appwrite');

jest.mock('../src/models/Bin', () => ({
  find: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

describe('Bins API', () => {
  const userId = '507f1f77bcf86cd799439011';
  const adminId = '507f1f77bcf86cd799439012';
  const userToken = 'test-user-token';
  const adminToken = 'test-admin-token';

  beforeEach(() => {
    jest.clearAllMocks();
    // findOne is called by protect's findOrCreateMongoUser — match on appwriteUserId OR email
    User.findOne.mockImplementation((query) => {
      if (query.appwriteUserId === 'appwrite-admin-123' || query.email === 'admin@example.com') {
        return Promise.resolve({ _id: adminId, role: 'admin', email: 'admin@example.com' });
      }
      return Promise.resolve({ _id: userId, role: 'user', email: 'test@example.com' });
    });
  });

  test('POST /bins rejects non-admin', async () => {
    const res = await request(app)
      .post('/api/v1/bins')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.statusCode).toBe(403);
  });

  test('POST /bins creates for admin', async () => {
    const created = { _id: 'bin1', name: 'Gate Bin' };
    Bin.create.mockResolvedValue(created);

    const res = await request(app)
      .post('/api/v1/bins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Gate Bin',
        address: 'NSUT Gate 1',
        location: { coordinates: [77.03, 28.61] },
        types: ['plastic'],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(created);
  });

  test('GET /bins rejects out-of-range coordinates', async () => {
    const res = await request(app).get('/api/v1/bins?lat=200&lng=77.03');

    expect(res.statusCode).toBe(400);
  });

  test('GET /bins returns nearest-first with distanceMetres', async () => {
    const lean = jest.fn().mockResolvedValue([
      { _id: 'near', location: { coordinates: [77.0301, 28.6101] } },
      { _id: 'far', location: { coordinates: [77.04, 28.62] } },
    ]);
    Bin.find.mockReturnValue({ lean });

    const res = await request(app).get('/api/v1/bins?lat=28.61&lng=77.03&radius=10000');

    expect(res.statusCode).toBe(200);
    expect(res.body[0]).toHaveProperty('distanceMetres');
    expect(Bin.find).toHaveBeenCalledWith(expect.objectContaining({
      location: expect.objectContaining({ $near: expect.any(Object) }),
    }));
  });
});
