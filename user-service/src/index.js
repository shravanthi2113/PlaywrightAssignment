const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { PORT = 3000, MONGO_URL, JWT_SECRET } = process.env;

const User = mongoose.model(
  'User',
  new mongoose.Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      passwordHash: { type: String, required: true },
    },
    { timestamps: true }
  )
);

const toPublic = (u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt });

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/users/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  try {
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json(toPublic(user));
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/users/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = email && (await User.findOne({ email: email.toLowerCase() }));
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({}, JWT_SECRET, { subject: user.id, expiresIn: '1h' });
  res.json({ token, user: toPublic(user) });
});

app.get('/users/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(toPublic(user));
});

mongoose
  .connect(MONGO_URL)
  .then(() => app.listen(PORT, () => console.log(`user-service listening on ${PORT}`)))
  .catch((err) => {
    console.error('Mongo connection failed', err);
    process.exit(1);
  });
