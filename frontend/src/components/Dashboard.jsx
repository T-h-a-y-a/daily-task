import { useState, useEffect } from 'react';
import { LogOut, Plus, LayoutDashboard, Calendar, Users, Globe, Download, MoreVertical } from 'lucide-react';
import * as XLSX from 'xlsx';
import TaskBoard from './TaskBoard';
import TaskModal from './TaskModal';
import CommentModal from './CommentModal';
import UserManagement from './UserManagement';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('seo_tasks'); // 'seo_tasks', 'website_tasks', 'users'
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const isAdmin = user?.role === 'admin';

  const getUnreadCount = (type) => {
    return tasks.filter(task => 
      task.type === type && 
      task.comments && 
      (Array.isArray(task.comments) ? task.comments.length > 0 : task.comments.trim() !== '') && 
      (!Array.isArray(task.readBy) || !task.readBy.includes(user?.id))
    ).length;
  };

  const unreadSeoCount = getUnreadCount('seo');
  const unreadWebsiteCount = getUnreadCount('website');

  // Fetch tasks from API
  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => setTasks(data.reverse()))
      .catch(err => console.error('Error fetching tasks:', err));
  }, []);

  const handleAddTask = async (taskData) => {
    const newTask = {
      ...taskData,
      type: activeTab === 'seo_tasks' ? 'seo' : 'website',
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      if (res.ok) {
        const savedTask = await res.json();
        setTasks([savedTask, ...tasks]);
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleUpdateTask = async (id, updatedData) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(prevTasks => prevTasks.map(t => (t.id === id ? { ...t, ...updatedTask } : t)));
        
        if (editingTask && editingTask.id === id) {
          setEditingTask(prev => ({ ...prev, ...updatedData }));
        }
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks(prevTasks => prevTasks.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const currentTasks = tasks.filter(t => t.type === (activeTab === 'seo_tasks' ? 'seo' : 'website'));
    if (currentTasks.length === 0) {
      alert("No tasks to export in this section.");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Main Tasks
    const mainTasksData = currentTasks.map(t => ({
      'Task Title': t.title,
      'Description': t.description,
      'Status': t.status,
      'Date Created': new Date(t.date).toLocaleDateString(),
      'Comments Count': Array.isArray(t.comments) ? t.comments.length : (t.comments && t.comments.trim() !== '' ? 1 : 0)
    }));
    const wsTasks = XLSX.utils.json_to_sheet(mainTasksData);
    XLSX.utils.book_append_sheet(wb, wsTasks, "Main Tasks");

    // Sheet 2: Comments
    const commentsData = [];
    currentTasks.forEach(t => {
      if (Array.isArray(t.comments)) {
        // Sort comments by date
        const sortedComments = [...t.comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        sortedComments.forEach(c => {
          commentsData.push({
            'Task Title': t.title,
            'Comment': c.text,
            'Author': c.authorName,
            'Date': new Date(c.createdAt).toLocaleDateString(),
            'Time': new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          });
        });
      } else if (t.comments && typeof t.comments === 'string' && t.comments.trim() !== '') {
        commentsData.push({
          'Task Title': t.title,
          'Comment': t.comments,
          'Author': 'Unknown',
          'Date': new Date(t.date).toLocaleDateString(),
          'Time': ''
        });
      }
    });

    if (commentsData.length > 0) {
      const wsComments = XLSX.utils.json_to_sheet(commentsData);
      XLSX.utils.book_append_sheet(wb, wsComments, "Comments");
    }

    XLSX.writeFile(wb, `${activeTab === 'seo_tasks' ? 'SEO' : 'Website'}_Tasks_Report.xlsx`);
  };

  const openCommentModal = (task) => {
    let updatedTask = task;
    const readBy = Array.isArray(task.readBy) ? task.readBy : [];
    if (user?.id && !readBy.includes(user.id)) {
      updatedTask = { ...task, readBy: [...readBy, user.id] };
      handleUpdateTask(task.id, { readBy: updatedTask.readBy });
    }
    setEditingTask(updatedTask);
    setIsCommentModalOpen(true);
  };

  return (
    <div className="resp-layout">
      {/* Sidebar */}
      <aside className="glass-panel resp-sidebar">
        <div style={styles.logoArea} className="resp-logo-area">
          <h2 style={styles.logoText}>FWS</h2>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <MoreVertical size={24} />
          </button>
        </div>

        <nav style={styles.nav} className={`resp-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          <div 
            style={activeTab === 'seo_tasks' ? styles.navItemActive : styles.navItem}
            onClick={() => { setActiveTab('seo_tasks'); setIsMobileMenuOpen(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={20} />
              <span>SEO Task</span>
            </div>
            {unreadSeoCount > 0 && <span style={styles.badge}>{unreadSeoCount}</span>}
          </div>

          <div 
            style={activeTab === 'website_tasks' ? styles.navItemActive : styles.navItem}
            onClick={() => { setActiveTab('website_tasks'); setIsMobileMenuOpen(false); }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={20} />
              <span>Website Task</span>
            </div>
            {unreadWebsiteCount > 0 && <span style={styles.badge}>{unreadWebsiteCount}</span>}
          </div>
          
          {isAdmin && (
            <div 
              style={activeTab === 'users' ? styles.navItemActive : styles.navItem}
              onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
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
      <main className="resp-main">
        {activeTab === 'seo_tasks' || activeTab === 'website_tasks' ? (
          <>
            <header className="resp-header">
              <div>
                <h1 style={styles.pageTitle}>{activeTab === 'seo_tasks' ? 'SEO Tasks' : 'Website Tasks'}</h1>
                <p style={styles.pageSubtitle}>
                  {isAdmin ? 'Manage your client tasks below.' : 'View your updated tasks for today.'}
                </p>
              </div>
              {isAdmin && (
                <div className="resp-actions">
                  <button className="btn-secondary" style={styles.addBtn} onClick={handleExport}>
                    <Download size={20} />
                    Export
                  </button>
                  <button className="btn-primary" style={styles.addBtn} onClick={() => setIsModalOpen(true)}>
                    <Plus size={20} />
                    New Task
                  </button>
                </div>
              )}
            </header>

            <div className="animate-fade-in" style={styles.content}>
              <TaskBoard
                tasks={tasks.filter(t => t.type === (activeTab === 'seo_tasks' ? 'seo' : 'website'))}
                currentUser={user}
                isAdmin={isAdmin}
                onEdit={openEditModal}
                onOpenComments={openCommentModal}
                onDelete={handleDeleteTask}
                onStatusChange={(id, newStatus) => handleUpdateTask(id, { status: newStatus })}
              />
            </div>
          </>
        ) : (
          <>
             <header className="resp-header">
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

      {/* Modals */}
      {isModalOpen && (activeTab === 'seo_tasks' || activeTab === 'website_tasks') && (
        <TaskModal
          task={editingTask}
          isAdmin={isAdmin}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={editingTask ? (data) => {
            handleUpdateTask(editingTask.id, data);
            setIsModalOpen(false);
            setEditingTask(null);
          } : handleAddTask}
        />
      )}

      {isCommentModalOpen && (activeTab === 'seo_tasks' || activeTab === 'website_tasks') && (
        <CommentModal
          task={editingTask}
          currentUser={user}
          onClose={() => {
            setIsCommentModalOpen(false);
            setEditingTask(null);
          }}
          onSave={(data) => handleUpdateTask(editingTask.id, data)}
        />
      )}
    </div>
  );
}

const styles = {
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
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
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
  badge: {
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '12px',
    marginLeft: 'auto',
  }
};
