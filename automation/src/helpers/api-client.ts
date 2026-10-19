import { APIRequestContext } from '@playwright/test';
import { NewTransaction, NewUser, buildUser } from '../factories';

export interface ApiResponse<T = any> {
  status: number;
  body: T;
  ms: number;
}

export interface Session {
  user: { id: string; name: string; email: string };
  token: string;
  credentials: NewUser;
}

export interface LogEntry {
  method: string;
  path: string;
  status: number;
  ms: number;
  request?: unknown;
  response: unknown;
}

const REDACT = ['password', 'token', 'passwordHash'];
const redact = (v: any): any =>
  v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).map(([k, val]) => [k, REDACT.includes(k) ? '***' : redact(val)]))
    : v;

/** Thin wrapper over the gateway that records every call for the report. */
export class ApiClient {
  readonly log: LogEntry[] = [];
  constructor(private ctx: APIRequestContext) {}

  async call<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    opts: { data?: unknown; token?: string; headers?: Record<string, string> } = {}
  ): Promise<ApiResponse<T>> {
    const started = Date.now();
    const res = await this.ctx.fetch(path, {
      method,
      data: opts.data,
      headers: { ...(opts.token && { authorization: `Bearer ${opts.token}` }), ...opts.headers },
    });
    const ms = Date.now() - started;
    const text = await res.text();
    let body: any = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* non-JSON body kept as text */
    }
    this.log.push({ method, path, status: res.status(), ms, request: redact(opts.data), response: redact(body) });
    return { status: res.status(), body, ms };
  }

  register = (user: Pick<NewUser, 'name' | 'email' | 'password'>) => this.call('POST', '/api/users/register', { data: user });
  login = (email: string, password: string) => this.call('POST', '/api/users/login', { data: { email, password } });
  getUser = (id: string, token?: string) => this.call('GET', `/api/users/${id}`, { token });
  createTransaction = (tx: Partial<NewTransaction>, token?: string, headers?: Record<string, string>) =>
    this.call('POST', '/api/transactions', { data: tx, token, headers });
  listTransactions = (token?: string) => this.call('GET', '/api/transactions', { token });
  getTransaction = (id: string, token?: string) => this.call('GET', `/api/transactions/${id}`, { token });
  listNotifications = (token?: string) => this.call('GET', '/api/notifications', { token });

  /** Registers a fresh user and logs in. Fails loudly if setup breaks. */
  async createSession(overrides: Partial<NewUser> = {}): Promise<Session> {
    const credentials = buildUser(overrides);
    const reg = await this.register(credentials);
    if (reg.status !== 201) throw new Error(`Setup: register failed (${reg.status}) ${JSON.stringify(reg.body)}`);
    const login = await this.login(credentials.email, credentials.password);
    if (login.status !== 200) throw new Error(`Setup: login failed (${login.status})`);
    return { user: login.body.user, token: login.body.token, credentials };
  }
}
