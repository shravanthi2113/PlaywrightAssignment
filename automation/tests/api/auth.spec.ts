import { test, expect } from '../../src/fixtures';
import { env } from '../../config/environments';
import { signJwt } from '../../src/helpers/jwt';
import { buildTransaction } from '../../src/factories';
import { ApiClient, ApiResponse } from '../../src/helpers/api-client';

test.describe('Authentication', () => {
  test('login returns a token and the user @smoke', async ({ api, alice }) => {
    const res = await api.login(alice.credentials.email, alice.credentials.password);
    expect(res).toHaveStatus(200);
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.user as object).toBeValidUser();
  });

  test('rejects a wrong password with 401', async ({ api, alice }) => {
    expect(await api.login(alice.credentials.email, 'wrong-password')).toHaveStatus(401);
  });

  test('rejects an unknown email with 401 and the same message', async ({ api, alice }) => {
    const wrongPw = await api.login(alice.credentials.email, 'nope');
    const unknown = await api.login('nobody@example.test', 'nope');
    expect(unknown).toHaveStatus(401);
    expect(unknown.body.error).toBe(wrongPw.body.error); // no user enumeration
  });

  test('rejects login with missing fields', async ({ api }) => {
    expect(await api.call('POST', '/api/users/login', { data: {} })).toHaveStatus(401);
  });
});

test.describe('Authorization', () => {
  const protectedCalls: [string, (api: ApiClient, token?: string) => Promise<ApiResponse>][] = [
    ['list transactions', (api, t) => api.listTransactions(t)],
    ['create transaction', (api, t) => api.createTransaction({ toUserId: 'x', amount: 1 }, t)],
    ['list notifications', (api, t) => api.listNotifications(t)],
    ['get user', (api, t) => api.getUser('0'.repeat(24), t)],
  ];

  for (const [name, call] of protectedCalls) {
    test(`${name}: 401 without a token`, async ({ api }) => {
      expect(await call(api)).toHaveStatus(401);
    });
    test(`${name}: 401 with a malformed token`, async ({ api }) => {
      expect(await call(api, 'garbage')).toHaveStatus(401);
    });
  }

  test('rejects a token with a tampered signature', async ({ api, alice }) => {
    const [h, p] = alice.token.split('.');
    expect(await api.listTransactions(`${h}.${p}.invalidsignature`)).toHaveStatus(401);
  });

  test('rejects a token signed with the wrong secret', async ({ api, alice }) => {
    const forged = signJwt(alice.user.id, 'attacker-secret', 3600);
    expect(await api.listTransactions(forged)).toHaveStatus(401);
  });

  test('rejects an expired token', async ({ api, alice }) => {
    test.skip(!env.jwtSecret, 'JWT_SECRET not known for this environment');
    const expired = signJwt(alice.user.id, env.jwtSecret!, -60);
    expect(await api.listTransactions(expired)).toHaveStatus(401);
  });

  test('ignores a spoofed x-user-id header (sender comes from the token)', async ({ api, alice, bob }) => {
    const res = await api.createTransaction(buildTransaction(bob.user.id), alice.token, { 'x-user-id': bob.user.id });
    expect(res).toHaveStatus(201);
    expect(res.body.fromUserId).toBe(alice.user.id);
  });

  test('a user cannot read a transaction they are not party to', async ({ api, alice, bob }) => {
    const carol = await api.createSession();
    const tx = await api.createTransaction(buildTransaction(bob.user.id), alice.token);
    expect(await api.getTransaction(tx.body._id, carol.token)).toHaveStatus(404);
    expect((await api.listTransactions(carol.token)).body).toHaveLength(0);
  });

  test('clients cannot create notifications directly', async ({ api, alice }) => {
    const res = await api.call('POST', '/api/notifications', {
      token: alice.token,
      data: { userId: alice.user.id, type: 'x', message: 'spam' },
    });
    expect(res).toHaveStatus(405);
  });
});
