import { test, expect } from '../../src/fixtures';
import { buildUser } from '../../src/factories';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';

test.describe('Registration & login', () => {
  test('registers a new user and lands on the dashboard @smoke', async ({ page }) => {
    const user = buildUser();
    const login = new LoginPage(page);
    await login.goto();
    await login.showRegister();
    await login.fill(user);
    await login.submit();

    const dash = new DashboardPage(page);
    await expect(dash.heading()).toBeVisible();
    await expect(page.getByText(user.name)).toBeVisible();
    await expect(dash.emptyState()).toBeVisible();
  });

  test('shows an error when the email is already registered', async ({ page, alice }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.showRegister();
    await login.fill({ ...buildUser(), email: alice.credentials.email });
    await login.submit();

    await expect(login.error()).toHaveText('Email already registered');
    await expect(new DashboardPage(page).heading()).toBeHidden();
  });

  test('logs in an existing user and signs out', async ({ page, alice }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(alice.credentials.email, alice.credentials.password);

    const dash = new DashboardPage(page);
    await expect(dash.heading()).toBeVisible();
    await dash.signOut();
    await expect(login.heading()).toHaveText('Sign in');
  });

  test('shows an error for invalid credentials', async ({ page, alice }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(alice.credentials.email, 'wrong-password');
    await expect(login.error()).toHaveText('Invalid credentials');
  });

  test('keeps the session after a reload', async ({ page, alice }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(alice.credentials.email, alice.credentials.password);
    const dash = new DashboardPage(page);
    await expect(dash.heading()).toBeVisible(); // session is stored once login completes
    await page.reload();
    await expect(dash.heading()).toBeVisible();
  });

  test('browser validation blocks an empty form', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.submit();
    await expect(login.heading()).toHaveText('Sign in');
    await expect(page.getByLabel('Email')).toHaveJSProperty('validity.valueMissing', true);
  });
});
