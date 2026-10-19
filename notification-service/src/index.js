const express = require('express');
const Redis = require('ioredis');

const { PORT = 3000, REDIS_URL } = process.env;
const MAX_PER_USER = 100;

const redis = new Redis(REDIS_URL);
const key = (userId) => `notifications:${userId}`;

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Internal: called by other services.
app.post('/notifications', async (req, res) => {
  const { userId, type, message } = req.body || {};
  if (!userId || !type || !message) {
    return res.status(400).json({ error: 'userId, type and message are required' });
  }
  const notification = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, message, createdAt: new Date().toISOString() };
  await redis.multi().lpush(key(userId), JSON.stringify(notification)).ltrim(key(userId), 0, MAX_PER_USER - 1).exec();
  res.status(201).json(notification);
});

// Callers only see their own notifications.
app.get('/notifications', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
  const items = await redis.lrange(key(userId), 0, -1);
  res.json(items.map((i) => JSON.parse(i)));
});

app.listen(PORT, () => console.log(`notification-service listening on ${PORT}`));
