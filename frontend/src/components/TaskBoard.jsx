import { Edit2, Trash2, Clock, CheckCircle2, CircleDashed, MessageSquare } from 'lucide-react';

export default function TaskBoard({ tasks, currentUser, isAdmin, onEdit, onOpenComments, onDelete, onStatusChange }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} />;
      case 'progress': return <CircleDashed size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (tasks.length === 0) {
    return (
      <div className="glass-panel" style={styles.emptyState}>
        <div style={styles.emptyIcon}>✨</div>
        <h3>No tasks for today</h3>
        <p>You're all caught up!</p>
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {tasks.map((task) => (
        <div key={task.id} className="glass-panel" style={styles.card}>
          <div style={styles.cardHeader}>
            <div className={`status-badge ${task.status}`} style={styles.badgeWrapper}>
              {getStatusIcon(task.status)}
              {task.status === 'pending' ? 'Yet to start' : task.status.replace('-', ' ')}
            </div>
            <div style={styles.actions}>
              {task.comments && (Array.isArray(task.comments) ? task.comments.length > 0 : task.comments.trim() !== '') && 
               (!Array.isArray(task.readBy) || !task.readBy.includes(currentUser?.id)) && (
                <div style={{ display: 'flex', alignItems: 'center', paddingRight: '4px' }}>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }} title="New comments" />
                </div>
              )}
              <button style={styles.actionBtn} onClick={() => onOpenComments(task)} title="View/Add Comments">
                <MessageSquare size={16} />
              </button>
              {isAdmin && (
                <>
                  <button style={styles.actionBtn} onClick={() => onEdit(task)} title="Edit Task">
                    <Edit2 size={16} />
                  </button>
                  <button style={{ ...styles.actionBtn, color: '#ef4444' }} onClick={() => onDelete(task.id)} title="Delete Task">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          
          <h3 style={styles.title}>{task.title}</h3>
          <p style={styles.description}>{task.description}</p>
          
          <div style={styles.footer}>
            <span style={styles.date}>{formatDate(task.date)}</span>
            
            {isAdmin && (
              <select 
                style={styles.statusSelect}
                value={task.status}
                onChange={(e) => onStatusChange(task.id, e.target.value)}
              >
                <option value="pending">Yet to start</option>
                <option value="progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  card: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  badgeWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    padding: '6px',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  description: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    flex: 1,
    marginBottom: '20px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
    marginTop: 'auto',
  },
  date: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  statusSelect: {
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  emptyState: {
    padding: '60px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '8px',
  }
};
