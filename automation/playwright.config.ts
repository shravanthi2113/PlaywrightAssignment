import { defineConfig, devices } from '@playwright/test';
import { env } from './config/environments';

export default defineConfig({
  testDir: './tests',
  outputDir: 'reports/artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  // Several formats: console, browsable HTML, machine-readable JSON, JUnit for CI.
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // SLOW_MO=500 delays each browser action by 500 ms, handy for watching headed runs.
    launchOptions: { slowMo: Number(process.env.SLOW_MO) || 0 },
  },
  projects: [
    { name: 'api', testDir: './tests/api', use: { baseURL: env.apiUrl } },
    { name: 'ui', testDir: './tests/ui', use: { ...devices['Desktop Chrome'], baseURL: env.uiUrl } },
  ],
});
