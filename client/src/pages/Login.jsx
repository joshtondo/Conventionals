import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  heading: { margin: '0 0 4px', fontSize: '24px' },
  sub: { margin: '0 0 24px', color: '#6b7280', fontSize: '14px' },
  label: { display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    marginBottom: '16px',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '16px',
    fontSize: '14px',
  },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        navigate('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Conventials</h1>
        <p style={styles.sub}>Organizer login</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            style={styles.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <label style={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            style={styles.input}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
