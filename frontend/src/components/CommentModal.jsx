import { useState, useRef } from 'react';
import { X, Send, Trash2, Paperclip, Download, Mic, Square } from 'lucide-react';

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
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || '';

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result;
          const now = new Date();
          const timestamp = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
          setAttachment({
            name: `Voice_Note_${timestamp}.webm`,
            data: base64Audio
          });
          showToast('Voice note recorded and attached!');
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      showToast('Microphone access denied or unavailable');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isAudioFile = (fileName, fileData) => {
    if (!fileName && !fileData) return false;
    const name = (fileName || '').toLowerCase();
    const data = (fileData || '').toLowerCase();
    return name.endsWith('.webm') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.m4a') || data.startsWith('data:audio') || (data.includes('/uploads/') && (name.includes('voice') || name.endsWith('.webm') || name.endsWith('.mp3') || name.endsWith('.wav')));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check size limit: max 30MB
    if (file.size > 30 * 1024 * 1024) {
      showToast('File must be smaller than 30MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        name: file.name,
        data: event.target.result
      });
      showToast(`Attached: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !attachment) return;

    let fileName = null;
    let fileUrl = null;

    if (attachment) {
      setIsUploading(true);
      fileName = attachment.name;
      fileUrl = attachment.data; // default fallback

      try {
        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: attachment.name, data: attachment.data })
        });
        if (res.ok) {
          const result = await res.json();
          fileUrl = result.fileUrl;
        }
      } catch (err) {
        console.error('Error uploading file to server:', err);
      } finally {
        setIsUploading(false);
      }
    }

    const comment = {
      id: crypto.randomUUID(),
      text: newComment.trim(),
      authorId: currentUser.id,
      authorName: currentUser.username,
      createdAt: new Date().toISOString(),
      ...(fileName ? { fileName, fileData: fileUrl } : {})
    };

    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    setNewComment('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea
                      className="input-field"
                      value={c.text}
                      onChange={(e) => handleUpdateComment(c.id, e.target.value)}
                      onBlur={() => showToast('Comment has been updated')}
                      style={{ resize: 'vertical', minHeight: '60px' }}
                      placeholder="Write a comment..."
                    />
                    {c.fileName && c.fileData && (
                      isAudioFile(c.fileName, c.fileData) ? (
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <audio 
                            controls 
                            src={c.fileData.startsWith('/uploads') ? `${API_URL}${c.fileData}` : c.fileData} 
                            style={{ width: '100%', maxWidth: '320px', height: '38px', borderRadius: '8px' }}
                          />
                          <a 
                            href={c.fileData.startsWith('/uploads') ? `${API_URL}${c.fileData}` : c.fileData} 
                            download={c.fileName} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={styles.attachmentLink}
                          >
                            <Download size={14} />
                            Download Voice Note ({c.fileName})
                          </a>
                        </div>
                      ) : (
                        <a 
                          href={c.fileData.startsWith('/uploads') ? `${API_URL}${c.fileData}` : c.fileData} 
                          download={c.fileName} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={styles.attachmentLink}
                        >
                          <Download size={14} />
                          {c.fileName}
                        </a>
                      )
                    )}
                  </div>
                ) : (
                  <div style={styles.commentBubble}>
                    {c.text && <div style={{ marginBottom: c.fileName ? '8px' : '0' }}>{c.text}</div>}
                    {c.fileName && c.fileData && (
                      isAudioFile(c.fileName, c.fileData) ? (
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <audio 
                            controls 
                            src={c.fileData.startsWith('/uploads') ? `${API_URL}${c.fileData}` : c.fileData} 
                            style={{ width: '100%', maxWidth: '320px', height: '38px', borderRadius: '8px' }}
                          />
                          <a 
                            href={c.fileData.startsWith('/uploads') ? `${API_URL}${c.fileData}` : c.fileData} 
                            download={c.fileName} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={styles.attachmentLink}
                          >
                            <Download size={14} />
                            Download Voice Note ({c.fileName})
                          </a>
                        </div>
                      ) : (
                        <a 
                          href={c.fileData.startsWith('/uploads') ? `${API_URL}${c.fileData}` : c.fileData} 
                          download={c.fileName} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={styles.attachmentLink}
                        >
                          <Download size={14} />
                          {c.fileName}
                        </a>
                      )
                    )}
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', alignSelf: 'flex-end', flexWrap: 'wrap' }}>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileSelect}
            />

            {/* Voice Record Button */}
            {isRecording ? (
              <button 
                type="button" 
                className="btn-secondary" 
                style={styles.recordingBtn}
                onClick={stopRecording}
                title="Click to stop recording"
              >
                <Square size={14} fill="#ef4444" color="#ef4444" />
                <span>Stop ({formatTime(recordingTime)})</span>
              </button>
            ) : (
              <button 
                type="button" 
                className="btn-secondary" 
                style={styles.micBtn}
                onClick={startRecording}
                title="Record Voice Note"
                disabled={isUploading}
              >
                <Mic size={16} />
                Voice
              </button>
            )}

            {/* File Attachment Button */}
            {attachment ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={styles.attachBtnActive}
                  onClick={() => fileInputRef.current?.click()}
                  title={attachment.name}
                >
                  <Paperclip size={16} />
                  {attachment.name.length > 18 ? attachment.name.slice(0, 18) + '...' : attachment.name}
                </button>
                <button
                  type="button"
                  onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  style={{ padding: '6px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Remove Attachment"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                className="btn-secondary" 
                style={styles.attachBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Attach File (Max 30MB)"
              >
                <Paperclip size={16} />
                Attach File
              </button>
            )}
            <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={(!newComment.trim() && !attachment) || isUploading || isRecording}>
              <Send size={16} />
              {isUploading ? 'Uploading...' : 'Post Comment'}
            </button>
          </div>
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
    marginBottom: '16px'
  },
  attachBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    fontSize: '0.85rem'
  },
  micBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  recordingBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.4)',
  },
  attachBtnActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    border: 'none'
  },
  attachmentLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    padding: '6px 12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'var(--accent-primary)',
    textDecoration: 'none',
    fontSize: '0.8rem',
    fontWeight: '500'
  }
};
