import { useState, useEffect } from 'react';
import { LogOut, Plus, LayoutDashboard, Calendar, Users } from 'lucide-react';
import TaskBoard from './TaskBoard';
import TaskModal from './TaskModal';
import UserManagement from './UserManagement';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'users'
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const isAdmin = user?.role === 'admin';

  // Load tasks from Local Storage
  useEffect(() => {
    const savedTasks = localStorage.getItem('dashboard_tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    } else {
      // Default mock data
      const defaultTasks = [
        { id: '1', title: 'Review Q3 Marketing Strategy', description: 'Analyze the latest metrics and approve the budget allocation.', status: 'pending', date: new Date().toISOString() },
        { id: '2', title: 'Website Redesign Feedback', description: 'Provide feedback on the homepage wireframes provided by the design team.', status: 'progress', date: new Date().toISOString() },
        { id: '3', title: 'Client Onboarding Call', description: 'Initial sync with the new enterprise client.', status: 'completed', date: new Date().toISOString() },
      ];
      setTasks(defaultTasks);
      localStorage.setItem('dashboard_tasks', JSON.stringify(defaultTasks));
    }
  }, []);

  const saveTasks = (newTasks) => {
    setTasks(newTasks);
    localStorage.setItem('dashboard_tasks', JSON.stringify(newTasks));
  };

  const handleAddTask = (taskData) => {
    const newTask = {
      ...taskData,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    saveTasks([newTask, ...tasks]);
    setIsModalOpen(false);
  };

  const handleUpdateTask = (id, updatedData) => {
    const newTasks = tasks.map((t) => (t.id === id ? { ...t, ...updatedData } : t));
    saveTasks(newTasks);
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (id) => {
    const newTasks = tasks.filter((t) => t.id !== id);
    saveTasks(newTasks);
  };

  const openEditModal = (task) => {
    if (!isAdmin) return;
    setEditingTask(task);
    setIsModalOpen(true);
  };

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside className="glass-panel" style={styles.sidebar}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <LayoutDashboard size={24} color="white" />
          </div>
          <h2 style={styles.logoText}>Nexus</h2>
        </div>

        <nav style={styles.nav}>
          <div 
            style={activeTab === 'tasks' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('tasks')}
          >
            <Calendar size={20} />
            <span>Daily Tasks</span>
          </div>
          
          {isAdmin && (
            <div 
              style={activeTab === 'users' ? styles.navItemActive : styles.navItem}
              onClick={() => setActiveTab('users')}
            >
              <Users size={20} />
              <span>Manage Users</span>
            </div>
          )}
        </nav>

        <div style={styles.userProfile}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style={styles.userName}>{user?.username || 'User'}</div>
              <div style={styles.userRole}>{user?.role}</div>
            </div>
          </div>
          <button onClick={onLogout} style={styles.logoutBtn} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        {activeTab === 'tasks' ? (
          <>
            <header style={styles.header}>
              <div>
                <h1 style={styles.pageTitle}>Daily To-Do Tasks</h1>
                <p style={styles.pageSubtitle}>
                  {isAdmin ? 'Manage your client tasks below.' : 'View your updated tasks for today.'}
                </p>
              </div>
              {isAdmin && (
                <button className="btn-primary" style={styles.addBtn} onClick={() => setIsModalOpen(true)}>
                  <Plus size={20} />
                  New Task
                </button>
              )}
            </header>

            <div className="animate-fade-in" style={styles.content}>
              <TaskBoard
                tasks={tasks}
                isAdmin={isAdmin}
                onEdit={openEditModal}
                onDelete={handleDeleteTask}
                onStatusChange={(id, newStatus) => handleUpdateTask(id, { status: newStatus })}
              />
            </div>
          </>
        ) : (
          <>
             <header style={styles.header}>
              <div>
                <h1 style={styles.pageTitle}>User Management</h1>
                <p style={styles.pageSubtitle}>
                  Add and manage administrators and client accounts.
                </p>
              </div>
            </header>
            
            <div className="animate-fade-in" style={styles.content}>
              <UserManagement currentUser={user} />
            </div>
          </>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && isAdmin && activeTab === 'tasks' && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={editingTask ? (data) => handleUpdateTask(editingTask.id, data) : handleAddTask}
        />
      )}
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    padding: '20px',
    gap: '24px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  sidebar: {
    width: '260px',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    borderRadius: '24px',
    position: 'sticky',
    top: '20px',
    height: 'calc(100vh - 40px)',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '40px',
  },
  logoIcon: {
    backgroundColor: 'var(--accent-primary)',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 12px var(--accent-glow)',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--accent-primary)',
    fontWeight: '500',
    cursor: 'pointer',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    overflow: 'hidden',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: '600',
    color: 'white',
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100px',
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    color: 'var(--text-muted)',
    padding: '8px',
    borderRadius: '8px',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    padding: '10px 0',
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: '600',
    marginBottom: '4px',
  },
  pageSubtitle: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
  },
};
