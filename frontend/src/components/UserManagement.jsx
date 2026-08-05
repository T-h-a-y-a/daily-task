import { useState, useEffect } from 'react';
import { UserPlus, User, ShieldCheck, Trash2, Plus, Edit2, FolderKanban, Folder, Loader } from 'lucide-react';

export default function UserManagement({ 
  currentUser,
  initialTab = 'users',
  categories = [],
  customProjectsByCategory = {},
  tasks = [],
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onCreateSubProject,
  onEditSubProject,
  onDeleteSubProject
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'users');
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'client' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    fetch(`${API_URL}/api/users`)
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
    if (!formData.username.trim() || !formData.password.trim() || isSubmitting) {
      if (!isSubmitting) setError('Username and password are required.');
      return;
    }

    if (users.some(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
      setError('Username already exists.');
      return;
    }

    setIsSubmitting(true);
    const newUser = {
      id: crypto.randomUUID(),
      username: formData.username,
      password: formData.password,
      role: formData.role,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`${API_URL}/api/users`, {
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
    } finally {
      setIsSubmitting(false);
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
      const res = await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE' });
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
      {/* Sub-Navigation Tabs */}
      <div style={styles.tabNavContainer}>
        <button 
          style={activeTab === 'users' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('users')}
        >
          <User size={16} /> User Details
        </button>
        <button 
          style={activeTab === 'projects' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('projects')}
        >
          <FolderKanban size={16} /> Project Details
        </button>
      </div>

      {activeTab === 'users' && (
        <>
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
              
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ ...styles.submitBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Creating User...
                  </>
                ) : (
                  'Create User'
                )}
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
        </>
      )}

      {activeTab === 'projects' && (
        /* Project & Category Management */
        <div className="glass-panel" style={styles.listPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={styles.title}>Project & Heading Management</h2>
              <p style={styles.subtitle}>Create, rename, or delete Main Headings and Sub-Projects. Changes reflect live on the Dashboard sidebar.</p>
            </div>
            {currentUser?.role === 'admin' && (
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={onCreateCategory}>
                <Plus size={16} /> Add Main Heading
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categories.map(cat => {
              const catTasks = tasks.filter(t => (t.category || 'SEO') === cat);
              const catProjects = Array.from(new Set([
                ...catTasks.map(t => t.project).filter(Boolean),
                ...(customProjectsByCategory[cat] || [])
              ]));

              return (
                <div key={cat} style={styles.categoryCard}>
                  <div style={styles.categoryCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FolderKanban size={18} style={{ color: '#818cf8' }} />
                      <span style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{cat}</span>
                      <span className="status-badge progress">{catTasks.length} tasks</span>
                    </div>

                    {currentUser?.role === 'admin' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => onCreateSubProject(cat)}
                        >
                          <Plus size={14} /> Add Sub-Project
                        </button>
                        <button 
                          style={styles.actionIconBtn} 
                          onClick={() => onEditCategory(cat)}
                          title="Rename Heading"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          style={{ ...styles.actionIconBtn, color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }} 
                          onClick={() => onDeleteCategory(cat)}
                          title="Delete Heading"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sub-projects grid */}
                  <div style={styles.subProjectsGrid}>
                    {catProjects.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                        No sub-projects added under {cat} yet.
                      </div>
                    ) : (
                      catProjects.map(proj => {
                        const projCount = catTasks.filter(t => t.project === proj).length;
                        return (
                          <div key={proj} style={styles.subProjectChip}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Folder size={14} style={{ color: 'var(--accent-primary)' }} />
                              <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{proj}</span>
                              <span style={styles.chipCount}>{projCount}</span>
                            </div>

                            {currentUser?.role === 'admin' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button 
                                  style={styles.smallActionBtn} 
                                  onClick={() => onEditSubProject(proj)}
                                  title="Rename Sub-Project"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  style={{ ...styles.smallActionBtn, color: '#ef4444' }} 
                                  onClick={() => onDeleteSubProject(proj)}
                                  title="Delete Sub-Project"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
  },
  categoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  categoryCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  actionIconBtn: {
    padding: '7px',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  subProjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '10px',
  },
  subProjectChip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  chipCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '8px',
  },
  smallActionBtn: {
    padding: '4px',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  tabNavContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
    marginBottom: '8px',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '12px',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid transparent',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabBtnActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '12px',
    color: '#818cf8',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
  }
};
