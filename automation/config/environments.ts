export interface Environment {
  name: string;
  apiUrl: string; // API gateway
  uiUrl: string; // React app
  jwtSecret?: string; // only used to forge tokens in negative auth tests
}

const environments: Record<string, Environment> = {
  local: {
    name: 'local',
    apiUrl: 'http://localhost:8080',
    uiUrl: 'http://localhost:5173',
    jwtSecret: 'dev-secret-change-me',
  },
  staging: {
    name: 'staging',
    apiUrl: 'https://api.staging.example.com',
    uiUrl: 'https://app.staging.example.com',
  },
};

// Select with TEST_ENV; individual values can be overridden with API_URL, UI_URL, JWT_SECRET.
export function loadEnvironment(): Environment {
  const name = process.env.TEST_ENV || 'local';
  const base = environments[name];
  if (!base) throw new Error(`Unknown TEST_ENV "${name}". Known: ${Object.keys(environments).join(', ')}`);
  return {
    ...base,
    apiUrl: process.env.API_URL || base.apiUrl,
    uiUrl: process.env.UI_URL || base.uiUrl,
    jwtSecret: process.env.JWT_SECRET || base.jwtSecret,
  };
}

export const env = loadEnvironment();
