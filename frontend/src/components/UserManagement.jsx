import { useState, useEffect } from 'react';
import { UserPlus, User, ShieldCheck, Trash2 } from 'lucide-react';

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'client' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err));
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Username and password are required.');
      return;
    }

    if (users.some(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
      setError('Username already exists.');
      return;
    }

    const newUser = {
      id: crypto.randomUUID(),
      username: formData.username,
      password: formData.password,
      role: formData.role,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        const savedUser = await res.json();
        setUsers([...users, savedUser]);
        setSuccess('User created successfully!');
        setFormData({ username: '', password: '', role: 'client' });
      } else {
        setError('Failed to create user.');
      }
    } catch (err) {
      setError('Network error. Is the server running?');
    }
  };

  const handleDeleteUser = async (id) => {
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete.username === currentUser.username) {
      setError('You cannot delete your own account.');
      return;
    }
    
    // Prevent deleting the default admin
    if (userToDelete.username === 'admin') {
       setError('Cannot delete the default admin account.');
       return;
    }

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        setError('Failed to delete user.');
      }
    } catch (err) {
      setError('Network error. Is the server running?');
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={styles.container}>
      {/* Create User Form */}
      <div className="glass-panel" style={styles.formPanel}>
        <div style={styles.panelHeader}>
          <div style={styles.iconWrapper}>
            <UserPlus size={24} color="var(--accent-primary)" />
          </div>
          <div>
            <h2 style={styles.title}>Create New User</h2>
            <p style={styles.subtitle}>Add a new admin or client account.</p>
          </div>
        </div>

        <form onSubmit={handleCreateUser} style={styles.form}>
          <div style={styles.inputRow}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                name="username"
                className="input-field"
                placeholder="e.g. client123"
                value={formData.username}
                onChange={handleInputChange}
                autoComplete="off"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                className="input-field"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Role</label>
              <select
                name="role"
                className="input-field"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="client">Client (Read-only)</option>
                <option value="admin">Admin (Manage Tasks)</option>
              </select>
            </div>
          </div>
          
          {error && <div style={styles.errorText}>{error}</div>}
          {success && <div style={styles.successText}>{success}</div>}
          
          <button type="submit" className="btn-primary" style={styles.submitBtn}>
            Create User
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className="glass-panel" style={styles.listPanel}>
        <h2 style={styles.title}>Manage Users</h2>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Created On</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.userInfo}>
                      <div style={styles.avatar}>
                        {user.role === 'admin' ? <ShieldCheck size={16} /> : <User size={16} />}
                      </div>
                      <span style={{ fontWeight: '500' }}>{user.username}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span className={`status-badge ${user.role === 'admin' ? 'completed' : 'progress'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDate(user.createdAt)}</td>
                  <td style={styles.td}>
                    <button 
                      style={styles.deleteBtn} 
                      onClick={() => handleDeleteUser(user.id)}
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formPanel: {
    padding: '24px',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid var(--accent-glow)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  submitBtn: {
    alignSelf: 'flex-start',
    marginTop: '8px',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '0.9rem',
  },
  successText: {
    color: '#10b981',
    fontSize: '0.9rem',
  },
  listPanel: {
    padding: '24px',
  },
  tableContainer: {
    marginTop: '20px',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  td: {
    padding: '16px',
    verticalAlign: 'middle',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-card-hover)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'var(--text-secondary)',
  },
  deleteBtn: {
    color: '#ef4444',
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  }
};
