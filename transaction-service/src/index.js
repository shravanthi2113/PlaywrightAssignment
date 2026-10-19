const express = require('express');
const mongoose = require('mongoose');

const { PORT = 3000, MONGO_URL, NOTIFICATION_SERVICE_URL } = process.env;

const Transaction = mongoose.model(
  'Transaction',
  new mongoose.Schema(
    {
      fromUserId: { type: String, required: true, index: true },
      toUserId: { type: String, required: true, index: true },
      amount: { type: Number, required: true, min: 0.01 },
      currency: { type: String, default: 'USD' },
      status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    },
    { timestamps: true }
  )
);

// Best-effort: a notification failure must not fail the transaction.
async function notify(userId, type, message) {
  try {
    await fetch(`${NOTIFICATION_SERVICE_URL}/notifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, type, message }),
    });
  } catch (err) {
    console.error('notification failed:', err.message);
  }
}

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/transactions', async (req, res) => {
  const fromUserId = req.headers['x-user-id'];
  const { toUserId, amount, currency } = req.body || {};
  if (!fromUserId) return res.status(401).json({ error: 'Unauthenticated' });
  if (!toUserId || typeof amount !== 'number' || !(amount > 0)) {
    return res.status(400).json({ error: 'toUserId and a positive numeric amount are required' });
  }
  if (toUserId === fromUserId) return res.status(400).json({ error: 'Cannot send to yourself' });

  const tx = await Transaction.create({ fromUserId, toUserId, amount, currency });
  const label = `${tx.amount} ${tx.currency}`;
  notify(fromUserId, 'transaction.sent', `You sent ${label} to ${toUserId}`);
  notify(toUserId, 'transaction.received', `You received ${label} from ${fromUserId}`);
  res.status(201).json(tx);
});

// Lists transactions the caller is a party to.
app.get('/transactions', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
  const txs = await Transaction.find({ $or: [{ fromUserId: userId }, { toUserId: userId }] })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(txs);
});

app.get('/transactions/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  const tx = await Transaction.findById(req.params.id);
  if (!tx || (tx.fromUserId !== userId && tx.toUserId !== userId)) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(tx);
});

mongoose
  .connect(MONGO_URL)
  .then(() => app.listen(PORT, () => console.log(`transaction-service listening on ${PORT}`)))
  .catch((err) => {
    console.error('Mongo connection failed', err);
    process.exit(1);
  });
