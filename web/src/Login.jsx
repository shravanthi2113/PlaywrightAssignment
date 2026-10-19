import { useState } from 'react';

export default function Login({ onLogin, api }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') await api.register(form.name, form.email, form.password);
      onLogin(await api.login(form.email, form.password));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="card narrow">
      <h1>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      <form onSubmit={submit}>
        {mode === 'register' && (
          <label>Name<input value={form.name} onChange={set('name')} required /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
        <label>Password<input type="password" value={form.password} onChange={set('password')} required /></label>
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}</button>
      </form>
      <p className="muted">
        {mode === 'login' ? 'No account? ' : 'Have an account? '}
        <a href="#" onClick={(e) => { e.preventDefault(); setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
          {mode === 'login' ? 'Register' : 'Sign in'}
        </a>
      </p>
    </main>
  );
}
