import { useState } from 'react';
import { api, clearSession, getSession, setSession } from './api.js';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';

export default function App() {
  const [session, setSessionState] = useState(getSession);

  const handleLogin = (s) => {
    setSession(s);
    setSessionState(s);
  };
  const handleLogout = () => {
    clearSession();
    setSessionState(null);
  };

  return session ? (
    <Dashboard user={session.user} onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} api={api} />
  );
}
