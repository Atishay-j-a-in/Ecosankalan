process.env.NODE_ENV = 'test';
process.env.APPWRITE_ENDPOINT = 'https://test.cloud.appwrite.io/v1';
process.env.APPWRITE_PROJECT_ID = 'test-project';
process.env.APPWRITE_API_KEY = 'test-api-key';

const request = require('supertest');
const app = require('../src/app');
const MapMarker = require('../src/models/MapMarker');

jest.mock('../src/models/MapMarker', () => ({
  find: jest.fn(),
}));

describe('Markers API', () => {
  beforeEach(() => jest.clearAllMocks());

  const mockFind = (docs) => {
    MapMarker.find.mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(docs),
      }),
    });
  };

  test('GET /markers returns OSM-shaped locations within bounds', async () => {
    mockFind([
      {
        osmId: 123,
        osmType: 'node',
        location: { type: 'Point', coordinates: [77.03, 28.61] },
        category: 'Recycling Bin',
        name: 'Gate Bin',
        tags: { amenity: 'recycling' },
      },
    ]);

    const res = await request(app).get(
      '/api/v1/markers?north=29&south=28&east=78&west=77'
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.locations[0]).toMatchObject({
      id: 'node_123',
      osmId: 123,
      lat: 28.61,
      lng: 77.03,
      category: 'Recycling Bin',
      color: 'blue',
    });
    expect(MapMarker.find).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        location: expect.objectContaining({ $geoWithin: expect.any(Object) }),
      })
    );
    const box = MapMarker.find.mock.calls[0][0].location.$geoWithin.$box;
    expect(box).toEqual([[77, 28], [78, 29]]);
  });

  test('GET /markers caps results at 500', async () => {
    mockFind([]);

    await request(app).get('/api/v1/markers?north=29&south=28&east=78&west=77');

    const limitFn = MapMarker.find.mock.results[0].value.limit;
    expect(limitFn).toHaveBeenCalledWith(500);
  });

  test('GET /markers filters by ?categories=', async () => {
    mockFind([]);

    await request(app).get(
      '/api/v1/markers?north=29&south=28&east=78&west=77&categories=Recycling%20Bin,Landfill'
    );

    expect(MapMarker.find).toHaveBeenCalledWith(
      expect.objectContaining({
        category: { $in: ['Recycling Bin', 'Landfill'] },
      })
    );
  });

  test('GET /markers requires bounds', async () => {
    const res = await request(app).get('/api/v1/markers');

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/north, south, east, and west/);
  });

  test('GET /markers rejects non-numeric bounding box', async () => {
    const res = await request(app).get('/api/v1/markers?north=abc&south=28&east=78&west=77');

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/numeric/);
  });

  test('GET /markers rejects out-of-range bounding box', async () => {
    const res = await request(app).get('/api/v1/markers?north=200&south=28&east=78&west=77');

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/out of range/);
  });

  test('GET /markers rejects too-large bounding box', async () => {
    const res = await request(app).get('/api/v1/markers?north=60&south=-60&east=120&west=-120');

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Zoom in/);
  });
});
