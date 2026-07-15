import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, Download, Trash2, Calendar, Eye, X, Loader } from 'lucide-react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export default function ReportFilesPage({ task, onBack, onSave, isAdmin }) {
  // Merge legacy file with new files array
  const legacyFile = task.fileName && task.fileData ? [{
    id: 'legacy-file',
    name: task.fileName,
    data: task.fileData,
    uploadedAt: task.date || new Date().toISOString()
  }] : [];

  const initialFiles = task.files?.length > 0 ? task.files : legacyFile;
  const [files, setFiles] = useState(initialFiles);
  const [previewFile, setPreviewFile] = useState(null);
  const [convertedHtml, setConvertedHtml] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef(null);

  // Convert DOCX/XLSX to HTML when previewFile changes
  useEffect(() => {
    if (!previewFile) {
      setConvertedHtml('');
      setIsConverting(false);
      return;
    }

    const ext = previewFile.name.split('.').pop().toLowerCase();

    if (['docx', 'doc'].includes(ext)) {
      setIsConverting(true);
      // Convert base64 to ArrayBuffer
      const base64 = previewFile.data.split(',')[1];
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
        .then(result => {
          setConvertedHtml(result.value);
          setIsConverting(false);
        })
        .catch(() => {
          setConvertedHtml('<p style="color:#888;">Unable to parse this document.</p>');
          setIsConverting(false);
        });
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      setIsConverting(true);
      try {
        const base64 = previewFile.data.split(',')[1];
        const workbook = XLSX.read(base64, { type: 'base64' });
        let html = '';
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          html += `<h3 style="margin:0 0 12px 0;color:#a78bfa;font-size:1.1rem;">${sheetName}</h3>`;
          html += XLSX.utils.sheet_to_html(sheet, { editable: false });
          html += '<br/>';
        });
        setConvertedHtml(html);
        setIsConverting(false);
      } catch {
        setConvertedHtml('<p style="color:#888;">Unable to parse this spreadsheet.</p>');
        setIsConverting(false);
      }
    } else {
      setConvertedHtml('');
      setIsConverting(false);
    }
  }, [previewFile]);

  // Group files by date
  const groupedFiles = {};
  [...files].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).forEach(file => {
    const dateKey = new Date(file.uploadedAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!groupedFiles[dateKey]) groupedFiles[dateKey] = [];
    groupedFiles[dateKey].push(file);
  });

  const API_URL = import.meta.env.VITE_API_URL || '';

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const newFile = {
        id: crypto.randomUUID(),
        name: file.name,
        data: event.target.result,
        uploadedAt: new Date().toISOString()
      };

      try {
        const res = await fetch(`${API_URL}/api/tasks/${task.id}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newFile)
        });
        if (res.ok) {
          const updatedTask = await res.json();
          setFiles(updatedTask.files || [...files, newFile]);
          onSave({ files: updatedTask.files });
        } else {
          alert('Failed to upload file. Please try again.');
        }
      } catch (err) {
        console.error('Error uploading file:', err);
        alert('Failed to upload file. Please try again.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await fetch(`${API_URL}/api/tasks/${task.id}/files/${fileId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setFiles(updatedTask.files || files.filter(f => f.id !== fileId));
        onSave({ files: updatedTask.files });
      } else {
        alert('Failed to delete file. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Failed to delete file. Please try again.');
    }
  };

  const getFileExtension = (fileName) => {
    return fileName.split('.').pop().toUpperCase();
  };

  const getExtColor = (ext) => {
    const colors = {
      'PDF': '#ef4444',
      'DOCX': '#3b82f6',
      'DOC': '#3b82f6',
      'XLSX': '#22c55e',
      'XLS': '#22c55e',
      'CSV': '#22c55e',
      'PNG': '#a855f7',
      'JPG': '#a855f7',
      'JPEG': '#a855f7',
      'TXT': '#6b7280',
    };
    return colors[ext] || '#6366f1';
  };

  const getMimeType = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeMap = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'html': 'text/html',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
    };
    return mimeMap[ext] || 'application/octet-stream';
  };

  const isPreviewable = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'txt', 'csv', 'html'].includes(ext);
  };

  // Render the inline file preview
  const renderPreview = (file) => {
    const mime = getMimeType(file.name);
    const ext = file.name.split('.').pop().toLowerCase();

    if (mime.startsWith('image/')) {
      return (
        <div style={styles.previewImageWrap}>
          <img src={file.data} alt={file.name} style={styles.previewImage} />
        </div>
      );
    }

    if (mime === 'application/pdf') {
      return (
        <iframe
          src={file.data}
          style={styles.previewIframe}
          title={file.name}
        />
      );
    }

    if (['txt', 'csv', 'html'].includes(ext)) {
      // Decode base64 text content
      const base64Data = file.data.split(',')[1];
      let textContent = '';
      try {
        textContent = atob(base64Data);
      } catch {
        textContent = 'Unable to decode file content.';
      }
      return (
        <pre style={styles.previewText}>{textContent}</pre>
      );
    }

    // For DOCX, DOC, XLSX, XLS — render converted HTML content
    if (['docx', 'doc', 'xlsx', 'xls'].includes(ext)) {
      if (isConverting) {
        return (
          <div style={styles.previewFallback}>
            <Loader size={40} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)', marginTop: '16px' }}>Converting document...</p>
          </div>
        );
      }
      return (
        <div
          className="doc-preview-wrap"
          style={styles.docPreviewContent}
          dangerouslySetInnerHTML={{ __html: convertedHtml }}
        />
      );
    }

    return (
      <div style={styles.previewFallback}>
        <FileText size={64} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Preview is not available for this file type.</p>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={styles.page}>
      {/* Preview Overlay */}
      {previewFile && (
        <div style={styles.previewOverlay} onClick={() => setPreviewFile(null)}>
          <div style={styles.previewPanel} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewHeader}>
              <div style={styles.previewTitleArea}>
                <FileText size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <h3 style={styles.previewTitle}>{previewFile.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a
                  href={previewFile.data}
                  download={previewFile.name}
                  style={styles.previewDownloadBtn}
                  title="Download"
                >
                  <Download size={16} />
                </a>
                <button style={styles.previewCloseBtn} onClick={() => setPreviewFile(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div style={styles.previewBody}>
              {renderPreview(previewFile)}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={styles.topBar}>
        <button onClick={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} />
          <span>Back to Tasks</span>
        </button>
      </div>

      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>{task.title}</h1>
          <p style={styles.pageSubtitle}>{task.description}</p>
        </div>
        {isAdmin && (
          <div style={styles.headerActions}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
              style={styles.uploadBtn}
            >
              <Upload size={18} />
              Upload Files
            </button>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div className="glass-panel" style={styles.statCard}>
          <FileText size={22} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <div style={styles.statValue}>{files.length}</div>
            <div style={styles.statLabel}>Total Files</div>
          </div>
        </div>
        <div className="glass-panel" style={styles.statCard}>
          <Calendar size={22} style={{ color: '#a855f7' }} />
          <div>
            <div style={styles.statValue}>{Object.keys(groupedFiles).length}</div>
            <div style={styles.statLabel}>Upload Days</div>
          </div>
        </div>
      </div>

      {/* Files Content */}
      <div style={styles.filesContent}>
        {files.length === 0 ? (
          <div className="glass-panel" style={styles.emptyState}>
            <div style={styles.emptyIconWrap}>
              <FileText size={56} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 style={{ marginBottom: '8px', fontSize: '1.2rem' }}>No files uploaded yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              {isAdmin ? 'Upload your first report file to get started.' : 'No reports have been uploaded for this task yet.'}
            </p>
            {isAdmin && (
              <button
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
                style={styles.uploadBtn}
              >
                <Upload size={18} />
                Upload Files
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedFiles).map(([dateKey, dateFiles]) => (
            <div key={dateKey} style={styles.dateGroup}>
              <div style={styles.dateHeader}>
                <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
                <span>{dateKey}</span>
                <span style={styles.fileCount}>{dateFiles.length} file{dateFiles.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={styles.fileGrid}>
                {dateFiles.map(file => {
                  const ext = getFileExtension(file.name);
                  const extColor = getExtColor(ext);
                  return (
                    <div key={file.id} className="glass-panel" style={styles.fileCard}>
                      <div style={{ ...styles.fileExtBadge, backgroundColor: extColor + '20', color: extColor }}>
                        {ext}
                      </div>
                      <div style={styles.fileInfo}>
                        <div style={styles.fileName} title={file.name}>{file.name}</div>
                        <div style={styles.fileTime}>
                          {new Date(file.uploadedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div style={styles.fileActions}>
                        {/* View button — opens inline preview */}
                        <button
                          style={styles.viewFileBtn}
                          onClick={() => setPreviewFile(file)}
                          title="View file"
                        >
                          <Eye size={16} />
                        </button>
                        {/* Download button — for client to download */}
                        <a
                          href={file.data}
                          download={file.name}
                          style={styles.downloadFileBtn}
                          title="Download file"
                        >
                          <Download size={16} />
                        </a>
                        {/* Delete — admin only */}
                        {isAdmin && (
                          <button
                            style={styles.deleteFileBtn}
                            onClick={() => handleDeleteFile(file.id)}
                            title="Delete file"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '6px',
    letterSpacing: '-0.02em',
  },
  pageSubtitle: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
    maxWidth: '500px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  uploadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  statsBar: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '18px 24px',
    minWidth: '180px',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    lineHeight: '1',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  filesContent: {
    flex: 1,
  },
  emptyState: {
    padding: '60px 40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  dateGroup: {
    marginBottom: '28px',
  },
  dateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '14px',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  fileCount: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: '400',
    marginLeft: '4px',
  },
  fileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '14px',
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px 20px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'default',
  },
  fileExtBadge: {
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: '0.95rem',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '4px',
  },
  fileTime: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  fileActions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  viewFileBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#818cf8',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  downloadFileBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  deleteFileBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  /* Preview overlay styles */
  previewOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '24px',
    animation: 'fadeIn 0.2s ease',
  },
  previewPanel: {
    width: '90vw',
    maxWidth: '1100px',
    height: '85vh',
    backgroundColor: 'var(--bg-main, #0f1117)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-color)',
    flexShrink: 0,
  },
  previewTitleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  previewTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  previewDownloadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  previewCloseBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'var(--text-primary)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  previewBody: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  previewImageWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  previewIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  previewText: {
    width: '100%',
    padding: '20px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    overflow: 'auto',
    margin: 0,
  },
  previewFallback: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: '40px',
  },
  docPreviewContent: {
    width: '100%',
    padding: '32px 40px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    color: '#1a1a2e',
    fontSize: '1rem',
    lineHeight: '1.8',
    fontFamily: "'Georgia', 'Times New Roman', serif",
    overflow: 'auto',
    minHeight: '200px',
  },
};

/* Inject global styles for document preview tables and spin animation */
const styleTag = document.createElement('style');
styleTag.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .doc-preview-wrap table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
  }
  .doc-preview-wrap th,
  .doc-preview-wrap td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
    font-size: 0.9rem;
  }
  .doc-preview-wrap th {
    background-color: #f0f0f5;
    font-weight: 600;
  }
  .doc-preview-wrap tr:nth-child(even) {
    background-color: #f8f8fc;
  }
  .doc-preview-wrap h1, .doc-preview-wrap h2, .doc-preview-wrap h3 {
    color: #1a1a2e;
    margin: 16px 0 8px 0;
  }
  .doc-preview-wrap p {
    margin: 8px 0;
  }
  .doc-preview-wrap img {
    max-width: 100%;
    height: auto;
  }
`;
if (!document.querySelector('#report-preview-styles')) {
  styleTag.id = 'report-preview-styles';
  document.head.appendChild(styleTag);
}
