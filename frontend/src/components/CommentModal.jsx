import { useState } from 'react';
import { X, Send, Trash2 } from 'lucide-react';

export default function CommentModal({ task, currentUser, onClose, onSave }) {
  // Ensure comments is an array (handle legacy string comments if any)
  const initialComments = Array.isArray(task.comments) 
    ? task.comments 
    : (typeof task.comments === 'string' && task.comments.trim() !== '' 
        ? [{ id: 'legacy', text: task.comments, authorId: currentUser.id, authorName: currentUser.username, createdAt: new Date().toISOString() }] 
        : []);

  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = {
      id: crypto.randomUUID(),
      text: newComment.trim(),
      authorId: currentUser.id,
      authorName: currentUser.username,
      createdAt: new Date().toISOString()
    };

    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    setNewComment('');
    onSave({ comments: updatedComments, readBy: [currentUser.id] });
  };

  const handleUpdateComment = (commentId, newText) => {
    const updatedComments = comments.map(c => 
      c.id === commentId ? { ...c, text: newText } : c
    );
    setComments(updatedComments);
    onSave({ comments: updatedComments, readBy: [currentUser.id] });
  };

  const handleDeleteComment = (commentId) => {
    const updatedComments = comments.filter(c => c.id !== commentId);
    setComments(updatedComments);
    onSave({ comments: updatedComments, readBy: [currentUser.id] });
    showToast('Comment deleted');
  };

  const isWithinOneHour = (dateString) => {
    const commentDate = new Date(dateString).getTime();
    const now = Date.now();
    return (now - commentDate) <= 60 * 60 * 1000;
  };

  return (
    <div style={styles.overlay} className="animate-fade-in">
      <div className="glass-panel resp-modal resp-modal-large" style={{ maxHeight: '90vh' }}>
        <div style={styles.header}>
          <h2 style={styles.title}>Comments</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <p style={styles.taskTitle}>Task: {task.title}</p>

        {toastMessage && (
          <div style={styles.toast}>
            {toastMessage}
          </div>
        )}

        <div style={styles.commentsList}>
          {comments.length === 0 ? (
            <p style={styles.emptyText}>No comments yet.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} style={styles.commentItem}>
                <div style={styles.commentHeader}>
                  <span style={styles.commentAuthor}>{c.authorName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={styles.commentDate}>
                      {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    {c.authorId === currentUser.id && isWithinOneHour(c.createdAt) && (
                      <button 
                        onClick={() => handleDeleteComment(c.id)} 
                        style={styles.deleteBtn}
                        title="Delete Comment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {c.authorId === currentUser.id && isWithinOneHour(c.createdAt) ? (
                  <textarea
                    className="input-field"
                    value={c.text}
                    onChange={(e) => handleUpdateComment(c.id, e.target.value)}
                    onBlur={() => showToast('Comment has been updated')}
                    style={{ resize: 'vertical', minHeight: '60px' }}
                    placeholder="Empty comment..."
                  />
                ) : (
                  <div style={styles.commentBubble}>
                    {c.text}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddComment} style={styles.addCommentForm}>
          <textarea
            className="input-field"
            placeholder="Write a new comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{ resize: 'vertical', minHeight: '80px' }}
          />
          <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={!newComment.trim()}>
            <Send size={16} />
            Post Comment
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 17, 23, 0.8)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
    marginTop: '-8px',
  },
  closeBtn: {
    padding: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    border: 'none',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    paddingRight: '8px',
    flex: 1,
    minHeight: '200px',
  },
  emptyText: {
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '40px 0',
    fontStyle: 'italic',
  },
  commentItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px',
  },
  commentAuthor: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--accent-primary)',
  },
  commentDate: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  commentBubble: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.5',
    border: '1px solid transparent',
  },
  addCommentForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '20px',
  },
  submitBtn: {
    alignSelf: 'flex-end',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
  toast: {
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    padding: '10px 16px',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: '0.9rem',
  }
};
