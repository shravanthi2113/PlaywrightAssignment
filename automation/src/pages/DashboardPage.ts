import { Page } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  heading = () => this.page.getByRole('heading', { name: 'Transactions' });
  rows = () => this.page.locator('tbody tr');
  emptyState = () => this.page.getByText('No transactions yet.');
  notifications = () => this.page.locator('ul.notes li');
  error = () => this.page.locator('p.error');
  signOut = () => this.page.getByRole('button', { name: 'Sign out' }).click();

  async send(toUserId: string, amount: number | string) {
    await this.page.getByPlaceholder('Recipient user ID').fill(toUserId);
    await this.page.getByPlaceholder('Amount').fill(String(amount));
    await this.page.getByRole('button', { name: 'Send' }).click();
  }
}
