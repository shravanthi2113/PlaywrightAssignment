const express = require('express');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const {
  PORT = 3000,
  JWT_SECRET,
  USER_SERVICE_URL,
  TRANSACTION_SERVICE_URL,
  NOTIFICATION_SERVICE_URL,
} = process.env;

const app = express();

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PUBLIC_PATHS = ['/api/users/register', '/api/users/login'];

// Verifies the JWT and forwards the caller's identity to downstream services.
function authenticate(req, res, next) {
  if (PUBLIC_PATHS.includes(req.originalUrl.split('?')[0])) return next();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.headers['x-user-id'] = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Never trust a client-supplied identity header.
app.use((req, res, next) => {
  delete req.headers['x-user-id'];
  next();
});
app.use('/api', authenticate);

const proxy = (prefix, target) =>
  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: (path) => `${prefix.replace('/api', '')}${path === '/' ? '' : path}`,
    })
  );

proxy('/api/users', USER_SERVICE_URL);
proxy('/api/transactions', TRANSACTION_SERVICE_URL);
// Creating notifications is internal-only; clients may just read theirs.
app.use('/api/notifications', (req, res, next) =>
  req.method === 'GET' ? next() : res.status(405).json({ error: 'Method not allowed' })
);
proxy('/api/notifications', NOTIFICATION_SERVICE_URL);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log(`gateway listening on ${PORT}`));
