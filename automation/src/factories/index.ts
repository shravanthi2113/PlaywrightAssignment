import { faker } from '@faker-js/faker';

export interface NewUser {
  name: string;
  email: string;
  password: string;
}

export interface NewTransaction {
  toUserId: string;
  amount: number;
  currency?: string;
}

// Emails are unique per call so tests never collide and need no cleanup
// (the API has no delete endpoint).
export function buildUser(overrides: Partial<NewUser> = {}): NewUser {
  const unique = `${Date.now().toString(36)}${faker.string.alphanumeric(6).toLowerCase()}`;
  return {
    name: faker.person.fullName(),
    email: `qa.${unique}@example.test`,
    password: faker.internet.password({ length: 12 }),
    ...overrides,
  };
}

export function buildTransaction(toUserId: string, overrides: Partial<NewTransaction> = {}): NewTransaction {
  return {
    toUserId,
    amount: faker.number.float({ min: 1, max: 500, fractionDigits: 2 }),
    ...overrides,
  };
}
