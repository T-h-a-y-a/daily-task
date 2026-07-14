import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let savedUsers = localStorage.getItem('dashboard_users');

    // Fallback: If no users exist, create the default admin immediately
    if (!savedUsers) {
      const defaultAdmin = {
        id: 'default-admin-id',
        username: 'admin',
        password: 'password',
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('dashboard_users', JSON.stringify([defaultAdmin]));
      savedUsers = JSON.stringify([defaultAdmin]);
    }

    const users = JSON.parse(savedUsers);
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === credentials.username.toLowerCase() &&
        u.password === credentials.password
    );

    if (user) {
      // Exclude password from the session object
      const { password, ...sessionUser } = user;
      onLogin(sessionUser);
    } else {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="login-container animate-fade-in" style={styles.container}>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <ShieldCheck size={32} color="var(--accent-primary)" />
          </div>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              name="username"
              className="input-field"
              placeholder="Enter username"
              value={credentials.username}
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              className="input-field"
              placeholder="Enter password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" className="btn-primary" style={styles.submitBtn}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px 30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-card)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid var(--border-light)',
    marginBottom: '8px',
    boxShadow: 'var(--shadow-glow)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '1rem',
    marginTop: '10px',
  },
  error: {
    color: '#ef4444',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '-10px',
  }
};
