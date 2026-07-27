import { useState } from 'react';
import { Edit2, Trash2, Clock, CheckCircle2, CircleDashed, MessageSquare, FileText, X } from 'lucide-react';

export default function TaskBoard({ tasks, currentUser, isAdmin, onEdit, onOpenComments, onDelete, onStatusChange, onUpdateTask, onOpenFiles }) {
  const [selectedDescriptionTask, setSelectedDescriptionTask] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} />;
      case 'progress': return <CircleDashed size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr}, ${timeStr}`;
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#818cf8', textDecoration: 'underline', wordBreak: 'break-all' }}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
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
    <>
      <div style={styles.grid}>
        {tasks.map((task) => {
          const isLongDescription = task.description && (task.description.length > 130 || task.description.includes('\n'));
          const displayDescription = isLongDescription 
            ? task.description.slice(0, 130).replace(/\n/g, ' ') + '...'
            : task.description;

          return (
            <div key={task.id} className="glass-panel" style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={styles.topDate}>{formatDateTime(task.date)}</span>
                  <div className={`status-badge ${task.status}`} style={styles.badgeWrapper}>
                    {getStatusIcon(task.status)}
                    {task.status === 'pending' ? 'Yet to start' : task.status.replace('-', ' ')}
                  </div>
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
              <p style={styles.description}>
                {displayDescription}
                {isLongDescription && (
                  <button 
                    style={styles.moreBtn} 
                    onClick={() => setSelectedDescriptionTask(task)}
                    title="View full description"
                  >
                    More
                  </button>
                )}
              </p>
              
              {task.type === 'report' && (
                <div style={{ marginBottom: '16px' }}>
                  <button 
                    onClick={() => onOpenFiles(task)} 
                    style={styles.viewReportsBtn}
                  >
                    <FileText size={16} />
                    View Reports
                    {task.files?.length > 0 && (
                      <span style={styles.fileBadge}>{task.files.length}</span>
                    )}
                  </button>
                </div>
              )}

              {isAdmin && (
                <div style={styles.footer}>
                  <select 
                    style={styles.statusSelect}
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                  >
                    <option value="pending">Yet to start</option>
                    <option value="progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Centered Modal for Full Description */}
      {selectedDescriptionTask && (
        <div style={styles.modalOverlay} onClick={() => setSelectedDescriptionTask(null)}>
          <div 
            className="glass-panel animate-fade-in" 
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.topDate}>{formatDateTime(selectedDescriptionTask.date)}</span>
                <div className={`status-badge ${selectedDescriptionTask.status}`} style={{ ...styles.badgeWrapper, width: 'fit-content', marginTop: '6px', marginBottom: '8px' }}>
                  {getStatusIcon(selectedDescriptionTask.status)}
                  {selectedDescriptionTask.status === 'pending' ? 'Yet to start' : selectedDescriptionTask.status.replace('-', ' ')}
                </div>
                <h2 style={styles.modalTitle}>{selectedDescriptionTask.title}</h2>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedDescriptionTask(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <h4 style={styles.modalSectionLabel}>Task Description</h4>
              <div style={styles.fullDescriptionText}>
                {renderFormattedText(selectedDescriptionTask.description)}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button className="btn-secondary" onClick={() => setSelectedDescriptionTask(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
  topDate: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
    letterSpacing: '0.02em',
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
  moreBtn: {
    color: '#818cf8',
    fontWeight: '600',
    fontSize: '0.85rem',
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    padding: '2px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    marginLeft: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    width: '100%',
    maxWidth: '650px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '28px',
    backgroundColor: '#151821',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '20px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
  },
  modalTitle: {
    fontSize: '1.4rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeBtn: {
    padding: '6px',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
  },
  modalBody: {
    overflowY: 'auto',
    flex: 1,
    paddingRight: '6px',
  },
  modalSectionLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '10px',
  },
  fullDescriptionText: {
    color: 'var(--text-primary)',
    fontSize: '1rem',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
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
  },
  viewReportsBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '10px',
    color: 'var(--accent-primary)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    justifyContent: 'center',
  },
  fileBadge: {
    backgroundColor: 'var(--accent-primary)',
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '12px',
    marginLeft: '4px',
  }
};

