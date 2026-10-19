const SESSION_KEY = 'session';

export const getSession = () => JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
export const setSession = (s) => localStorage.setItem(SESSION_KEY, JSON.stringify(s));
export const clearSession = () => localStorage.removeItem(SESSION_KEY);

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const session = getSession();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body && { 'content-type': 'application/json' }),
      ...(session && { authorization: `Bearer ${session.token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data;
}

export const api = {
  login: (email, password) => request('/users/login', { method: 'POST', body: { email, password } }),
  register: (name, email, password) => request('/users/register', { method: 'POST', body: { name, email, password } }),
  getUser: (id) => request(`/users/${id}`),
  listTransactions: () => request('/transactions'),
  createTransaction: (tx) => request('/transactions', { method: 'POST', body: tx }),
  listNotifications: () => request('/notifications'),
};
