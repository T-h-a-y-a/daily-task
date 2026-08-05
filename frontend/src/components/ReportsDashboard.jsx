import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Trash2, Calendar, Eye, X, Loader, Search, Folder } from 'lucide-react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export default function ReportsDashboard({ tasks, setTasks, currentUser, isAdmin, availableCategories = [] }) {
  // Find or collect all report tasks / files across tasks
  const reportTask = tasks.find(t => (t.category || '').toLowerCase() === 'reports' || (t.project || '').toLowerCase().includes('report')) || null;

  // Collect all files from all tasks or reportTask
  const [allFiles, setAllFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [reportTitleInput, setReportTitleInput] = useState('');
  const [targetCategoryInput, setTargetCategoryInput] = useState('Reports');
  const [previewFile, setPreviewFile] = useState(null);
  const [convertedHtml, setConvertedHtml] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || '';

  // Extract all files from tasks into a flat list with metadata
  useEffect(() => {
    const filesList = [];
    tasks.forEach(t => {
      const taskCategory = t.category || 'SEO';
      const taskProject = t.project || 'General';

      // Check files array
      if (t.files && Array.isArray(t.files)) {
        t.files.forEach(f => {
          filesList.push({
            ...f,
            taskId: t.id,
            taskTitle: t.title,
            category: taskCategory,
            project: taskProject,
            uploadedBy: f.uploadedBy || 'Admin'
          });
        });
      }
      // Check legacy fileName & fileData
      if (t.fileName && t.fileData && (!t.files || t.files.length === 0)) {
        filesList.push({
          id: `${t.id}-legacy`,
          name: t.fileName,
          data: t.fileData,
          uploadedAt: t.date || new Date().toISOString(),
          taskId: t.id,
          taskTitle: t.title,
          category: taskCategory,
          project: taskProject,
          uploadedBy: 'Admin'
        });
      }
    });

    // Sort newest first
    filesList.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
    setAllFiles(filesList);
  }, [tasks]);

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
      try {
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
      } catch {
        setConvertedHtml('<p style="color:#888;">Unable to decode document data.</p>');
        setIsConverting(false);
      }
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
        setConvertedHtml('<p style="color:#888;">Unable to parse spreadsheet.</p>');
        setIsConverting(false);
      }
    } else {
      setConvertedHtml('');
      setIsConverting(false);
    }
  }, [previewFile]);

  // File Upload Handler
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      alert('File size must be smaller than 30MB');
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileData = event.target.result;
      const newFileObj = {
        id: crypto.randomUUID(),
        name: file.name,
        data: fileData,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.username || 'Admin'
      };

      try {
        // Target or create report task
        let targetTask = reportTask;

        if (!targetTask) {
          // Create new Reports task
          const createRes = await fetch(`${API_URL}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              title: reportTitleInput.trim() || `Report: ${file.name}`,
              description: 'Uploaded report file',
              status: 'completed',
              category: targetCategoryInput || 'Reports',
              project: 'Monthly Analytics',
              date: new Date().toISOString(),
              files: [newFileObj]
            })
          });

          if (createRes.ok) {
            const created = await createRes.json();
            setTasks(prev => [created, ...prev]);
          }
        } else {
          // Append file to existing task
          const updatedFiles = [...(targetTask.files || []), newFileObj];
          const updateRes = await fetch(`${API_URL}/api/tasks/${targetTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: updatedFiles })
          });

          if (updateRes.ok) {
            const updated = await updateRes.json();
            setTasks(prev => prev.map(t => t.id === targetTask.id ? updated : t));
          }
        }
      } catch (err) {
        console.error('Error uploading report file:', err);
        alert('Failed to upload report file. Please try again.');
      } finally {
        setIsUploading(false);
        setReportTitleInput('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  // Delete File Handler
  const handleDeleteFile = async (fileToDelete) => {
    if (!window.confirm(`Are you sure you want to delete "${fileToDelete.name}"?`)) return;

    try {
      const targetTask = tasks.find(t => t.id === fileToDelete.taskId);
      if (!targetTask) return;

      const remainingFiles = (targetTask.files || []).filter(f => f.id !== fileToDelete.id);
      const res = await fetch(`${API_URL}/api/tasks/${targetTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: remainingFiles })
      });

      if (res.ok) {
        const updated = await res.json();
        setTasks(prev => prev.map(t => t.id === targetTask.id ? updated : t));
      }
    } catch (err) {
      console.error('Error deleting report file:', err);
    }
  };

  // Helper functions
  const getFileExtension = (filename) => {
    if (!filename) return '';
    return filename.split('.').pop().toUpperCase();
  };

  const getExtColor = (ext) => {
    switch (ext) {
      case 'PDF': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' };
      case 'DOCX': case 'DOC': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' };
      case 'XLSX': case 'XLS': case 'CSV': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' };
      case 'PNG': case 'JPG': case 'JPEG': case 'WEBP': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' };
      default: return { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' };
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'png': return 'image/png';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'svg': return 'image/svg+xml';
      default: return 'application/octet-stream';
    }
  };

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
        <iframe src={file.data} style={styles.previewIframe} title={file.name} />
      );
    }

    if (['txt', 'csv', 'html'].includes(ext)) {
      let textContent = '';
      try {
        const base64Data = file.data.split(',')[1];
        textContent = atob(base64Data);
      } catch {
        textContent = 'Unable to decode file content.';
      }
      return <pre style={styles.previewText}>{textContent}</pre>;
    }

    if (['docx', 'doc', 'xlsx', 'xls'].includes(ext)) {
      if (isConverting) {
        return (
          <div style={styles.previewFallback}>
            <Loader size={36} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Parsing file content...</p>
          </div>
        );
      }
      return (
        <div 
          style={styles.docPreviewContent}
          dangerouslySetInnerHTML={{ __html: convertedHtml }}
        />
      );
    }

    return (
      <div style={styles.previewFallback}>
        <FileText size={56} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Direct preview is not supported for this file type.</p>
      </div>
    );
  };

  // Filtered files list
  const filteredFiles = allFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (file.taskTitle && file.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategoryFilter === 'ALL' || file.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Document Preview Overlay */}
      {previewFile && (
        <div style={styles.previewOverlay} onClick={() => setPreviewFile(null)}>
          <div style={styles.previewPanel} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={styles.previewTitle}>{previewFile.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a href={previewFile.data} download={previewFile.name} style={styles.downloadIconBtn} title="Download">
                  <Download size={16} />
                </a>
                <button style={styles.closeIconBtn} onClick={() => setPreviewFile(null)}>
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

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
          Reports & File Upload Dashboard
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Upload, manage, preview, and download project report documents.
        </p>
      </div>

      {/* File Upload Card (Admin) */}
      {isAdmin && (
        <div className="glass-panel" style={styles.uploadCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Upload size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
              File Upload
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={styles.inputLabel}>Report Title / Name (Optional)</label>
              <input 
                type="text"
                className="input-field"
                placeholder="e.g. Monthly Performance Report..."
                value={reportTitleInput}
                onChange={(e) => setReportTitleInput(e.target.value)}
              />
            </div>
            <div>
              <label style={styles.inputLabel}>Main Heading / Category</label>
              <input 
                type="text"
                list="upload-category-list"
                className="input-field"
                placeholder="Search or select Main Heading..."
                value={targetCategoryInput}
                onChange={(e) => setTargetCategoryInput(e.target.value)}
              />
              <datalist id="upload-category-list">
                {availableCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Drag & Drop / Upload Zone */}
          <div 
            style={styles.dropZone}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input 
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {isUploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Loader size={32} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                  Uploading report file...
                </span>
              </div>
            ) : (
              <>
                <div style={styles.uploadIconWrap}>
                  <Upload size={24} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '8px' }}>
                  Click to select & upload report file
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Supports PDF, Word (.docx), Excel (.xlsx), Images, CSV (Max 30MB)
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reports Directory & Files List */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
        
        {/* Filter Controls Bar */}
        <div style={styles.filterControlsBar}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
              Uploaded Reports & Documents
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing {filteredFiles.length} of {allFiles.length} files
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={styles.searchWrap}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            {/* Searchable Category Filter Input */}
            <div style={styles.searchWrap}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text"
                list="filter-category-list"
                placeholder="Search Heading..."
                value={selectedCategoryFilter === 'ALL' ? '' : selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value || 'ALL')}
                style={styles.searchInput}
              />
              <datalist id="filter-category-list">
                {availableCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Files Grid / List */}
        {filteredFiles.length === 0 ? (
          <div style={styles.emptyFilesState}>
            <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>No Report Files Found</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {allFiles.length === 0 ? 'Upload your first report file using the upload panel above.' : 'No files match your search criteria.'}
            </p>
          </div>
        ) : (
          <div style={styles.filesGrid}>
            {filteredFiles.map(file => {
              const ext = getFileExtension(file.name);
              const colorInfo = getExtColor(ext);

              return (
                <div key={file.id} style={styles.fileCard} className="file-card-hover">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: colorInfo.bg,
                        color: colorInfo.text,
                        fontWeight: '700',
                        fontSize: '0.78rem',
                        letterSpacing: '0.05em',
                        flexShrink: 0
                      }}>
                        {ext}
                      </div>

                      <div style={{ overflow: 'hidden' }}>
                        <h4 style={styles.fileNameText} title={file.name}>
                          {file.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={styles.categoryPill}>
                            <Folder size={11} /> {file.category || 'Reports'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date & Upload Info */}
                  <div style={styles.fileMetaRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <Calendar size={13} />
                      <span>{new Date(file.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        style={styles.actionBtn}
                        onClick={() => setPreviewFile(file)}
                        title="Preview Document"
                      >
                        <Eye size={15} />
                      </button>

                      <a 
                        href={file.data} 
                        download={file.name} 
                        style={styles.actionBtn} 
                        title="Download File"
                      >
                        <Download size={15} />
                      </a>

                      {isAdmin && (
                        <button 
                          style={{ ...styles.actionBtn, color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                          onClick={() => handleDeleteFile(file)}
                          title="Delete File"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

const styles = {
  uploadCard: {
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  inputLabel: {
    fontSize: '0.82rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    display: 'block',
  },
  dropZone: {
    padding: '28px',
    borderRadius: '14px',
    border: '2px dashed rgba(99, 102, 241, 0.3)',
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  uploadIconWrap: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterControlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '8px 12px',
    minWidth: '200px',
  },
  searchInput: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    width: '100%',
  },
  filterSelect: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
  },
  filesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  fileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '14px',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  fileNameText: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  categoryPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    fontWeight: '500',
    color: '#818cf8',
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  fileMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  actionBtn: {
    padding: '6px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
  },
  emptyFilesState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
    textAlign: 'center',
  },
  previewOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 17, 23, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    padding: '24px',
  },
  previewPanel: {
    width: '100%',
    maxWidth: '900px',
    height: '85vh',
    backgroundColor: '#151821',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '20px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  previewHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: '1.05rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '500px',
  },
  downloadIconBtn: {
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  closeIconBtn: {
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
  },
  previewBody: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  previewImageWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '12px',
  },
  previewIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '12px',
  },
  previewText: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '0.88rem',
    color: 'var(--text-primary)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: '16px',
    borderRadius: '10px',
    margin: 0,
  },
  docPreviewContent: {
    backgroundColor: '#ffffff',
    color: '#1e293b',
    padding: '24px',
    borderRadius: '12px',
    minHeight: '100%',
    overflowX: 'auto',
  },
  previewFallback: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  }
};
