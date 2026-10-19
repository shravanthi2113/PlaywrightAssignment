import { test, expect } from '../../src/fixtures';
import { buildTransaction } from '../../src/factories';

test.describe('Transactions API', () => {
  test('creates a transaction @smoke', async ({ api, alice, bob }) => {
    const data = buildTransaction(bob.user.id, { amount: 100.5 });
    const res = await api.createTransaction(data, alice.token);
    expect(res).toHaveStatus(201);
    expect(res.body as object).toBeValidTransaction();
    expect(res.body).toMatchObject({
      fromUserId: alice.user.id,
      toUserId: bob.user.id,
      amount: 100.5,
      currency: 'USD',
      status: 'completed',
    });
  });

  test('honours a custom currency', async ({ api, alice, bob }) => {
    const res = await api.createTransaction(buildTransaction(bob.user.id, { currency: 'EUR' }), alice.token);
    expect(res).toHaveStatus(201);
    expect(res.body.currency).toBe('EUR');
  });

  test('retrieves a transaction by id', async ({ api, alice, bob }) => {
    const created = await api.createTransaction(buildTransaction(bob.user.id), alice.token);
    const res = await api.getTransaction(created.body._id, alice.token);
    expect(res).toHaveStatus(200);
    expect(res.body).toEqual(created.body);
  });

  test('lists transactions for both sender and recipient, newest first', async ({ api, alice, bob }) => {
    const first = await api.createTransaction(buildTransaction(bob.user.id), alice.token);
    const second = await api.createTransaction(buildTransaction(alice.user.id), bob.token);

    for (const session of [alice, bob]) {
      const res = await api.listTransactions(session.token);
      expect(res).toHaveStatus(200);
      expect(res.body.map((t: any) => t._id)).toEqual([second.body._id, first.body._id]);
    }
  });

  test('a new user has an empty list', async ({ api, alice }) => {
    const res = await api.listTransactions(alice.token);
    expect(res).toHaveStatus(200);
    expect(res.body).toEqual([]);
  });

  test('notifies both parties', async ({ api, alice, bob }) => {
    await api.createTransaction(buildTransaction(bob.user.id, { amount: 42 }), alice.token);
    // Notifications are sent asynchronously.
    await expect
      .poll(async () => (await api.listNotifications(alice.token)).body.map((n: any) => n.type))
      .toContain('transaction.sent');
    await expect
      .poll(async () => (await api.listNotifications(bob.token)).body.map((n: any) => n.type))
      .toContain('transaction.received');
  });

  test.describe('validation', () => {
    const invalid: [string, (to: string) => object][] = [
      ['zero amount', (to) => ({ toUserId: to, amount: 0 })],
      ['negative amount', (to) => ({ toUserId: to, amount: -5 })],
      ['string amount', (to) => ({ toUserId: to, amount: '100' })],
      ['null amount', (to) => ({ toUserId: to, amount: null })],
      ['missing amount', (to) => ({ toUserId: to })],
      ['missing recipient', () => ({ amount: 10 })],
      ['empty body', () => ({})],
    ];
    for (const [name, build] of invalid) {
      test(`rejects ${name} with 400`, async ({ api, alice, bob }) => {
        const res = await api.createTransaction(build(bob.user.id), alice.token);
        expect(res).toHaveStatus(400);
        expect(res.body.error).toBeTruthy();
      });
    }

    test('rejects a transfer to yourself', async ({ api, alice }) => {
      const res = await api.createTransaction(buildTransaction(alice.user.id), alice.token);
      expect(res).toHaveStatus(400);
      expect(res.body.error).toMatch(/yourself/i);
    });
  });

  test.describe('error scenarios', () => {
    test('404 for an unknown transaction id', async ({ api, alice }) => {
      expect(await api.getTransaction('0'.repeat(24), alice.token)).toHaveStatus(404);
    });

    test('400 for a malformed transaction id', async ({ api, alice }) => {
      expect(await api.getTransaction('nope', alice.token)).toHaveStatus(400);
    });

    test('404 for an unknown route', async ({ api, alice }) => {
      expect(await api.call('GET', '/api/does-not-exist', { token: alice.token })).toHaveStatus(404);
    });
  });
});
