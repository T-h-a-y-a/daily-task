import { useState, useRef } from 'react';
import { X, Send, Trash2, Paperclip, Download, Mic, Square, Eye, Edit2, Loader } from 'lucide-react';

export default function CommentModal({ task, currentUser, onClose, onSave }) {
  if (!task) return null;

  // Ensure comments is an array (handle legacy string comments if any)
  const initialComments = Array.isArray(task.comments) 
    ? task.comments 
    : (typeof task.comments === 'string' && task.comments.trim() !== '' 
        ? [{ id: 'legacy', text: task.comments, authorId: currentUser?.id || 'admin', authorName: currentUser?.username || 'Admin', createdAt: new Date().toISOString() }] 
        : []);

  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [visibleTranscripts, setVisibleTranscripts] = useState({});
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const fileInputRef = useRef(null);

  const toggleTranscript = (commentId) => {
    setVisibleTranscripts(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const accumulatedSpeechRef = useRef('');
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
          showToast('Voice note recorded & converted to text!');
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      isRecordingRef.current = true;
      accumulatedSpeechRef.current = newComment ? newComment.trim() + ' ' : '';

      // Speech-to-Text conversion using Web Speech API with Auto-Restart for continuous listening
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const setupRecognition = () => {
          try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = navigator.language || 'en-US';

            recognition.onresult = (event) => {
              let currentFinal = '';
              let currentInterim = '';

              for (let i = 0; i < event.results.length; i++) {
                const res = event.results[i];
                if (res.isFinal) {
                  currentFinal += res[0].transcript + ' ';
                } else {
                  currentInterim += res[0].transcript;
                }
              }

              if (currentFinal) {
                accumulatedSpeechRef.current += currentFinal;
              }

              const displayText = (accumulatedSpeechRef.current + currentInterim).trim();
              if (displayText) {
                setNewComment(displayText);
              }
            };

            recognition.onend = () => {
              // Automatically restart speech recognition if recording is still active in Chrome
              if (isRecordingRef.current) {
                try {
                  recognition.start();
                } catch (e) {}
              }
            };

            recognition.onerror = (err) => {
              console.warn('Speech recognition error:', err.error);
            };

            recognitionRef.current = recognition;
            recognition.start();
          } catch (speechErr) {
            console.warn('SpeechRecognition setup error:', speechErr);
          }
        };

        setupRecognition();
      }

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showToast('Microphone permission updated! Please click the blue "Reload" button at the top of your browser bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        showToast('No microphone device found on your computer or phone.');
      } else {
        showToast('Microphone error: ' + (err.message || 'Access denied or unavailable'));
      }
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
      }
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
    if ((!newComment.trim() && !attachment) || isSubmittingComment || isUploading) return;

    setIsSubmittingComment(true);
    let fileName = null;
    let fileUrl = null;

    try {
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
        authorId: currentUser?.id || 'admin',
        authorName: currentUser?.username || 'Admin',
        createdAt: new Date().toISOString(),
        ...(fileName ? { fileName, fileData: fileUrl } : {})
      };

      const updatedComments = [...comments, comment];
      setComments(updatedComments);
      setNewComment('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await onSave({ comments: updatedComments, readBy: [currentUser?.id || 'admin'] });
    } catch (commentErr) {
      console.error('Error saving comment:', commentErr);
    } finally {
      setIsSubmittingComment(false);
    }
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

  const isWithinFourHours = (dateString) => {
    if (!dateString) return false;
    const commentDate = new Date(dateString).getTime();
    if (isNaN(commentDate)) return false;
    const now = Date.now();
    return (now - commentDate) <= 4 * 60 * 60 * 1000;
  };

  const canDeleteOrEdit = (c) => {
    if (!c) return false;
    if (currentUser?.role === 'admin') return true;
    return c.authorId === currentUser?.id && isWithinFourHours(c.createdAt);
  };

  const handleRemoveAttachment = (commentId) => {
    const updatedComments = comments.map(c => {
      if (c.id === commentId) {
        const copy = { ...c };
        delete copy.fileName;
        delete copy.fileData;
        return copy;
      }
      return c;
    });
    setComments(updatedComments);
    onSave({ comments: updatedComments, readBy: [currentUser.id] });
    showToast('Attached file deleted');
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
        
        <p style={styles.taskTitle}>
          Task: {task.title}
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            ℹ️ Comments & uploaded files can be edited/deleted within 4 hours.
          </span>
        </p>

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
                    {canDeleteOrEdit(c) && (
                      <>
                        <button 
                          type="button"
                          onClick={() => {
                            if (editingCommentId === c.id) {
                              setEditingCommentId(null);
                            } else {
                              setEditingCommentId(c.id);
                              setEditingText(c.text || '');
                            }
                          }} 
                          style={styles.editBtn}
                          title="Edit Comment"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteComment(c.id)} 
                          style={styles.deleteBtn}
                          title="Delete Comment (Allowed within 4 hours)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingCommentId === c.id ? (
                  /* Edit Mode Active */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <textarea
                      className="input-field"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{ resize: 'vertical', minHeight: '65px' }}
                      placeholder="Edit your comment..."
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => setEditingCommentId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                        onClick={() => {
                          handleUpdateComment(c.id, editingText);
                          setEditingCommentId(null);
                          showToast('Comment has been updated');
                        }}
                      >
                        Update Comment
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal Read-Only Message View */
                  <div style={styles.commentBubble}>
                    {c.text && <div style={{ marginBottom: c.fileName ? '8px' : '0' }}>{c.text}</div>}
                    {c.fileName && c.fileData && (
                      isAudioFile(c.fileName, c.fileData) ? (
                        <div style={styles.voiceCard}>
                          <div style={styles.voiceHeader}>
                            <Mic size={16} color="var(--accent-primary)" />
                            <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>Voice Note</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                            <audio 
                              controls 
                              src={c.fileData.startsWith('/uploads') ? `${API_URL}${c.fileData}` : c.fileData} 
                              style={{ flex: '1', minWidth: '220px', maxWidth: '340px', height: '38px', borderRadius: '8px' }}
                            />
                            <button
                              type="button"
                              onClick={() => toggleTranscript(c.id)}
                              style={styles.viewTranscriptBtn}
                              title="Click to view audio in text format"
                            >
                              <Eye size={14} />
                              {visibleTranscripts[c.id] ? 'Hide' : 'View'}
                            </button>
                          </div>

                          {visibleTranscripts[c.id] && (
                            <div style={styles.transcriptBox}>
                              <div style={styles.transcriptLabel}>Audio Text Format:</div>
                              <div style={styles.transcriptText}>
                                {c.text && c.text.trim() ? c.text : 'No text transcript recorded for this voice note.'}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                            <a 
                              href={c.fileData.startsWith('/uploads') ? `${API_URL}${c.fileData}` : c.fileData} 
                              download={c.fileName} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={styles.voiceDownloadBtn}
                            >
                              <Download size={14} />
                              Download Voice Note ({c.fileName})
                            </a>

                            {canDeleteOrEdit(c) && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(c.id)}
                                style={styles.voiceRemoveBtn}
                                title="Delete file attachment (within 4 hours)"
                              >
                                <Trash2 size={12} />
                                Remove File
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
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
                          {canDeleteOrEdit(c) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(c.id)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                color: '#ef4444',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Delete file attachment (within 4 hours)"
                            >
                              <Trash2 size={12} />
                              Remove File
                            </button>
                          )}
                        </div>
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

          {/* Voice Note Live Audio Preview Player */}
          {attachment && isAudioFile(attachment.name, attachment.data) && (
            <div style={{
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mic size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Voice Note Preview (Click Play to listen):
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '220px', justifyContent: 'flex-end' }}>
                <audio controls src={attachment.data} style={{ height: '36px', width: '100%', maxWidth: '280px', borderRadius: '6px' }} />
                <button
                  type="button"
                  onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  style={{
                    padding: '6px 10px',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}
                  title="Remove recorded voice note"
                >
                  <X size={14} /> Remove
                </button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', alignSelf: 'flex-end', flexWrap: 'wrap' }}>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileSelect}
            />

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
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ ...styles.submitBtn, display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: (isUploading || isSubmittingComment) ? 0.7 : 1 }} 
              disabled={(!newComment.trim() && !attachment) || isUploading || isSubmittingComment}
            >
              {isUploading || isSubmittingComment ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  {isUploading ? 'Uploading...' : 'Posting...'}
                </>
              ) : (
                <>
                  <Send size={16} />
                  Post Comment
                </>
              )}
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
  editBtn: {
    background: 'none',
    border: 'none',
    color: '#818cf8',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
    transition: 'opacity 0.2s',
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
  },
  voiceCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    borderRadius: '12px',
    padding: '14px',
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  voiceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  voiceDownloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: 'var(--accent-primary)',
    textDecoration: 'none',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  voiceRemoveBtn: {
    padding: '6px 12px',
    fontSize: '0.8rem',
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  viewTranscriptBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
  },
  transcriptBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderLeft: '4px solid var(--accent-primary)',
    borderRadius: '8px',
    padding: '12px 14px',
    marginTop: '8px'
  },
  transcriptLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--accent-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px'
  },
  transcriptText: {
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap'
  }
};
