import { useState } from 'react';
import { Edit2, Trash2, Clock, CheckCircle2, CircleDashed, MessageSquare, FileText, X, Folder } from 'lucide-react';

const COLUMNS = [
  {
    id: 'pending',
    title: 'Yet to Start',
    icon: Clock,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  {
    id: 'progress',
    title: 'In Progress',
    icon: CircleDashed,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  {
    id: 'completed',
    title: 'Completed',
    icon: CheckCircle2,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
];

export default function TaskBoard({ tasks, currentUser, isAdmin, onEdit, onOpenComments, onDelete, onStatusChange, onUpdateTask, onOpenFiles }) {
  const [selectedDescriptionTask, setSelectedDescriptionTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} />;
      case 'progress': return <CircleDashed size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'progress': return 'In Progress';
      default: return 'Yet to start';
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

  return (
    <>
      <div className="task-columns-grid">
        {COLUMNS.map((col) => {
          const IconComp = col.icon;
          const columnTasks = tasks.filter(t => t.type !== 'report' && (t.status || 'pending') === col.id);
          const isDragOver = dragOverColumn === col.id;

          return (
            <div 
              key={col.id} 
              style={{
                ...styles.columnContainer,
                ...(isDragOver ? { borderColor: col.color, backgroundColor: 'rgba(255, 255, 255, 0.05)' } : {})
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(col.id);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId) {
                  onStatusChange(taskId, col.id);
                }
              }}
            >
              {/* Column Header */}
              <div style={{ ...styles.columnHeader, borderBottomColor: col.borderColor }}>
                <div style={styles.columnHeaderTitle}>
                  <div style={{ ...styles.columnIconWrapper, backgroundColor: col.bgColor, color: col.color }}>
                    <IconComp size={18} />
                  </div>
                  <h3 style={styles.columnTitleText}>{col.title}</h3>
                </div>
                <span style={{ ...styles.columnBadge, backgroundColor: col.bgColor, color: col.color, border: `1px solid ${col.borderColor}` }}>
                  {columnTasks.length}
                </span>
              </div>

              {/* Column Task List */}
              <div className="custom-scrollbar" style={styles.columnTaskList}>
                {columnTasks.length === 0 ? (
                  <div style={styles.emptyColumn}>
                    <IconComp size={28} style={{ color: col.color, opacity: 0.4, marginBottom: '8px' }} />
                    <span style={styles.emptyColumnText}>No tasks in {col.title}</span>
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const isLongDescription = task.description && (task.description.length > 70 || task.description.includes('\n'));
                    const displayDescription = isLongDescription 
                      ? task.description.slice(0, 70).replace(/\n/g, ' ') + '...'
                      : task.description;

                    return (
                      <div 
                        key={task.id} 
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id);
                        }}
                        className="glass-panel" 
                        style={styles.card}
                      >
                        <div style={styles.cardHeader}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <span style={styles.topDate}>{formatDateTime(task.date)}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                              <div className={`status-badge ${task.status}`} style={styles.badgeWrapper}>
                                {getStatusIcon(task.status)}
                                {getStatusLabel(task.status)}
                              </div>
                              {task.project && (
                                <span style={styles.projectPill} title={`Project: ${task.project}`}>
                                  <Folder size={11} /> {task.project}
                                </span>
                              )}
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
                              <MessageSquare size={15} />
                            </button>

                            {isAdmin && (
                              <>
                                <button style={styles.actionBtn} onClick={() => onEdit(task)} title="Edit Task">
                                  <Edit2 size={15} />
                                </button>
                                <button style={{ ...styles.actionBtn, color: '#ef4444' }} onClick={() => onDelete(task.id)} title="Delete Task">
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <h3 style={styles.title}>{task.title}</h3>
                        {task.description && (
                          <p style={styles.description}>
                            {renderFormattedText(displayDescription)}
                            {isLongDescription && (
                              <button 
                                style={styles.moreBtn} 
                                onClick={() => setSelectedDescriptionTask(task)}
                                title="View full task details"
                              >
                                More Details
                              </button>
                            )}
                          </p>
                        )}
                        
                        {task.type === 'report' && (
                          <div style={{ marginBottom: '12px' }}>
                            <button 
                              onClick={() => onOpenFiles(task)} 
                              style={styles.viewReportsBtn}
                            >
                              <FileText size={15} />
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
                              className="input-field status-select" 
                              value={task.status || 'pending'} 
                              onChange={(e) => onStatusChange(task.id, e.target.value)}
                              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            >
                              <option value="pending">Yet to start</option>
                              <option value="progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
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

      {/* Description Viewer Modal */}
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
                  {getStatusLabel(selectedDescriptionTask.status)}
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
  columnContainer: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(25, 28, 36, 0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--border-color)',
    borderRadius: '18px',
    padding: '14px',
    height: 'calc(100vh - 210px)',
    minHeight: '480px',
    maxHeight: '750px',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    marginBottom: '12px',
    borderBottom: '1px solid var(--border-color)',
  },
  columnHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  columnIconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: '8px',
  },
  columnTitleText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  columnBadge: {
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '3px 9px',
    borderRadius: '12px',
  },
  columnTaskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
    overflowY: 'auto',
    paddingRight: '6px',
  },
  emptyColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 16px',
    border: '2px dashed rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    color: 'var(--text-muted)',
    height: '100%',
    minHeight: '180px',
  },
  emptyColumnText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  card: {
    padding: '13px 15px',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'grab',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  topDate: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
    letterSpacing: '0.02em',
  },
  badgeWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.7rem',
    padding: '2px 7px',
  },
  actions: {
    display: 'flex',
    gap: '5px',
  },
  actionBtn: {
    padding: '5px',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: '0.98rem',
    fontWeight: '600',
    marginBottom: '6px',
    lineHeight: '1.35',
  },
  description: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    lineHeight: '1.45',
    flex: 1,
    marginBottom: '10px',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
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
    paddingTop: '14px',
    marginTop: 'auto',
  },
  statusSelect: {
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    width: '100%',
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
  },
  projectPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: '3px 8px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  }
};


