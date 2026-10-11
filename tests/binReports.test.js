process.env.JWT_SECRET = 'test_jwt_secret';
process.env.NODE_ENV = 'test';
// Exercise the Cloudinary branch deterministically: dummy creds flip the
// hasCloudinary check, while the SDK itself is mocked (no network).
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Bin = require('../src/models/Bin');
const BinReport = require('../src/models/BinReport');

jest.mock('../src/models/Bin', () => ({
  find: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../src/models/BinReport', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../src/config/cloudinary', () => {
  return jest.fn().mockReturnValue({
    uploader: {
      upload: jest.fn().mockResolvedValue({ secure_url: 'https://cloudinary.test/bin.png' }),
    },
  });
});

describe('Bin reports API', () => {
  const userToken = jwt.sign({ userId: '507f1f77bcf86cd799439011', role: 'user' }, process.env.JWT_SECRET);
  const adminToken = jwt.sign({ userId: '507f1f77bcf86cd799439012', role: 'admin' }, process.env.JWT_SECRET);

  beforeEach(() => jest.clearAllMocks());

  test('POST /bins/report requires auth', async () => {
    const res = await request(app).post('/api/v1/bins/report').send({});
    expect(res.statusCode).toBe(401);
  });

  test('POST /bins/report rejects missing photo (photo mandatory)', async () => {
    const res = await request(app)
      .post('/api/v1/bins/report')
      .set('Authorization', `Bearer ${userToken}`)
      .field('name', 'Gate Bin')
      .field('types', 'plastic')
      .field('lat', '28.61')
      .field('lng', '77.03');

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/photo/i);
  });

  test('POST /bins/report rejects missing live location', async () => {
    const res = await request(app)
      .post('/api/v1/bins/report')
      .set('Authorization', `Bearer ${userToken}`)
      .field('name', 'Gate Bin')
      .field('types', 'plastic')
      .attach('photo', Buffer.from('fake-image'), { filename: 'bin.png', contentType: 'image/png' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/location|lat/i);
  });

  test('POST /bins/report creates a pending report with photo + location', async () => {
    BinReport.create.mockResolvedValue({ _id: 'rep1', status: 'pending', name: 'Gate Bin' });

    const res = await request(app)
      .post('/api/v1/bins/report')
      .set('Authorization', `Bearer ${userToken}`)
      .field('name', 'Gate Bin')
      .field('address', 'NSUT Gate 1')
      .field('types', 'plastic,paper')
      .field('lat', '28.61')
      .field('lng', '77.03')
      .attach('photo', Buffer.from('fake-image'), { filename: 'bin.png', contentType: 'image/png' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(BinReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Gate Bin',
        location: { type: 'Point', coordinates: [77.03, 28.61] },
      })
    );
    const photoUrl = BinReport.create.mock.calls[0][0].photoUrl;
    expect(photoUrl).toBe('https://cloudinary.test/bin.png');
  });

  test('GET /bins/requests rejects non-admin', async () => {
    const res = await request(app)
      .get('/api/v1/bins/requests')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('POST /bins/requests/:id/approve creates a Bin and marks approved', async () => {
    const report = {
      _id: 'rep1',
      status: 'pending',
      name: 'Gate Bin',
      address: 'NSUT Gate 1',
      location: { type: 'Point', coordinates: [77.03, 28.61] },
      types: ['plastic'],
      save: jest.fn().mockResolvedValue(true),
    };
    BinReport.findById.mockResolvedValue(report);
    Bin.create.mockResolvedValue({ _id: 'bin9', name: 'Gate Bin' });

    const res = await request(app)
      .post('/api/v1/bins/requests/rep1/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Verified on site visit' });

    expect(res.statusCode).toBe(200);
    expect(Bin.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Gate Bin' }));
    expect(report.status).toBe('approved');
    expect(report.save).toHaveBeenCalled();
  });

  test('POST /bins/requests/:id/reject marks rejected with reason', async () => {
    const report = {
      _id: 'rep2',
      status: 'pending',
      save: jest.fn().mockResolvedValue(true),
    };
    BinReport.findById.mockResolvedValue(report);

    const res = await request(app)
      .post('/api/v1/bins/requests/rep2/reject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Duplicate of existing bin' });

    expect(res.statusCode).toBe(200);
    expect(report.status).toBe('rejected');
    expect(report.reviewNote).toBe('Duplicate of existing bin');
    expect(Bin.create).not.toHaveBeenCalled();
  });

  test('approve/reject of already-reviewed report returns 409', async () => {
    BinReport.findById.mockResolvedValue({ _id: 'rep3', status: 'approved' });

    const res = await request(app)
      .post('/api/v1/bins/requests/rep3/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(409);
  });
});
