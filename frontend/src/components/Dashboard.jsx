import { useState, useEffect } from 'react';
import { LogOut, Plus, LayoutDashboard, Calendar, Users, Globe, Download, MoreVertical, FileText, FolderKanban, Folder, Layers, Edit2, Trash2, X, ChevronDown, ChevronRight, ShieldCheck, ArrowLeft, Menu } from 'lucide-react';
import * as XLSX from 'xlsx';
import TaskBoard from './TaskBoard';
import TaskModal from './TaskModal';
import CommentModal from './CommentModal';
import UserManagement from './UserManagement';
import ReportFilesPage from './ReportFilesPage';
import ReportsDashboard from './ReportsDashboard';

export default function Dashboard({ user, onLogout }) {
  const [selectedView, setSelectedView] = useState({ type: 'ALL' }); // { type: 'ALL' }, { type: 'CATEGORY', name: 'SEO' }, { type: 'PROJECT', name: 'SEO Audit', category: 'SEO' }, { type: 'USERS' }
  const [tasks, setTasks] = useState([]);
  
  // Custom categories list (Main Headings)
  const [customCategories, setCustomCategories] = useState(['SEO', 'Website Development', 'Reports']);
  // Custom sub-projects list by category
  const [customProjectsByCategory, setCustomProjectsByCategory] = useState({
    'SEO': ['SEO Audit', 'Keyword Optimization'],
    'Website Development': ['FUM New Website', 'Prestige Financial'],
    'Reports': ['Monthly Analytics']
  });

  const [expandedCategories, setExpandedCategories] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [reportFilesTask, setReportFilesTask] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Category (Main Heading) Modal States
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [editCategoryInput, setEditCategoryInput] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Sub-Project Modal States
  const [isCreateSubProjectModalOpen, setIsCreateSubProjectModalOpen] = useState(false);
  const [categoryForNewSubProject, setCategoryForNewSubProject] = useState(null);
  const [newSubProjectInput, setNewSubProjectInput] = useState('');
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [editProjectInput, setEditProjectInput] = useState('');
  const [projectToDelete, setProjectToDelete] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || '';
  const isAdmin = user?.role === 'admin';

  // Fetch tasks from API
  useEffect(() => {
    fetch(`${API_URL}/api/tasks`)
      .then(res => res.json())
      .then(data => setTasks(data.reverse()))
      .catch(err => console.error('Error fetching tasks:', err));
  }, []);

  // Dynamic categories list
  const extractedCategories = Array.from(new Set(
    tasks.map(t => t.category).filter(Boolean)
  ));
  const availableCategories = Array.from(new Set([
    ...customCategories,
    ...extractedCategories
  ]));

  // Available sub-projects
  const availableProjects = Array.from(new Set(
    tasks.map(t => t.project).filter(Boolean)
  ));

  // Filter tasks for TaskBoard based on selected view
  const filteredTasksForBoard = tasks.filter(t => {
    if (selectedView.type === 'ALL' || selectedView.type === 'USERS') return true;
    if (selectedView.type === 'CATEGORY') {
      return t.category === selectedView.name;
    }
    if (selectedView.type === 'PROJECT') {
      return t.project === selectedView.name;
    }
    return true;
  });

  // Create Main Heading (Category) Handler
  const handleCreateCategorySubmit = (e) => {
    e.preventDefault();
    const name = newCategoryInput.trim();
    if (!name) return;
    if (!customCategories.includes(name)) {
      setCustomCategories(prev => [...prev, name]);
    }
    setExpandedCategories(prev => ({ ...prev, [name]: true }));
    setSelectedView({ type: 'CATEGORY', name });
    setNewCategoryInput('');
    setIsCreateCategoryModalOpen(false);
  };

  // Rename Main Heading (Category) Handler
  const handleRenameCategorySubmit = async (e) => {
    e.preventDefault();
    const newName = editCategoryInput.trim();
    if (!newName || !categoryToEdit || newName === categoryToEdit) {
      setCategoryToEdit(null);
      return;
    }

    try {
      await fetch(`${API_URL}/api/categories/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName: categoryToEdit, newName })
      });

      setTasks(prev => prev.map(t => (t.category || 'SEO') === categoryToEdit ? { ...t, category: newName } : t));
      setCustomCategories(prev => prev.map(c => c === categoryToEdit ? newName : c));
      setCustomProjectsByCategory(prev => {
        const copy = { ...prev };
        if (copy[categoryToEdit]) {
          copy[newName] = copy[categoryToEdit];
          delete copy[categoryToEdit];
        }
        return copy;
      });
      if (selectedView.type === 'CATEGORY' && selectedView.name === categoryToEdit) {
        setSelectedView({ type: 'CATEGORY', name: newName });
      }
    } catch (err) {
      console.error('Error renaming category:', err);
    } finally {
      setCategoryToEdit(null);
      setEditCategoryInput('');
    }
  };

  // Delete Main Heading (Category) Handler
  const handleDeleteCategoryConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      await fetch(`${API_URL}/api/categories/${encodeURIComponent(categoryToDelete)}`, {
        method: 'DELETE'
      });

      setTasks(prev => prev.filter(t => (t.category || 'SEO') !== categoryToDelete));
      setCustomCategories(prev => prev.filter(c => c !== categoryToDelete));
      if (selectedView.type === 'CATEGORY' && selectedView.name === categoryToDelete) {
        setSelectedView({ type: 'ALL' });
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    } finally {
      setCategoryToDelete(null);
    }
  };

  // Create Sub-Project Handler
  const handleCreateSubProjectSubmit = (e) => {
    e.preventDefault();
    const name = newSubProjectInput.trim();
    if (!name || !categoryForNewSubProject) return;

    setCustomProjectsByCategory(prev => ({
      ...prev,
      [categoryForNewSubProject]: Array.from(new Set([...(prev[categoryForNewSubProject] || []), name]))
    }));

    setExpandedCategories(prev => ({ ...prev, [categoryForNewSubProject]: true }));
    setSelectedView({ type: 'PROJECT', name, category: categoryForNewSubProject });
    setNewSubProjectInput('');
    setIsCreateSubProjectModalOpen(false);
  };

  // Rename Sub-Project Handler
  const handleRenameProjectSubmit = async (e) => {
    e.preventDefault();
    const newName = editProjectInput.trim();
    if (!newName || !projectToEdit || newName === projectToEdit) {
      setProjectToEdit(null);
      return;
    }

    try {
      await fetch(`${API_URL}/api/projects/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName: projectToEdit, newName })
      });

      setTasks(prev => prev.map(t => (t.project || 'General') === projectToEdit ? { ...t, project: newName } : t));
      if (selectedView.type === 'PROJECT' && selectedView.name === projectToEdit) {
        setSelectedView(prev => ({ ...prev, name: newName }));
      }
    } catch (err) {
      console.error('Error renaming project:', err);
    } finally {
      setProjectToEdit(null);
      setEditProjectInput('');
    }
  };

  // Delete Sub-Project Handler
  const handleDeleteProjectConfirm = async () => {
    if (!projectToDelete) return;
    try {
      await fetch(`${API_URL}/api/projects/${encodeURIComponent(projectToDelete)}`, {
        method: 'DELETE'
      });

      setTasks(prev => prev.filter(t => t.project !== projectToDelete));
      if (selectedView.type === 'PROJECT' && selectedView.name === projectToDelete) {
        setSelectedView({ type: 'ALL' });
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    } finally {
      setProjectToDelete(null);
    }
  };

  const handleAddTask = async (taskData) => {
    const defaultCat = taskData.category || (selectedView.type === 'CATEGORY' ? selectedView.name : selectedView.type === 'PROJECT' ? (selectedView.category || 'SEO') : 'SEO');
    const catSubProjects = customProjectsByCategory[defaultCat] || Array.from(new Set(tasks.filter(t => (t.category || 'SEO') === defaultCat && t.project).map(t => t.project)));
    const defaultProj = taskData.project || (selectedView.type === 'PROJECT' ? selectedView.name : (catSubProjects[0] || 'General Tasks'));

    const newTask = {
      ...taskData,
      type: taskData.type || 'seo',
      category: defaultCat,
      project: defaultProj,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      if (res.ok) {
        const savedTask = await res.json();
        setTasks([savedTask, ...tasks]);
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleUpdateTask = async (id, updatedData) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(prevTasks => prevTasks.map(t => (t.id === id ? { ...t, ...updatedTask } : t)));
        
        if (editingTask && editingTask.id === id) {
          setEditingTask(prev => ({ ...prev, ...updatedData }));
        }
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks(prevTasks => prevTasks.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    if (filteredTasksForBoard.length === 0) {
      alert("No tasks to export in this section.");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Main Tasks
    const mainTasksData = filteredTasksForBoard.map(t => ({
      'Task Title': t.title,
      'Project': t.project || 'General',
      'Description': t.description,
      'Status': t.status,
      'Date Created': new Date(t.date).toLocaleDateString(),
      'Comments Count': Array.isArray(t.comments) ? t.comments.length : (t.comments && t.comments.trim() !== '' ? 1 : 0)
    }));
    const wsTasks = XLSX.utils.json_to_sheet(mainTasksData);
    XLSX.utils.book_append_sheet(wb, wsTasks, "Main Tasks");

    // Sheet 2: Comments
    const commentsData = [];
    filteredTasksForBoard.forEach(t => {
      if (Array.isArray(t.comments)) {
        const sortedComments = [...t.comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        sortedComments.forEach(c => {
          commentsData.push({
            'Task Title': t.title,
            'Project': t.project || 'General',
            'Comment': c.text,
            'Author': c.authorName,
            'Date': new Date(c.createdAt).toLocaleDateString(),
            'Time': new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          });
        });
      } else if (t.comments && typeof t.comments === 'string' && t.comments.trim() !== '') {
        commentsData.push({
          'Task Title': t.title,
          'Project': t.project || 'General',
          'Comment': t.comments,
          'Author': 'Unknown',
          'Date': new Date(t.date).toLocaleDateString(),
          'Time': ''
        });
      }
    });

    if (commentsData.length > 0) {
      const wsComments = XLSX.utils.json_to_sheet(commentsData);
      XLSX.utils.book_append_sheet(wb, wsComments, "Comments");
    }

    XLSX.writeFile(wb, `Tasks_${selectedProject !== 'ALL' ? selectedProject : 'All_Projects'}_Report.xlsx`);
  };

  const openCommentModal = (task) => {
    let updatedTask = task;
    const readBy = Array.isArray(task.readBy) ? task.readBy : [];
    if (user?.id && !readBy.includes(user.id)) {
      updatedTask = { ...task, readBy: [...readBy, user.id] };
      handleUpdateTask(task.id, { readBy: updatedTask.readBy });
    }
    setEditingTask(updatedTask);
    setIsCommentModalOpen(true);
  };

  const openFilesModal = (task) => {
    setReportFilesTask(task);
  };

  return (
    <div className="resp-layout">
      {/* Sidebar */}
      <aside className="glass-panel resp-sidebar">
        <div style={styles.logoArea} className="resp-logo-area">
          <h2 style={styles.logoText}>FWS</h2>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            title="Toggle Menu"
            aria-label="Toggle Menu"
            style={{
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav style={styles.nav} className={`resp-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          {selectedView.type === 'USERS' ? (
            /* ADMIN MANAGEMENT MODE: Only show Back button & Admin sub-items (Hide Projects list above) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div 
                style={styles.projectItem}
                onClick={() => { setSelectedView({ type: 'ALL' }); setIsMobileMenuOpen(false); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                  <ArrowLeft size={16} />
                  <span>Back to Projects</span>
                </div>
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.05em', padding: '0 12px 4px 12px' }}>
                  ADMIN MANAGEMENT
                </span>
                <div 
                  style={(selectedView.tab === 'users' || !selectedView.tab) ? styles.projectItemActive : styles.projectItem}
                  onClick={() => { setSelectedView({ type: 'USERS', tab: 'users' }); setIsMobileMenuOpen(false); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={16} />
                    <span>User Details</span>
                  </div>
                </div>
                <div 
                  style={selectedView.tab === 'projects' ? styles.projectItemActive : styles.projectItem}
                  onClick={() => { setSelectedView({ type: 'USERS', tab: 'projects' }); setIsMobileMenuOpen(false); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FolderKanban size={16} />
                    <span>Project Details</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PROJECTS MODE: Show Projects Tree & Admin Management Button at bottom */
            <>
              <div style={styles.projectsSectionHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderKanban size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span style={styles.projectsSectionTitle}>PROJECTS</span>
                </div>
              </div>

              <div style={styles.projectsList}>
                {/* All Projects */}
                <div 
                  style={selectedView.type === 'ALL' ? styles.projectItemActive : styles.projectItem}
                  onClick={() => { setSelectedView({ type: 'ALL' }); setIsMobileMenuOpen(false); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={16} />
                    <span>All Projects</span>
                  </div>
                  <span style={styles.projectBadge}>{availableCategories.length}</span>
                </div>

                {/* Main Headings & Sub-Projects Tree */}
                {availableCategories.map(cat => {
                  const catTasks = tasks.filter(t => t.category === cat);
                  const catProjects = Array.from(new Set([
                    ...catTasks.map(t => t.project).filter(Boolean),
                    ...(customProjectsByCategory[cat] || [])
                  ]));
                  const isCatSelected = selectedView.type === 'CATEGORY' && selectedView.name === cat;
                  const isExpanded = !!expandedCategories[cat];

                  return (
                    <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {/* Main Heading Row */}
                      <div 
                        style={isCatSelected ? styles.categoryHeaderActive : styles.categoryHeader}
                        onClick={() => {
                          setSelectedView({ type: 'CATEGORY', name: cat });
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCategories(prev => ({ ...prev, [cat]: !isExpanded }));
                            }}
                            style={styles.expandBtn}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <FolderKanban size={15} style={{ color: isCatSelected ? 'var(--accent-primary)' : '#818cf8', flexShrink: 0 }} />
                          <span style={styles.categoryTitleText}>{cat}</span>
                        </div>

                        <span style={styles.categoryBadge}>{catProjects.length}</span>
                      </div>

                      {/* Sub-Projects List */}
                      {isExpanded && (
                        <div style={styles.subProjectsContainer}>
                          {catProjects.map(proj => {
                            const projTasksCount = catTasks.filter(t => t.project === proj).length;
                            const isProjSelected = selectedView.type === 'PROJECT' && selectedView.name === proj;

                            return (
                              <div 
                                key={proj}
                                style={isProjSelected ? styles.subProjectItemActive : styles.subProjectItem}
                                onClick={() => { setSelectedView({ type: 'PROJECT', name: proj, category: cat }); setIsMobileMenuOpen(false); }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                                  <Folder size={14} style={{ color: isProjSelected ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj}</span>
                                </div>

                                <span style={styles.subProjectBadge}>{projTasksCount}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isAdmin && (
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <div 
                    style={styles.projectItem}
                    onClick={() => { setSelectedView({ type: 'USERS', tab: 'users' }); setIsMobileMenuOpen(false); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#818cf8' }}>
                      <ShieldCheck size={16} />
                      <span style={{ fontWeight: '600' }}>Admin Management</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </nav>

        <div style={styles.userProfile}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style={styles.userName}>{user?.username || 'User'}</div>
              <div style={styles.userRole}>{user?.role}</div>
            </div>
          </div>
          <button onClick={onLogout} style={styles.logoutBtn} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="resp-main">
        {reportFilesTask ? (
          <ReportFilesPage
            task={reportFilesTask}
            isAdmin={isAdmin}
            onBack={() => setReportFilesTask(null)}
            onSave={(data) => {
              handleUpdateTask(reportFilesTask.id, data);
              setReportFilesTask(prev => ({ ...prev, ...data }));
            }}
          />
        ) : selectedView.type === 'USERS' ? (
          <>
             <header className="resp-header">
              <div>
                <h1 style={styles.pageTitle}>
                  {selectedView.tab === 'projects' ? 'Project Details & Management' : 'User Details & Management'}
                </h1>
                <p style={styles.pageSubtitle}>
                  {selectedView.tab === 'projects' 
                    ? 'Create, rename, and manage main headings and sub-projects.' 
                    : 'Add and manage administrators and client accounts.'}
                </p>
              </div>
            </header>
            
            <div className="animate-fade-in" style={styles.content}>
              <UserManagement 
                currentUser={user} 
                initialTab={selectedView.tab || 'users'}
                categories={availableCategories}
                customProjectsByCategory={customProjectsByCategory}
                tasks={tasks}
                onCreateCategory={() => { setNewCategoryInput(''); setIsCreateCategoryModalOpen(true); }}
                onEditCategory={(cat) => { setCategoryToEdit(cat); setEditCategoryInput(cat); }}
                onDeleteCategory={(cat) => { setCategoryToDelete(cat); }}
                onCreateSubProject={(cat) => { setCategoryForNewSubProject(cat); setNewSubProjectInput(''); setIsCreateSubProjectModalOpen(true); }}
                onEditSubProject={(proj) => { setProjectToEdit(proj); setEditProjectInput(proj); }}
                onDeleteSubProject={(proj) => { setProjectToDelete(proj); }}
              />
            </div>
          </>
        ) : (
          <>
            <header className="resp-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    className="mobile-menu-btn" 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    title="Toggle Navigation Menu"
                    aria-label="Toggle Navigation Menu"
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: 'none',
                      marginRight: '2px'
                    }}
                  >
                    {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                  </button>
                  <h1 style={styles.pageTitle}>
                    {selectedView.type === 'ALL' 
                      ? 'All Projects' 
                      : selectedView.name}
                  </h1>
                  {selectedView.type !== 'ALL' && (
                    <span style={styles.activeProjectTag}>
                      <Folder size={14} /> {selectedView.type === 'CATEGORY' ? `Heading: ${selectedView.name}` : `Project: ${selectedView.name}`}
                    </span>
                  )}
                </div>
                <p style={styles.pageSubtitle}>
                  {selectedView.type === 'ALL'
                    ? (isAdmin ? 'Manage all client tasks across projects below.' : 'View your project tasks for today.')
                    : selectedView.type === 'CATEGORY'
                    ? `Showing task status for Main Heading "${selectedView.name}"`
                    : `Showing task status for Sub-Project "${selectedView.name}"`}
                </p>
              </div>
              {isAdmin && (
                <div className="resp-actions">
                  <button className="btn-secondary" style={styles.addBtn} onClick={handleExport}>
                    <Download size={20} />
                    Export
                  </button>
                  {selectedView.type === 'ALL' ? (
                    <button 
                      className="btn-primary" 
                      style={styles.addBtn} 
                      onClick={() => {
                        setNewCategoryInput('');
                        setIsCreateCategoryModalOpen(true);
                      }}
                    >
                      <Plus size={20} />
                      New Heading
                    </button>
                  ) : selectedView.type === 'CATEGORY' ? (
                    <button 
                      className="btn-primary" 
                      style={styles.addBtn} 
                      onClick={() => {
                        setCategoryForNewSubProject(selectedView.name);
                        setNewSubProjectInput('');
                        setIsCreateSubProjectModalOpen(true);
                      }}
                    >
                      <Plus size={20} />
                      New Project
                    </button>
                  ) : (
                    <button 
                      className="btn-primary" 
                      style={styles.addBtn} 
                      onClick={() => {
                        setEditingTask(null);
                        setIsModalOpen(true);
                      }}
                    >
                      <Plus size={20} />
                      New Task
                    </button>
                  )}
                </div>
              )}
            </header>

            <div className="animate-fade-in" style={styles.content}>
              {(selectedView.name?.toLowerCase() === 'reports' || selectedView.category?.toLowerCase() === 'reports') ? (
                <ReportsDashboard
                  tasks={tasks}
                  setTasks={setTasks}
                  currentUser={user}
                  isAdmin={isAdmin}
                  availableCategories={availableCategories}
                />
              ) : selectedView.type === 'ALL' ? (
                /* LEVEL 1: ALL PROJECTS VIEW -> Show Main Headings Grid */
                (() => {
                  return (
                    <div style={styles.subProjectsGridDashboard}>
                      {availableCategories.map(catName => {
                        const catTasks = tasks.filter(t => t.category === catName);
                        const catSubProjects = Array.from(new Set([
                          ...catTasks.map(t => t.project).filter(Boolean),
                          ...(customProjectsByCategory[catName] || [])
                        ]));
                        const pendingCount = catTasks.filter(t => t.status === 'pending').length;
                        const progressCount = catTasks.filter(t => t.status === 'progress').length;
                        const completedCount = catTasks.filter(t => t.status === 'completed').length;
                        const totalCount = catTasks.length;
                        const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                        return (
                          <div 
                            key={catName} 
                            className="glass-panel animate-fade-in" 
                            style={styles.subProjectDashboardCard}
                            onClick={() => setSelectedView({ type: 'CATEGORY', name: catName })}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={styles.categoryCardIcon}>
                                  <FolderKanban size={22} style={{ color: '#818cf8' }} />
                                </div>
                                <div>
                                  <h3 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                                    {catName}
                                  </h3>
                                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    {catSubProjects.length} {catSubProjects.length === 1 ? 'Sub-Project' : 'Sub-Projects'} • {totalCount} {totalCount === 1 ? 'Task' : 'Tasks'}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                            </div>

                            {/* Progress Bar */}
                            <div style={{ margin: '14px 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                <span>Overall Completion</span>
                                <span style={{ fontWeight: '600', color: '#10b981' }}>{progressPercent}%</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '10px', transition: 'width 0.3s ease' }} />
                              </div>
                            </div>

                            {/* Status Breakdown Pills */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                              <span style={styles.statusPillPending}>
                                🟡 {pendingCount} Yet to Start
                              </span>
                              <span style={styles.statusPillProgress}>
                                🔵 {progressCount} In Progress
                              </span>
                              <span style={styles.statusPillCompleted}>
                                🟢 {completedCount} Completed
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {isAdmin && (
                        <div 
                          className="glass-panel animate-fade-in" 
                          style={styles.addSubProjectDashboardCard}
                          onClick={() => {
                            setNewCategoryInput('');
                            setIsCreateCategoryModalOpen(true);
                          }}
                        >
                          <div style={styles.addIconCircle}>
                            <Plus size={26} style={{ color: 'var(--accent-primary)' }} />
                          </div>
                          <span style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)', marginTop: '10px' }}>
                            Create Main Heading
                          </span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                            Add a new main category (e.g. SEO, Marketing)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : selectedView.type === 'CATEGORY' ? (
                /* LEVEL 2: MAIN HEADING VIEW -> Show Sub-Projects Grid */
                (() => {
                  const catProjects = Array.from(new Set([
                    ...tasks.filter(t => t.category === selectedView.name).map(t => t.project).filter(Boolean),
                    ...(customProjectsByCategory[selectedView.name] || [])
                  ]));

                  return (
                    <div style={styles.subProjectsGridDashboard}>
                      {catProjects.map(projName => {
                        const projTasks = tasks.filter(t => t.category === selectedView.name && t.project === projName);
                        const pendingCount = projTasks.filter(t => t.status === 'pending').length;
                        const progressCount = projTasks.filter(t => t.status === 'progress').length;
                        const completedCount = projTasks.filter(t => t.status === 'completed').length;
                        const totalCount = projTasks.length;
                        const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                        return (
                          <div 
                            key={projName} 
                            className="glass-panel animate-fade-in" 
                            style={styles.subProjectDashboardCard}
                            onClick={() => setSelectedView({ type: 'PROJECT', name: projName, category: selectedView.name })}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={styles.subProjectCardIcon}>
                                  <Folder size={22} style={{ color: 'var(--accent-primary)' }} />
                                </div>
                                <div>
                                  <h3 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                                    {projName}
                                  </h3>
                                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    {totalCount} {totalCount === 1 ? 'Task' : 'Tasks'}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                            </div>

                            {/* Progress Bar */}
                            <div style={{ margin: '14px 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                <span>Progress</span>
                                <span style={{ fontWeight: '600', color: '#10b981' }}>{progressPercent}%</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '10px', transition: 'width 0.3s ease' }} />
                              </div>
                            </div>

                            {/* Status Breakdown Pills */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                              <span style={styles.statusPillPending}>
                                🟡 {pendingCount} Yet to Start
                              </span>
                              <span style={styles.statusPillProgress}>
                                🔵 {progressCount} In Progress
                              </span>
                              <span style={styles.statusPillCompleted}>
                                🟢 {completedCount} Completed
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {isAdmin && (
                        <div 
                          className="glass-panel animate-fade-in" 
                          style={styles.addSubProjectDashboardCard}
                          onClick={() => {
                            setCategoryForNewSubProject(selectedView.name);
                            setNewSubProjectInput('');
                            setIsCreateSubProjectModalOpen(true);
                          }}
                        >
                          <div style={styles.addIconCircle}>
                            <Plus size={26} style={{ color: 'var(--accent-primary)' }} />
                          </div>
                          <span style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)', marginTop: '10px' }}>
                            Create New Sub-Project
                          </span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                            Add a sub-heading project under {selectedView.name}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                /* LEVEL 3: SUB-PROJECT VIEW -> Show 3 Status Task Board Columns */
                <TaskBoard
                  tasks={filteredTasksForBoard}
                  currentUser={user}
                  isAdmin={isAdmin}
                  onEdit={openEditModal}
                  onOpenComments={openCommentModal}
                  onDelete={handleDeleteTask}
                  onStatusChange={(id, newStatus) => handleUpdateTask(id, { status: newStatus })}
                  onUpdateTask={(id, data) => handleUpdateTask(id, data)}
                  onOpenFiles={openFilesModal}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {isModalOpen && selectedView.type !== 'USERS' && (() => {
        const modalCategory = selectedView.type === 'CATEGORY' ? selectedView.name : selectedView.type === 'PROJECT' ? (selectedView.category || 'SEO') : 'SEO';
        const modalSubProjects = customProjectsByCategory[modalCategory] || Array.from(new Set(tasks.filter(t => (t.category || 'SEO') === modalCategory && t.project).map(t => t.project)));
        const modalDefaultProject = selectedView.type === 'PROJECT' ? selectedView.name : (modalSubProjects[0] || 'General Tasks');

        return (
          <TaskModal
            task={editingTask}
            isAdmin={isAdmin}
            availableCategories={availableCategories}
            defaultCategory={modalCategory}
            availableProjects={modalSubProjects.length > 0 ? modalSubProjects : availableProjects}
            defaultProject={editingTask ? editingTask.project : modalDefaultProject}
            onClose={() => {
              setIsModalOpen(false);
              setEditingTask(null);
            }}
            onSubmit={editingTask ? (data) => {
              handleUpdateTask(editingTask.id, data);
              setIsModalOpen(false);
              setEditingTask(null);
            } : handleAddTask}
          />
        );
      })()}

      {isCommentModalOpen && editingTask && (
        <CommentModal
          task={editingTask}
          currentUser={user}
          onClose={() => {
            setIsCommentModalOpen(false);
            setEditingTask(null);
          }}
          onSave={(data) => handleUpdateTask(editingTask.id, data)}
        />
      )}

      {/* Create Main Heading (Category) Modal */}
      {isCreateCategoryModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsCreateCategoryModalOpen(false)}>
          <div className="glass-panel animate-fade-in" style={styles.smallModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Create Main Heading</h3>
              <button style={styles.closeBtn} onClick={() => setIsCreateCategoryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Main Heading Title (Category)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. SEO, Website Development..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={styles.modalFooter}>
                <button type="button" className="btn-secondary" onClick={() => setIsCreateCategoryModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Heading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Main Heading (Category) Modal */}
      {categoryToEdit && (
        <div style={styles.modalOverlay} onClick={() => setCategoryToEdit(null)}>
          <div className="glass-panel animate-fade-in" style={styles.smallModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Rename Main Heading</h3>
              <button style={styles.closeBtn} onClick={() => setCategoryToEdit(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRenameCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>New Heading Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Enter new heading name..."
                  value={editCategoryInput}
                  onChange={(e) => setEditCategoryInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={styles.modalFooter}>
                <button type="button" className="btn-secondary" onClick={() => setCategoryToEdit(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Main Heading Modal */}
      {categoryToDelete && (
        <div style={styles.modalOverlay} onClick={() => setCategoryToDelete(null)}>
          <div className="glass-panel animate-fade-in" style={styles.smallModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: '#ef4444' }}>Delete Main Heading</h3>
              <button style={styles.closeBtn} onClick={() => setCategoryToDelete(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ margin: '16px 0', color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '0.95rem' }}>
              Are you sure you want to delete main heading <strong style={{ color: 'var(--text-primary)' }}>"{categoryToDelete}"</strong> and all of its tasks? This action cannot be undone.
            </div>
            <div style={styles.modalFooter}>
              <button type="button" className="btn-secondary" onClick={() => setCategoryToDelete(null)}>
                Cancel
              </button>
              <button 
                type="button" 
                style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: '500' }}
                onClick={handleDeleteCategoryConfirm}
              >
                Delete Heading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Sub-Project Modal */}
      {isCreateSubProjectModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsCreateSubProjectModalOpen(false)}>
          <div className="glass-panel animate-fade-in" style={styles.smallModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Add Sub-Project</h3>
              <button style={styles.closeBtn} onClick={() => setIsCreateSubProjectModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSubProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Parent Heading: <strong>{categoryForNewSubProject}</strong></label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. SEO Audit, Keyword Strategy..."
                  value={newSubProjectInput}
                  onChange={(e) => setNewSubProjectInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={styles.modalFooter}>
                <button type="button" className="btn-secondary" onClick={() => setIsCreateSubProjectModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Sub-Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Rename Sub-Project Modal */}
      {projectToEdit && (
        <div style={styles.modalOverlay} onClick={() => setProjectToEdit(null)}>
          <div className="glass-panel animate-fade-in" style={styles.smallModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Rename Sub-Project</h3>
              <button style={styles.closeBtn} onClick={() => setProjectToEdit(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRenameProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>New Sub-Project Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Enter new sub-project name..."
                  value={editProjectInput}
                  onChange={(e) => setEditProjectInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={styles.modalFooter}>
                <button type="button" className="btn-secondary" onClick={() => setProjectToEdit(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Sub-Project Modal */}
      {projectToDelete && (
        <div style={styles.modalOverlay} onClick={() => setProjectToDelete(null)}>
          <div className="glass-panel animate-fade-in" style={styles.smallModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: '#ef4444' }}>Delete Sub-Project</h3>
              <button style={styles.closeBtn} onClick={() => setProjectToDelete(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ margin: '16px 0', color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '0.95rem' }}>
              Are you sure you want to delete sub-project <strong style={{ color: 'var(--text-primary)' }}>"{projectToDelete}"</strong> and all of its tasks? This action cannot be undone.
            </div>
            <div style={styles.modalFooter}>
              <button type="button" className="btn-secondary" onClick={() => setProjectToDelete(null)}>
                Cancel
              </button>
              <button 
                type="button" 
                style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: '500' }}
                onClick={handleDeleteProjectConfirm}
              >
                Delete Sub-Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '40px',
  },
  logoIcon: {
    backgroundColor: 'var(--accent-primary)',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 12px var(--accent-glow)',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    justifyContent: 'space-between',
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--accent-primary)',
    fontWeight: '500',
    cursor: 'pointer',
    justifyContent: 'space-between',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    overflow: 'hidden',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: '600',
    color: 'white',
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100px',
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    color: 'var(--text-muted)',
    padding: '8px',
    borderRadius: '8px',
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: '600',
    marginBottom: '4px',
  },
  pageSubtitle: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
  },
  badge: {
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '12px',
    marginLeft: 'auto',
  },
  projectsSectionContainer: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  projectsSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 8px',
    marginBottom: '4px',
  },
  projectsSectionTitle: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
  },
  addProjectBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-secondary)',
    transition: 'all 0.2s ease',
  },
  projectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    maxHeight: 'calc(100vh - 260px)',
    overflowY: 'auto',
  },
  projectItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '0.88rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  projectItemActive: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#818cf8',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    fontSize: '0.88rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  projectBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--text-secondary)',
    fontSize: '0.72rem',
    fontWeight: '600',
    padding: '2px 7px',
    borderRadius: '10px',
  },
  activeProjectTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#818cf8',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    padding: '4px 12px',
    borderRadius: '20px',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  categoryHeaderActive: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: '10px',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#818cf8',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  categoryTitleText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#818cf8',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '2px 7px',
    borderRadius: '10px',
  },
  expandBtn: {
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    borderRadius: '4px',
  },
  subProjectsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    paddingLeft: '14px',
    borderLeft: '1px dashed rgba(255, 255, 255, 0.12)',
    marginLeft: '12px',
    marginTop: '2px',
    marginBottom: '4px',
  },
  subProjectItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    fontSize: '0.83rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  subProjectItemActive: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    borderRadius: '8px',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    color: '#818cf8',
    fontSize: '0.83rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  subProjectBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-muted)',
    fontSize: '0.68rem',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '8px',
  },
  projectActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '4px',
  },
  projectActionBtn: {
    padding: '4px',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  modalOverlay: {
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
  smallModalContent: {
    width: '100%',
    maxWidth: '420px',
    padding: '28px',
    backgroundColor: '#151821',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '20px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '1.3rem',
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
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  subProjectsGridDashboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginTop: '8px',
  },
  subProjectDashboardCard: {
    padding: '24px',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  subProjectCardIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid rgba(99, 102, 241, 0.3)',
  },
  categoryCardIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid rgba(129, 140, 248, 0.3)',
  },
  addSubProjectDashboardCard: {
    padding: '24px',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    border: '2px dashed rgba(99, 102, 241, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '180px',
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
  },
  addIconCircle: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPillPending: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid rgba(251, 191, 36, 0.2)',
  },
  statusPillProgress: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#60a5fa',
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid rgba(96, 165, 250, 0.2)',
  },
  statusPillCompleted: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#34d399',
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid rgba(52, 211, 153, 0.2)',
  }
};
