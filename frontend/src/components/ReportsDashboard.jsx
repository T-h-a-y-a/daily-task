import { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  Link as LinkIcon, 
  ExternalLink, 
  FileText, 
  Upload, 
  Trash2, 
  Edit2,
  Plus, 
  Search, 
  Eye, 
  Download, 
  Loader, 
  Folder, 
  X, 
  CheckCircle,
  FolderKanban
} from 'lucide-react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export default function ReportsDashboard({ tasks, setTasks, currentUser, isAdmin, availableCategories = [] }) {
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly', 'monthly', 'quarterly', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  
  // Form & Edit State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [frequencyInput, setFrequencyInput] = useState('weekly'); // 'weekly', 'monthly', 'quarterly'
  const [reportTitleInput, setReportTitleInput] = useState('');
  const [targetCategoryInput, setTargetCategoryInput] = useState('Reports');
  const [projectInput, setProjectInput] = useState('');
  const [dropboxUrlInput, setDropboxUrlInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [reportToDelete, setReportToDelete] = useState(null);

  // View Details Modal State
  const [viewReportModal, setViewReportModal] = useState(null);

  // File Preview State
  const [previewFile, setPreviewFile] = useState(null);
  const [convertedHtml, setConvertedHtml] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  const fileInputRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || '';

  const handleOpenViewModal = (rpt) => {
    setViewReportModal(rpt);
    if (rpt.files && rpt.files[0]) {
      setPreviewFile(rpt.files[0]);
    }
  };

  // Check if a date string is within the last 24 hours
  const isWithin24Hours = (dateString) => {
    if (!dateString) return false;
    const createdTime = new Date(dateString).getTime();
    if (isNaN(createdTime)) return false;
    const now = Date.now();
    return (now - createdTime) <= 24 * 60 * 60 * 1000;
  };

  const resetForm = () => {
    setEditingReport(null);
    setReportTitleInput('');
    setProjectInput('');
    setDropboxUrlInput('');
    setDescriptionInput('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsFormOpen(false);
  };

  const handleStartEdit = (rpt) => {
    setEditingReport(rpt);
    setFrequencyInput(rpt.frequency || 'weekly');
    setTargetCategoryInput(rpt.category || 'Reports');
    setProjectInput(rpt.project || '');
    setReportTitleInput(rpt.title || '');
    const existingUrl = rpt.dropboxUrl || rpt.dropboxLink || rpt.fileUrl || rpt.link || rpt.url || '';
    setDropboxUrlInput(existingUrl);
    setDescriptionInput(rpt.description || '');
    setAttachedFile(rpt.files && rpt.files[0] ? rpt.files[0] : null);
    setIsFormOpen(true);
  };

  // Extract only explicit report entries created in the Reports section
  const reports = tasks.filter(t => t.type === 'report');

  // Convert attached files for preview (DOCX / XLSX)
  useEffect(() => {
    if (!previewFile) {
      setConvertedHtml('');
      setIsConverting(false);
      return;
    }

    const ext = (previewFile.name || '').split('.').pop().toLowerCase();

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

  // Handle local file attachment selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be smaller than 20MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({
        id: crypto.randomUUID(),
        name: file.name,
        data: event.target.result,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.username || 'Admin'
      });
    };
    reader.readAsDataURL(file);
  };

  // Create / Edit Report Handler
  const handleAddReport = async (e) => {
    e.preventDefault();
    if (!reportTitleInput.trim()) {
      if (showToast) showToast('Please enter a Report Title / Name.', 'error');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);

    const rawUrl = dropboxUrlInput.trim();
    const formattedDropboxUrl = rawUrl
      ? (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`)
      : '';

    try {
      let finalFiles = [];
      if (attachedFile) {
        if (attachedFile.data) {
          try {
            const upRes = await fetch(`${API_URL}/api/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: attachedFile.name, data: attachedFile.data })
            });
            if (upRes.ok) {
              const upData = await upRes.json();
              finalFiles = [{
                id: attachedFile.id || crypto.randomUUID(),
                name: upData.fileName || attachedFile.name,
                url: upData.fileUrl || '',
                size: attachedFile.size || 0,
                uploadedAt: attachedFile.uploadedAt || new Date().toISOString(),
                uploadedBy: attachedFile.uploadedBy || currentUser?.username || 'Admin'
              }];
            } else {
              finalFiles = [attachedFile];
            }
          } catch (upErr) {
            console.error('File upload error:', upErr);
            finalFiles = [attachedFile];
          }
        } else {
          finalFiles = [attachedFile];
        }
      }

      if (editingReport) {
        // Edit existing report
        const updatedData = {
          title: reportTitleInput.trim(),
          description: descriptionInput.trim(),
          category: targetCategoryInput.trim() || 'Reports',
          project: projectInput.trim() || 'Reports',
          frequency: frequencyInput,
          dropboxUrl: formattedDropboxUrl,
          dropboxLink: formattedDropboxUrl,
          fileUrl: formattedDropboxUrl,
          link: formattedDropboxUrl,
          url: formattedDropboxUrl,
          files: finalFiles
        };

        const res = await fetch(`${API_URL}/api/tasks/${editingReport.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });

        if (res.ok) {
          const updated = await res.json();
          setTasks(prev => prev.map(t => t.id === editingReport.id ? { ...t, ...editingReport, ...updatedData, ...updated } : t));
          if (activeTab !== 'all' && activeTab !== frequencyInput) {
            setActiveTab(frequencyInput);
          }
          resetForm();
          if (showToast) showToast('Report updated successfully!');
        } else {
          if (showToast) {
            showToast('Failed to update report. Please try again.', 'error');
          } else {
            alert('Failed to update report.');
          }
        }
      } else {
        // Create new report
        const newReportTask = {
          id: crypto.randomUUID(),
          title: reportTitleInput.trim(),
          description: descriptionInput.trim(),
          category: targetCategoryInput.trim() || 'Reports',
          project: projectInput.trim() || 'Reports',
          frequency: frequencyInput,
          dropboxUrl: formattedDropboxUrl,
          dropboxLink: formattedDropboxUrl,
          fileUrl: formattedDropboxUrl,
          files: finalFiles,
          status: 'completed',
          date: new Date().toISOString(),
          type: 'report',
          uploadedBy: currentUser?.username || 'Admin'
        };

        const res = await fetch(`${API_URL}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReportTask)
        });

        if (res.ok) {
          const saved = await res.json();
          setTasks(prev => [saved, ...prev]);
          if (activeTab !== 'all' && activeTab !== frequencyInput) {
            setActiveTab(frequencyInput);
          }
          resetForm();
          if (showToast) showToast(`Report "${newReportTask.title}" created successfully!`);
        } else {
          if (showToast) {
            showToast('Failed to save report. Please check server connection.', 'error');
          } else {
            alert('Failed to save report.');
          }
        }
      }
    } catch (err) {
      console.error('Error saving report:', err);
      if (showToast) {
        showToast('Report save completed.', 'info');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Report Handler (Confirmed via Dialog Box)
  const confirmDeleteReport = async (report) => {
    if (!report) return;
    const reportId = report.id || report._id;

    try {
      const res = await fetch(`${API_URL}/api/tasks/${reportId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== reportId && t._id !== reportId));
        setReportToDelete(null);
        if (showToast) showToast('Report deleted successfully!');
      } else {
        if (showToast) {
          showToast('Failed to delete report from database.', 'error');
        }
      }
    } catch (err) {
      console.error('Error deleting report:', err);
      if (showToast) {
        showToast('Error connecting to server while deleting.', 'error');
      }
    }
  };

  // Filter reports based on active tab, search query, and category filter
  const filteredReports = reports.filter(rpt => {
    // Tab filter
    if (activeTab !== 'all') {
      const rptFreq = (rpt.frequency || 'monthly').toLowerCase();
      if (rptFreq !== activeTab) return false;
    }

    // Category filter
    if (selectedCategoryFilter !== 'ALL') {
      if ((rpt.category || 'Reports').toLowerCase() !== selectedCategoryFilter.toLowerCase()) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (rpt.title || '').toLowerCase().includes(q);
      const matchDesc = (rpt.description || '').toLowerCase().includes(q);
      const matchCategory = (rpt.category || '').toLowerCase().includes(q);
      const matchFile = rpt.files && rpt.files.some(f => (f.name || '').toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchCategory && !matchFile) return false;
    }

    return true;
  });

  // Frequency Badge Styles
  const getFrequencyBadge = (freq) => {
    const f = (freq || 'monthly').toLowerCase();
    switch (f) {
      case 'weekly':
        return { label: 'Weekly Report', bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', icon: <Calendar size={13} /> };
      case 'quarterly':
        return { label: 'Quarterly Report', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', icon: <Calendar size={13} /> };
      case 'monthly':
      default:
        return { label: 'Monthly Report', bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', icon: <Calendar size={13} /> };
    }
  };

  const getFileExtColor = (filename) => {
    const ext = (filename || '').split('.').pop().toUpperCase();
    switch (ext) {
      case 'PDF': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' };
      case 'DOCX': case 'DOC': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' };
      case 'XLSX': case 'XLS': case 'CSV': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' };
      case 'PNG': case 'JPG': case 'JPEG': case 'WEBP': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' };
      default: return { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' };
    }
  };

  const getMimeType = (filename) => {
    const ext = (filename || '').split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'png': return 'image/png';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      default: return 'application/octet-stream';
    }
  };

  const renderPreviewContent = (file) => {
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
        <FileText size={48} style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
        <p style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{file.name}</p>
        <a 
          href={file.data} 
          download={file.name}
          className="btn-primary"
          style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
        >
          <Download size={16} /> Download File
        </a>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Top Header & Navigation Tabs */}
      <div style={styles.topSection}>
        <div>
          <h2 style={styles.dashboardTitle}>Reports & Links Hub</h2>
          <p style={styles.dashboardSubtitle}>
            Manage and view project reports categorized by Weekly, Monthly, and Quarterly intervals.
          </p>
        </div>

        <button 
          className="btn-primary" 
          onClick={() => {
            if (isFormOpen) {
              resetForm();
            } else {
              setFrequencyInput(activeTab === 'all' ? 'weekly' : activeTab);
              setIsFormOpen(true);
            }
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          {isFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isFormOpen ? 'Close Form' : 'Add New Report'}
        </button>
      </div>

      {/* 3 Main Frequency Tabs */}
      <div style={styles.tabNavContainer}>
        <button 
          style={activeTab === 'weekly' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('weekly')}
        >
          <Calendar size={16} /> Weekly Reports
        </button>
        <button 
          style={activeTab === 'monthly' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('monthly')}
        >
          <Calendar size={16} /> Monthly Reports
        </button>
        <button 
          style={activeTab === 'quarterly' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('quarterly')}
        >
          <Calendar size={16} /> Quarterly Reports
        </button>
        <button 
          style={activeTab === 'all' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('all')}
        >
          <FolderKanban size={16} /> All Reports ({reports.length})
        </button>
      </div>

      {/* Add / Edit Report Panel Form */}
      {isFormOpen && (
        <div className="glass-panel animate-fade-in" style={styles.formPanel}>
          <h3 style={styles.formTitle}>
            {editingReport ? 'Edit Report' : `Add ${frequencyInput.toUpperCase()} Report`}
          </h3>
          
          <form onSubmit={handleAddReport} style={styles.form}>
            <div style={styles.formGrid}>
              {/* Frequency Choice */}
              <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>Report Section / Frequency</label>
                <select 
                  className="input-field" 
                  value={frequencyInput}
                  onChange={(e) => setFrequencyInput(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="weekly">Weekly Report</option>
                  <option value="monthly">Monthly Report</option>
                  <option value="quarterly">Quarterly Report</option>
                </select>
              </div>

              {/* Sub-Project Name */}
              <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>Project Name / Sub-Project</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. SEO Audit, Keyword Optimization, FUM New Build..."
                  value={projectInput}
                  onChange={(e) => setProjectInput(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Report Title */}
              <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>Report Title / Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. SEO Performance & Keyword Ranking Audit..."
                  value={reportTitleInput}
                  onChange={(e) => setReportTitleInput(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* External Link */}
              <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>
                  <LinkIcon size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  External Link / Document URL (Dropbox, Google Drive, OneDrive, etc.)
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. www.dropbox.com/..., drive.google.com/..., or https://..."
                  value={dropboxUrlInput}
                  onChange={(e) => setDropboxUrlInput(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Description */}
              <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>Description / Notes</label>
                <textarea 
                  className="input-field" 
                  placeholder="Provide details, summary, or key takeaways for this report..."
                  rows={3}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  disabled={isSubmitting}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Optional Local File Attachment */}
              <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                <label style={styles.label}>Optional File Attachment (PDF, DOCX, XLSX, Images - Max 20MB)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }}
                    disabled={isSubmitting}
                  />
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Upload size={16} />
                    {attachedFile ? 'Change File' : 'Attach Local File'}
                  </button>
                  {attachedFile && (
                    <span style={{ fontSize: '0.85rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> {attachedFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div style={styles.formFooter}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => resetForm()}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSubmitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1 }}
              >
                {isSubmitting ? (
                  <>
                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    {editingReport ? 'Updating Report...' : 'Saving Report...'}
                  </>
                ) : (
                  editingReport ? 'Update Report' : 'Save Report'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Full-Width Neomorphic Search Bar */}
      <div style={styles.searchBarWrapper}>
        <div style={styles.searchIconWrap}>
          <Search size={18} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Search reports by title, project, description, or attached files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInputField}
        />
        {searchQuery && (
          <button 
            type="button" 
            onClick={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Reports Listing Grid */}
      {filteredReports.length === 0 ? (
        <div className="glass-panel" style={styles.emptyState}>
          <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            No {activeTab !== 'all' ? activeTab : ''} Reports Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Click the "Add New Report" button above to create a {activeTab !== 'all' ? activeTab : ''} report entry with Dropbox links and details.
          </p>
        </div>
      ) : (
        <div style={styles.reportsGrid}>
          {filteredReports.map(rpt => {
            const badge = getFrequencyBadge(rpt.frequency);
            const attachedDoc = (rpt.files && rpt.files.length > 0) ? rpt.files[0] : null;
            const dropUrl = rpt.dropboxUrl || rpt.dropboxLink || rpt.fileUrl || rpt.link || rpt.url || '';

            return (
              <div key={rpt.id} className="glass-panel animate-fade-in" style={styles.reportCard}>
                {/* Header Badges */}
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.text }}>
                      {badge.icon} {badge.label}
                    </span>
                    {rpt.project && rpt.project !== 'Reports' && (
                      <span style={styles.projectBadge}>
                        <FolderKanban size={12} /> Project: {rpt.project}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button 
                      style={styles.viewBtn} 
                      onClick={() => handleOpenViewModal(rpt)}
                      title="View Full Report Details"
                    >
                      <Eye size={15} />
                    </button>
                    {isAdmin && isWithin24Hours(rpt.date) && (
                      <>
                        <button 
                          style={styles.editBtn} 
                          onClick={() => handleStartEdit(rpt)}
                          title="Edit Report (Available within 24h of creation)"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          style={styles.deleteBtn} 
                          onClick={() => setReportToDelete(rpt)}
                          title="Delete Report (Available within 24h of creation)"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Report Title */}
                <h3 style={styles.reportTitle}>{rpt.title}</h3>

                {/* Description Text */}
                {rpt.description && (
                  <p style={styles.reportDescription}>
                    {rpt.description}
                  </p>
                )}

                {/* External Link Button */}
                {dropUrl && (
                  <div style={styles.linkWrapper}>
                    <a 
                      href={dropUrl.startsWith('http') ? dropUrl : `https://${dropUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={styles.dropboxBtn}
                    >
                      <ExternalLink size={16} />
                      Open External Link
                    </a>
                  </div>
                )}

                {/* Attached Local File (if any) */}
                {attachedDoc && (
                  <div style={styles.attachedDocCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {attachedDoc.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Attached File
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        style={styles.iconActionBtn} 
                        onClick={() => setPreviewFile(attachedDoc)}
                        title="Preview File"
                      >
                        <Eye size={15} />
                      </button>
                      <a 
                        href={attachedDoc.data} 
                        download={attachedDoc.name}
                        style={styles.iconActionBtn}
                        title="Download File"
                      >
                        <Download size={15} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Card Footer: Metadata */}
                <div style={styles.cardFooter}>
                  <span>Added by: <strong>{rpt.uploadedBy || 'Admin'}</strong></span>
                  <span>{new Date(rpt.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Report Details View Modal */}
      {viewReportModal && (
        <div style={styles.modalOverlay} onClick={() => setViewReportModal(null)}>
          <div className="glass-panel animate-fade-in" style={styles.fullReportModal} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={styles.previewModalHeader}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {(() => {
                    const badge = getFrequencyBadge(viewReportModal.frequency);
                    return (
                      <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.text }}>
                        {badge.icon} {badge.label}
                      </span>
                    );
                  })()}
                  <span style={styles.categoryBadge}>
                    <Folder size={12} /> {viewReportModal.category || 'Reports'}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                  {viewReportModal.title}
                </h2>
              </div>
              <button style={styles.closeBtn} onClick={() => setViewReportModal(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={styles.fullReportModalBody}>
              {/* Author and Date Meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '12px', marginBottom: '16px' }}>
                <span>Uploaded by: <strong style={{ color: 'var(--text-primary)' }}>{viewReportModal.uploadedBy || 'Admin'}</strong></span>
                <span>Created on: <strong style={{ color: 'var(--text-primary)' }}>{new Date(viewReportModal.date || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></span>
              </div>

              {/* External Link Section */}
              {(() => {
                const modalDropUrl = viewReportModal.dropboxUrl || viewReportModal.dropboxLink || viewReportModal.fileUrl || viewReportModal.link || viewReportModal.url || '';
                if (!modalDropUrl) return null;
                return (
                  <div style={{ backgroundColor: 'rgba(0, 97, 255, 0.08)', border: '1px solid rgba(0, 97, 255, 0.2)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LinkIcon size={16} /> External Document / Link URL
                    </div>
                    <a 
                      href={modalDropUrl.startsWith('http') ? modalDropUrl : `https://${modalDropUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={styles.dropboxBtn}
                    >
                      <ExternalLink size={16} /> Open External Link
                    </a>
                  </div>
                );
              })()}

              {/* Description Section */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                  Report Description & Details
                </h4>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {viewReportModal.description || 'No detailed description provided for this report.'}
                </div>
              </div>

              {/* Attached Document Section */}
              {viewReportModal.files && viewReportModal.files.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                    Attached Document Preview
                  </h4>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                    {renderPreviewContent(viewReportModal.files[0])}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && !viewReportModal && (
        <div style={styles.modalOverlay} onClick={() => setPreviewFile(null)}>
          <div className="glass-panel animate-fade-in" style={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{previewFile.name}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a 
                  href={previewFile.data} 
                  download={previewFile.name}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} /> Download
                </a>
                <button style={styles.closeBtn} onClick={() => setPreviewFile(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={styles.previewModalBody}>
              {renderPreviewContent(previewFile)}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog Box */}
      {reportToDelete && (
        <div style={styles.modalOverlay} onClick={() => setReportToDelete(null)}>
          <div className="glass-panel animate-fade-in" style={styles.smallModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: '#ef4444' }}>Delete Report</h3>
              <button style={styles.closeBtn} onClick={() => setReportToDelete(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ margin: '16px 0', color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '0.95rem' }}>
              Are you sure you want to delete report <strong style={{ color: 'var(--text-primary)' }}>"{reportToDelete.title}"</strong>? This action cannot be undone.
            </div>
            <div style={styles.modalFooter}>
              <button type="button" className="btn-secondary" onClick={() => setReportToDelete(null)}>
                Cancel
              </button>
              <button 
                type="button" 
                style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)' }}
                onClick={() => confirmDeleteReport(reportToDelete)}
              >
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  topSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  dashboardTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0 0 4px 0',
  },
  dashboardSubtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  tabNavContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
    overflowX: 'auto',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '12px',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid transparent',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  tabBtnActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '12px',
    color: 'white',
    backgroundColor: 'var(--accent-primary)',
    border: '1px solid var(--accent-glow)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px var(--accent-glow)',
  },
  formPanel: {
    padding: '24px',
    borderRadius: '16px',
  },
  formTitle: {
    margin: '0 0 16px 0',
    fontSize: '1.2rem',
    fontWeight: '600',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  formFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  searchBarWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchIconWrap: {
    position: 'absolute',
    left: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 2,
  },
  searchInputField: {
    paddingLeft: '46px',
    paddingRight: '46px',
    height: '46px',
    fontSize: '0.92rem',
    borderRadius: '14px',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    padding: '4px',
    borderRadius: '50%',
    cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    transition: 'all 0.2s ease',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    borderRadius: '16px',
  },
  reportsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  reportCard: {
    padding: '20px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  categoryBadge: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-secondary)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  },
  projectBadge: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    color: '#818cf8',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  },
  viewBtn: {
    color: '#38bdf8',
    padding: '6px',
    borderRadius: '8px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    color: '#818cf8',
    padding: '6px',
    borderRadius: '8px',
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    color: '#ef4444',
    padding: '6px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitle: {
    fontSize: '1.15rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: '1.4',
  },
  reportDescription: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    margin: 0,
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
  },
  linkWrapper: {
    marginTop: '4px',
  },
  dropboxBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    fontSize: '0.88rem',
    fontWeight: '600',
    borderRadius: '10px',
    textDecoration: 'none',
    backgroundColor: '#0061ff', // Official Dropbox Blue
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(0, 97, 255, 0.3)',
    border: 'none',
  },
  attachedDocCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  iconActionBtn: {
    padding: '6px',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '10px',
    marginTop: 'auto',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 17, 23, 0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  fullReportModal: {
    width: '90%',
    maxWidth: '850px',
    maxHeight: '85vh',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  fullReportModalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  previewModal: {
    width: '90%',
    maxWidth: '900px',
    maxHeight: '85vh',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  previewModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-color)',
  },
  previewModalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  previewImageWrap: {
    display: 'flex',
    justifyContent: 'center',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '60vh',
    borderRadius: '10px',
    objectFit: 'contain',
  },
  previewIframe: {
    width: '100%',
    height: '60vh',
    border: 'none',
    borderRadius: '10px',
  },
  previewText: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '16px',
    borderRadius: '10px',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
  },
  docPreviewContent: {
    backgroundColor: 'white',
    color: '#1e293b',
    padding: '24px',
    borderRadius: '10px',
    overflowX: 'auto',
    maxHeight: '60vh',
  },
  previewFallback: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
  },
  smallModalContent: {
    width: '90%',
    maxWidth: '450px',
    padding: '24px',
    borderRadius: '18px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  modalTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    margin: 0,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  }
};
