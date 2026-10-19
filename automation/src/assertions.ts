import { expect as baseExpect } from '@playwright/test';
import { ApiResponse } from './helpers/api-client';

const result = (pass: boolean, name: string, msg: () => string) => ({ pass, message: msg, name });

export const expect = baseExpect.extend({
  /** Status check that prints the response body on failure. */
  toHaveStatus(res: ApiResponse, expected: number) {
    return result(res.status === expected, 'toHaveStatus', () =>
      `Expected HTTP ${expected}, got ${res.status}\nBody: ${JSON.stringify(res.body)}`);
  },

  toBeValidUser(received: object) {
    const user = received as any;
    const ok =
      typeof user?.id === 'string' && /^[a-f0-9]{24}$/.test(user.id) &&
      typeof user.name === 'string' && typeof user.email === 'string' && user.email.includes('@') &&
      !('passwordHash' in user) && !('password' in user);
    return result(ok, 'toBeValidUser', () => `Not a valid public user (or leaks credentials): ${JSON.stringify(user)}`);
  },

  toBeValidTransaction(received: object) {
    const tx = received as any;
    const ok =
      typeof tx?._id === 'string' && typeof tx.fromUserId === 'string' && typeof tx.toUserId === 'string' &&
      typeof tx.amount === 'number' && tx.amount > 0 && typeof tx.currency === 'string' &&
      ['pending', 'completed', 'failed'].includes(tx.status) && !Number.isNaN(Date.parse(tx.createdAt));
    return result(ok, 'toBeValidTransaction', () => `Not a valid transaction: ${JSON.stringify(tx)}`);
  },

  toBeWithinResponseTime(res: ApiResponse, maxMs: number) {
    return result(res.ms <= maxMs, 'toBeWithinResponseTime', () => `Response took ${res.ms}ms, limit ${maxMs}ms`);
  },
});
