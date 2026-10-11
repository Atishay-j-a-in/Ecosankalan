process.env.NODE_ENV = 'test';
process.env.APPWRITE_ENDPOINT = 'https://test.cloud.appwrite.io/v1';
process.env.APPWRITE_PROJECT_ID = 'test-project';
process.env.APPWRITE_API_KEY = 'test-api-key';

const request = require('supertest');
const app = require('../src/app');
const Challenge = require('../src/models/Challenge');
const User = require('../src/models/User');

jest.mock('node-appwrite');

jest.mock('../src/models/Challenge', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}));

describe('Challenge admin API', () => {
  const userToken = 'test-user-token';
  const adminToken = 'test-admin-token';

  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockImplementation((query) => {
      if (query.appwriteUserId === 'appwrite-admin-123' || query.email === 'admin@example.com') {
        return Promise.resolve({ _id: '507f1f77bcf86cd799439012', role: 'admin', email: 'admin@example.com' });
      }
      return Promise.resolve({ _id: '507f1f77bcf86cd799439011', role: 'user', email: 'test@example.com' });
    });
  });

  test('GET /challenges/admin rejects non-admin', async () => {
    const res = await request(app)
      .get('/api/v1/challenges/admin')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('GET /challenges/admin lists newest week first', async () => {
    const lean = jest.fn().mockResolvedValue([{ _id: 'c1', title: 'Week' }]);
    const sort = jest.fn().mockReturnValue({ lean });
    Challenge.find.mockReturnValue({ sort });

    const res = await request(app)
      .get('/api/v1/challenges/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ _id: 'c1', title: 'Week' }]);
    expect(sort).toHaveBeenCalledWith({ weekStartDate: -1, createdAt: -1 });
  });

  test('POST /challenges creates weekly challenge for admin', async () => {
    Challenge.create.mockResolvedValue({ _id: 'c2', title: 'Plastic Week' });

    const res = await request(app)
      .post('/api/v1/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Plastic Week',
        description: 'Log plastic all week',
        tasks: [{ action: 'waste_log', targetCount: 3, category: 'plastic' }],
        rewardPoints: 100,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Challenge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Plastic Week',
        rewardPoints: 100,
        weekStartDate: expect.any(Date),
      })
    );
    // weekStartDate is snapped to Monday 00:00 IST
    const weekStart = Challenge.create.mock.calls[0][0].weekStartDate;
    const ist = new Date(weekStart.getTime() + 5.5 * 60 * 60 * 1000);
    expect(ist.getUTCDay()).toBe(1);
    expect(ist.getUTCHours()).toBe(0);
  });

  test('POST /challenges rejects missing tasks', async () => {
    const res = await request(app)
      .post('/api/v1/challenges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'No tasks', description: 'Missing tasks array' });

    expect(res.statusCode).toBe(400);
    expect(Challenge.create).not.toHaveBeenCalled();
  });

  test('POST /challenges rejects non-admin', async () => {
    const res = await request(app)
      .post('/api/v1/challenges')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Hack',
        description: 'Trying as user',
        tasks: [{ action: 'waste_log', targetCount: 1 }],
      });

    expect(res.statusCode).toBe(403);
  });

  test('PUT /challenges/:id updates and returns challenge', async () => {
    Challenge.findByIdAndUpdate.mockResolvedValue({ _id: 'c1', title: 'Renamed' });

    const res = await request(app)
      .put('/api/v1/challenges/c1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Renamed' });

    expect(res.statusCode).toBe(200);
    expect(res.body.challenge.title).toBe('Renamed');
  });

  test('PUT /challenges/:id returns 404 when missing', async () => {
    Challenge.findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/v1/challenges/nope')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Ghost' });

    expect(res.statusCode).toBe(404);
  });

  test('DELETE /challenges/:id deactivates instead of removing', async () => {
    Challenge.findByIdAndUpdate.mockResolvedValue({ _id: 'c1', isActive: false });

    const res = await request(app)
      .delete('/api/v1/challenges/c1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Challenge.findByIdAndUpdate).toHaveBeenCalledWith(
      'c1',
      { isActive: false },
      { new: true }
    );
  });

  test('DELETE /challenges/:id returns 404 when missing', async () => {
    Challenge.findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/v1/challenges/nope')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });
});
