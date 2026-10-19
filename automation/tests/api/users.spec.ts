import { test, expect } from '../../src/fixtures';
import { buildUser } from '../../src/factories';

test.describe('Users API', () => {
  test('creates a user and returns the public profile @smoke', async ({ api }) => {
    const data = buildUser();
    const res = await api.register(data);
    expect(res).toHaveStatus(201);
    expect(res.body as object).toBeValidUser();
    expect(res.body).toMatchObject({ name: data.name, email: data.email });
    expect(res).toBeWithinResponseTime(2000);
  });

  test('normalises email to lower case', async ({ api }) => {
    const data = buildUser();
    const res = await api.register({ ...data, email: data.email.toUpperCase() });
    expect(res).toHaveStatus(201);
    expect(res.body.email).toBe(data.email);
  });

  test('retrieves a user by id', async ({ api, alice }) => {
    const res = await api.getUser(alice.user.id, alice.token);
    expect(res).toHaveStatus(200);
    expect(res.body as object).toBeValidUser();
    expect(res.body.id).toBe(alice.user.id);
  });

  test('one user can read another user profile', async ({ api, alice, bob }) => {
    const res = await api.getUser(bob.user.id, alice.token);
    expect(res).toHaveStatus(200);
    expect(res.body.email).toBe(bob.user.email);
  });

  test.describe('error scenarios', () => {
    test('rejects duplicate email with 409', async ({ api, alice }) => {
      const res = await api.register(buildUser({ email: alice.credentials.email }));
      expect(res).toHaveStatus(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    test('returns 404 for an unknown user id', async ({ api, alice }) => {
      const res = await api.getUser('0'.repeat(24), alice.token);
      expect(res).toHaveStatus(404);
    });

    test('returns 400 for a malformed user id', async ({ api, alice }) => {
      const res = await api.getUser('not-an-id', alice.token);
      expect(res).toHaveStatus(400);
    });
  });

  test.describe('validation', () => {
    for (const missing of ['name', 'email', 'password'] as const) {
      test(`rejects registration without ${missing}`, async ({ api }) => {
        const data: Record<string, string> = { ...buildUser() };
        delete data[missing];
        const res = await api.register(data as any);
        expect(res).toHaveStatus(400);
        expect(res.body.error).toBeTruthy();
      });
    }

    test('rejects an empty body', async ({ api }) => {
      const res = await api.call('POST', '/api/users/register', { data: {} });
      expect(res).toHaveStatus(400);
    });
  });
});
