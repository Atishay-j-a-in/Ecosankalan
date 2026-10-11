process.env.NODE_ENV = 'test';
process.env.APPWRITE_ENDPOINT = 'https://test.cloud.appwrite.io/v1';
process.env.APPWRITE_PROJECT_ID = 'test-project';
process.env.APPWRITE_API_KEY = 'test-api-key';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const WasteLog = require('../src/models/WasteLog');
const Event = require('../src/models/Event');
const ChallengeProgress = require('../src/models/ChallengeProgress');
const Voucher = require('../src/models/Voucher');

jest.mock('node-appwrite');

jest.mock('../src/models/User', () => ({
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../src/models/WasteLog', () => ({
  aggregate: jest.fn(),
}));

jest.mock('../src/models/Event', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('../src/models/ChallengeProgress', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('../src/models/Voucher', () => ({
  insertMany: jest.fn(),
  aggregate: jest.fn(),
}));

describe('Admin API', () => {
  const adminId = '507f1f77bcf86cd799439011';
  const adminToken = 'test-admin-token';

  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockResolvedValue({ _id: adminId, role: 'admin', email: 'admin@example.com' });
  });

  test('POST /admin/vouchers bulk inserts and reports duplicates', async () => {
    Voucher.insertMany.mockRejectedValue({
      insertedDocs: [{ code: 'A' }],
      writeErrors: [{ code: 11000 }],
    });

    const res = await request(app)
      .post('/api/v1/admin/vouchers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send([
        { code: 'A', partnerName: 'GreenKart' },
        { code: 'A', partnerName: 'GreenKart' },
      ]);

    expect(res.statusCode).toBe(201);
    expect(res.body.insertedCount).toBe(1);
    expect(res.body.duplicateCount).toBe(1);
  });

  test('GET /admin/vouchers/stats returns partner counts', async () => {
    Voucher.aggregate.mockResolvedValue([{ partnerName: 'GreenKart', totalIssued: 2, totalAssigned: 1, remaining: 1 }]);

    const res = await request(app)
      .get('/api/v1/admin/vouchers/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body[0].remaining).toBe(1);
  });

  test('GET /admin/stats returns platform aggregation', async () => {
    User.countDocuments.mockResolvedValue(10);
    WasteLog.aggregate.mockResolvedValue([{ totalWasteKg: 12.345 }]);
    Event.countDocuments.mockResolvedValue(2);
    ChallengeProgress.countDocuments.mockResolvedValue(3);
    Voucher.aggregate.mockResolvedValue([{ partnerName: 'GreenKart', issued: 1 }]);

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalUsers).toBe(10);
    expect(res.body.totalWasteKg).toBe(12.35);
    expect(res.body.openAICostMTD).toBe(0);
  });
});
