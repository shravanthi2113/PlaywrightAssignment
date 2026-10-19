import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

const fmtMoney = (n, currency) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(n);

export default function Dashboard({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [names, setNames] = useState({ [user.id]: 'You' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const requested = useRef(new Set([user.id]));

  const load = useCallback(async () => {
    try {
      const [txs, notes] = await Promise.all([api.listTransactions(), api.listNotifications()]);
      setTransactions(txs);
      setNotifications(notes);
      setError('');
      // Resolve counterparty names once per id.
      const ids = new Set(txs.flatMap((t) => [t.fromUserId, t.toUserId]));
      for (const id of ids) {
        if (requested.current.has(id)) continue;
        requested.current.add(id);
        api.getUser(id).then((u) => setNames((n) => ({ ...n, [id]: u.name }))).catch(() => {});
      }
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="card">
      <header className="bar">
        <h1>Transactions</h1>
        <span>
          {user.name} <button className="link" onClick={onLogout}>Sign out</button>
        </span>
      </header>

      <SendForm onSent={load} />
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="muted">No transactions yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Date</th><th>Direction</th><th>Counterparty</th><th className="num">Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const sent = t.fromUserId === user.id;
              const other = sent ? t.toUserId : t.fromUserId;
              return (
                <tr key={t._id}>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>{sent ? 'Sent' : 'Received'}</td>
                  <td title={other}>{names[other] || other}</td>
                  <td className={`num ${sent ? 'out' : 'in'}`}>
                    {sent ? '−' : '+'}{fmtMoney(t.amount, t.currency)}
                  </td>
                  <td>{t.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>Notifications</h2>
      {notifications.length === 0 ? (
        <p className="muted">None.</p>
      ) : (
        <ul className="notes">
          {notifications.map((n) => (
            <li key={n.id}>
              <span>{n.message}</span>
              <time className="muted">{new Date(n.createdAt).toLocaleString()}</time>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function SendForm({ onSent }) {
  const [toUserId, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.createTransaction({ toUserId: toUserId.trim(), amount: Number(amount) });
      setTo('');
      setAmount('');
      await onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="send" onSubmit={submit}>
      <input placeholder="Recipient user ID" value={toUserId} onChange={(e) => setTo(e.target.value)} required />
      <input type="number" step="0.01" min="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <button disabled={busy}>Send</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
