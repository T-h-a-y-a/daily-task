import { useState, useRef } from 'react';
import { X, Paperclip, Download, Plus, FileText, Trash2 } from 'lucide-react';

export default function FilesModal({ task, onClose, onSave }) {
  // Merge legacy file with new files array
  const legacyFile = task.fileName && task.fileData ? [{
    id: 'legacy-file',
    name: task.fileName,
    data: task.fileData,
    uploadedAt: task.date || new Date().toISOString()
  }] : [];
  
  const initialFiles = task.files?.length > 0 ? task.files : legacyFile;
  const [files, setFiles] = useState(initialFiles);
  const fileInputRef = useRef(null);

  const isWithinFourHours = (dateString) => {
    if (!dateString) return false;
    const uploadTime = new Date(dateString).getTime();
    if (isNaN(uploadTime)) return false;
    const now = Date.now();
    return (now - uploadTime) <= 4 * 60 * 60 * 1000;
  };

  const handleDeleteFile = (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    onSave({ files: updatedFiles });
  };

  // sort files date-wise (newest first)
  const sortedFiles = [...files].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
      alert('File must be smaller than 20MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const newFile = {
        id: crypto.randomUUID(),
        name: file.name,
        data: event.target.result,
        uploadedAt: new Date().toISOString()
      };
      
      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      onSave({ files: updatedFiles });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={styles.overlay} className="animate-fade-in">
      <div className="glass-panel resp-modal resp-modal-large">
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Files for Task: {task.title}</h2>
            <p style={styles.subtitle}>Manage uploaded reports (Files can be deleted within 4 hours of upload).</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.actions}>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileSelect}
          />
          <button 
            className="btn-primary" 
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} />
            Upload File
          </button>
        </div>

        <div style={styles.filesList}>
          {sortedFiles.length === 0 ? (
            <div style={styles.emptyState}>
              <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <p>No files uploaded yet.</p>
            </div>
          ) : (
            sortedFiles.map(file => (
              <div 
                key={file.id} 
                style={styles.fileItem}
              >
                <div style={styles.fileIcon}>
                  <FileText size={24} />
                </div>
                <div style={styles.fileDetails}>
                  <div style={styles.fileName}>{file.name}</div>
                  <div style={styles.fileDate}>{new Date(file.uploadAt || file.uploadedAt).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a href={file.data} download={file.name} style={styles.downloadBtn} onClick={e => e.stopPropagation()}>
                    <Download size={18} />
                    View
                  </a>
                  {isWithinFourHours(file.uploadAt || file.uploadedAt) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                      title="Delete file (Allowed within 4 hours of upload)"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
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
    alignItems: 'flex-start',
    marginBottom: '24px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '4px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
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
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '50vh',
    overflowY: 'auto',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  fileIcon: {
    padding: '12px',
    backgroundColor: 'rgba(255,255,fff,0.05)',
    borderRadius: '8px',
    marginRight: '16px',
    color: 'var(--accent-primary)',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: '1rem',
    fontWeight: '500',
    marginBottom: '4px',
  },
  fileDate: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
  }
};
