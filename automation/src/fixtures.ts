import { test as base } from '@playwright/test';
import { ApiClient, Session } from './helpers/api-client';
import { env } from '../config/environments';

type Fixtures = {
  api: ApiClient;
  /** A freshly registered + logged-in user. */
  alice: Session;
  /** A second user, for authorization / recipient scenarios. */
  bob: Session;
};

export const test = base.extend<Fixtures>({
  // Own request context so the API client is available to UI tests too.
  api: async ({ playwright }, use, testInfo) => {
    const ctx = await playwright.request.newContext({ baseURL: env.apiUrl });
    const client = new ApiClient(ctx);
    await use(client);
    // API response logging: attached to every test in the report.
    if (client.log.length) {
      await testInfo.attach('api-log.json', { body: JSON.stringify(client.log, null, 2), contentType: 'application/json' });
    }
    await ctx.dispose();
  },
  alice: async ({ api }, use) => use(await api.createSession()),
  bob: async ({ api }, use) => use(await api.createSession()),
});

export { expect } from './assertions';
