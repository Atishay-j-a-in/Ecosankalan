process.env.JWT_SECRET = 'test_jwt_secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const WasteLog = require('../src/models/WasteLog');
const Bin = require('../src/models/Bin');
const Event = require('../src/models/Event');
const Voucher = require('../src/models/Voucher');
const ChallengeProgress = require('../src/models/ChallengeProgress');

jest.mock('../src/models/User', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../src/models/WasteLog', () => ({
  aggregate: jest.fn(),
}));

jest.mock('../src/models/Bin', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('../src/models/Event', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('../src/models/Voucher', () => ({
  countDocuments: jest.fn(),
}));

jest.mock('../src/models/ChallengeProgress', () => ({
  countDocuments: jest.fn(),
}));

describe('Leaderboard API (public)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GET /leaderboard works without auth and returns platform + leaders + features', async () => {
    User.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'u1', name: 'Asha', totalPointsEarned: 120, ecoPoints: 100, totalWasteLogged: 10, co2Saved: 5, badges: [{ name: 'First Log' }] },
        { _id: 'u2', name: 'Ravi', totalPointsEarned: 40, ecoPoints: 40, totalWasteLogged: 3, co2Saved: 1, badges: [] },
      ]),
    });
    User.countDocuments.mockResolvedValue(2);
    WasteLog.aggregate
      .mockResolvedValueOnce([{ totalKg: 13 }])
      .mockResolvedValueOnce([{ totalCo2: 6 }]);
    Bin.countDocuments.mockResolvedValue(4);
    Event.countDocuments.mockResolvedValue(3);
    Voucher.countDocuments.mockResolvedValue(5);
    ChallengeProgress.countDocuments.mockResolvedValue(1);

    const res = await request(app).get('/api/v1/leaderboard');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.platform.totalUsers).toBe(2);
    expect(res.body.platform.totalWasteKg).toBe(13);
    expect(res.body.leaders).toHaveLength(2);
    expect(res.body.leaders[0]).toMatchObject({ rank: 1, name: 'Asha' });
    expect(res.body.leaders[0].badges).toBe(1);
    expect(Array.isArray(res.body.features)).toBe(true);
    expect(res.body.features.length).toBeGreaterThan(0);
  });

  test('GET /leaderboard respects limit param', async () => {
    const limitFn = jest.fn().mockReturnThis();
    User.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: limitFn,
      lean: jest.fn().mockResolvedValue([]),
    });
    User.countDocuments.mockResolvedValue(0);
    WasteLog.aggregate.mockResolvedValue([]);
    Bin.countDocuments.mockResolvedValue(0);
    Event.countDocuments.mockResolvedValue(0);
    Voucher.countDocuments.mockResolvedValue(0);
    ChallengeProgress.countDocuments.mockResolvedValue(0);

    const res = await request(app).get('/api/v1/leaderboard?limit=5');

    expect(res.statusCode).toBe(200);
    expect(limitFn).toHaveBeenCalledWith(5);
  });
});
