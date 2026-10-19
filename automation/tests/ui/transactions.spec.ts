import { test, expect } from '../../src/fixtures';
import { buildTransaction } from '../../src/factories';
import { DashboardPage } from '../../src/pages/DashboardPage';
import { Session } from '../../src/helpers/api-client';

// Skip the login form: seed the session the app reads from localStorage.
async function signInAs(page: import('@playwright/test').Page, s: Session) {
  await page.addInitScript(
    (session) => localStorage.setItem('session', JSON.stringify(session)),
    { token: s.token, user: s.user }
  );
  await page.goto('/');
}

test.describe('Transactions UI', () => {
  test('shows an empty state for a new user', async ({ page, alice }) => {
    await signInAs(page, alice);
    await expect(new DashboardPage(page).emptyState()).toBeVisible();
  });

  test('lists API-created transactions with direction and counterparty @smoke', async ({ page, api, alice, bob }) => {
    await api.createTransaction(buildTransaction(bob.user.id, { amount: 25 }), alice.token);
    await api.createTransaction(buildTransaction(alice.user.id, { amount: 10 }), bob.token);

    await signInAs(page, alice);
    const dash = new DashboardPage(page);
    await expect(dash.rows()).toHaveCount(2);
    // Newest first: received 10 from Bob, then sent 25 to Bob.
    await expect(dash.rows().nth(0)).toContainText('Received');
    await expect(dash.rows().nth(0)).toContainText(bob.user.name);
    await expect(dash.rows().nth(0)).toContainText('$10.00');
    await expect(dash.rows().nth(1)).toContainText('Sent');
    await expect(dash.rows().nth(1)).toContainText('$25.00');
  });

  test('creates a transaction through the form', async ({ page, api, alice, bob }) => {
    await signInAs(page, alice);
    const dash = new DashboardPage(page);
    await dash.send(bob.user.id, '75.25');

    await expect(dash.rows()).toHaveCount(1);
    await expect(dash.rows().first()).toContainText('Sent');
    await expect(dash.rows().first()).toContainText('$75.25');
    await expect(dash.notifications().first()).toContainText('You sent 75.25 USD');

    const saved = await api.listTransactions(bob.token);
    expect(saved.body).toHaveLength(1);
  });

  test('shows the API error when sending to yourself', async ({ page, alice }) => {
    await signInAs(page, alice);
    const dash = new DashboardPage(page);
    await dash.send(alice.user.id, 10);
    await expect(dash.error()).toHaveText('Cannot send to yourself');
    await expect(dash.emptyState()).toBeVisible();
  });

  test('browser validation blocks a zero amount', async ({ page, alice, bob }) => {
    await signInAs(page, alice);
    const dash = new DashboardPage(page);
    await dash.send(bob.user.id, 0);
    await expect(page.getByPlaceholder('Amount')).toHaveJSProperty('validity.rangeUnderflow', true);
    await expect(dash.emptyState()).toBeVisible();
  });

  test('signs the user out when the token is rejected', async ({ page, alice }) => {
    await signInAs(page, { ...alice, token: 'expired.or.invalid' });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
