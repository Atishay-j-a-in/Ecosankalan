/**
 * Root manual mock for `node-appwrite` (used by backend Jest tests).
 *
 * Token-aware: `setJWT('test-admin-token')` resolves the admin identity,
 * any other token resolves the standard user identity. Mirrors the
 * `protect` middleware's usage: `new Client().setEndpoint().setProject()`
 * for the admin client, then `new Client().setEndpoint().setProject().setJWT()`
 * + `new Account(client).get()` per request.
 */

let sessionToken = null;

const adminAccount = {
  get: jest.fn().mockResolvedValue({
    $id: 'appwrite-admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
  }),
};

const userAccount = {
  get: jest.fn().mockResolvedValue({
    $id: 'appwrite-user-123',
    email: 'test@example.com',
    name: 'Test User',
  }),
};

const mockClient = {
  setEndpoint: jest.fn().mockReturnThis(),
  setProject: jest.fn().mockReturnThis(),
  setKey: jest.fn().mockReturnThis(),
  setJWT: jest.fn().mockImplementation((token) => {
    sessionToken = token;
    return mockClient;
  }),
  config: {
    endpoint: 'https://test.cloud.appwrite.io/v1',
    project: 'test-project',
  },
  account: jest.fn(() => (sessionToken === 'test-admin-token' ? adminAccount : userAccount)),
};

module.exports = {
  Client: jest.fn(() => mockClient),
  Account: mockClient.account,
};
