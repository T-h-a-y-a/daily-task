import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import * as mammoth from 'mammoth';
import * as Diff from 'diff';

export default function ComparisonViewer({ file1, file2, onClose }) {
  const [diffs, setDiffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processFiles = async () => {
      try {
        setLoading(true);
        const text1 = await extractText(file1);
        const text2 = await extractText(file2);

        const diffResult = Diff.diffWordsWithSpace(text1, text2);
        setDiffs(diffResult);
        setLoading(false);
      } catch (err) {
        console.error('Error comparing files:', err);
        setError('Failed to compare files. Please ensure they are valid text or .docx files.');
        setLoading(false);
      }
    };

    processFiles();
  }, [file1, file2]);

  const extractText = async (file) => {
    if (!file || !file.data) return '';
    
    // Check if it's base64 data URL
    const parts = file.data.split(',');
    let base64Data = parts.length > 1 ? parts[1] : parts[0];
    let mimeType = parts.length > 1 ? parts[0].split(':')[1].split(';')[0] : '';

    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    // Determine type by extension or mimetype
    const isDocx = file.name.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (isDocx) {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || '';
    } else {
      // Try to parse as normal text
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(bytes);
    }
  };

  return (
    <div style={styles.overlay} className="animate-fade-in">
      <div className="glass-panel resp-modal resp-modal-large" style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>File Comparison</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.fileInfo}>
          <div style={styles.fileBadge}>
            <span style={{ color: '#ef4444' }}>-</span> {file1.name}
          </div>
          <div style={styles.fileBadge}>
            <span style={{ color: '#10b981' }}>+</span> {file2.name}
          </div>
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
              <p>Analyzing files...</p>
            </div>
          ) : error ? (
            <div style={styles.errorContainer}>
              <p>{error}</p>
            </div>
          ) : (
            <div style={styles.diffViewer}>
              {diffs.map((part, index) => {
                const color = part.added ? '#10b981' : part.removed ? '#ef4444' : 'inherit';
                const backgroundColor = part.added ? 'rgba(16, 185, 129, 0.1)' : part.removed ? 'rgba(239, 68, 68, 0.1)' : 'transparent';
                const textDecoration = part.removed ? 'line-through' : 'none';
                
                return (
                  <span 
                    key={index} 
                    style={{ 
                      color, 
                      backgroundColor, 
                      textDecoration,
                      whiteSpace: 'pre-wrap',
                      padding: part.added || part.removed ? '2px 0' : '0'
                    }}
                  >
                    {part.value}
                  </span>
                );
              })}
            </div>
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
    zIndex: 1100,
    padding: '20px',
  },
  modal: {
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '1000px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
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
  fileInfo: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  fileBadge: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: 'var(--bg-main)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    padding: '20px',
    minHeight: '300px',
  },
  diffViewer: {
    fontFamily: 'monospace',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    color: 'var(--text-primary)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '12px',
    color: 'var(--text-secondary)',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#ef4444',
    textAlign: 'center',
  }
};
