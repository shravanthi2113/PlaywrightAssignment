import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  goto = () => this.page.goto('/');
  heading = () => this.page.getByRole('heading', { name: /sign in|create account/i });
  error = () => this.page.locator('p.error');

  showRegister = () => this.page.getByRole('link', { name: 'Register' }).click();

  async fill({ name, email, password }: { name?: string; email: string; password: string }) {
    if (name !== undefined) await this.page.getByLabel('Name').fill(name);
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
  }

  submit = () => this.page.getByRole('button', { name: /^(sign in|register)$/i }).click();

  async login(email: string, password: string) {
    await this.fill({ email, password });
    await this.submit();
  }
}
