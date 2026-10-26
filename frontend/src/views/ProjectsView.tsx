import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Calendar,
  User,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Link as LinkIcon,
} from 'lucide-react';
import { api } from '../services/api';
import { ProjectShareLinkModal } from '../components/common/ProjectShareLinkModal';
import type { Project, ProjectInput, Client } from '../types';

export const ProjectsView: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Client Communication Link Modal State
  const [shareModalProject, setShareModalProject] = useState<Project | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formValues, setFormValues] = useState<ProjectInput>({
    client_id: 0,
    title: '',
    description: '',
    status: 'planning',
    budget: undefined,
    deadline: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load clients and projects
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [projectsData, clientsData] = await Promise.all([
        api.getProjects({
          search: searchQuery.trim() || undefined,
        }),
        api.getClients({ is_archived: false }),
      ]);
      setProjects(projectsData);
      setClients(clientsData);
      if (clientsData.length > 0 && formValues.client_id === 0) {
        setFormValues((prev) => ({ ...prev, client_id: clientsData[0].id }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingProject(null);
    setFormValues({
      client_id: clients.length > 0 ? clients[0].id : 0,
      title: '',
      description: '',
      status: 'planning',
      budget: undefined,
      deadline: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setFormValues({
      client_id: project.client_id,
      title: project.title,
      description: project.description || '',
      status: project.status,
      budget: project.budget || undefined,
      deadline: project.deadline || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formValues.title.trim()) {
      errors.title = 'Project title is required';
    }
    if (!formValues.client_id || formValues.client_id === 0) {
      errors.client_id = 'Please select a client';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingProject) {
        await api.updateProject(editingProject.id, formValues);
        setSuccessMsg(`Project "${formValues.title}" updated successfully.`);
      } else {
        await api.createProject(formValues);
        setSuccessMsg(`Project "${formValues.title}" created successfully.`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Failed to save project' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete project
  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Are you sure you want to delete project "${project.title}"?`)) {
      return;
    }
    try {
      await api.deleteProject(project.id);
      setSuccessMsg(`Deleted project "${project.title}".`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete project');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return { text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      case 'completed':
        return { text: '#34d399', border: 'rgba(52, 211, 153, 0.3)' };
      case 'on_hold':
        return { text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' };
      default:
        return { text: '#a78bfa', border: 'rgba(167, 139, 250, 0.3)' };
    }
  };

  return (
    <div>
      {/* View Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
            Client Engagements & Projects
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Manage active client projects, budgets, deadlines, and delivery milestones.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', color: '#34d399' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', color: '#f87171' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          {['all', 'in_progress', 'planning', 'completed', 'on_hold'].map((st) => (
            <button
              key={st}
              type="button"
              className={`nav-tag ${statusFilter === st ? 'phase' : ''}`}
              style={{ cursor: 'pointer', border: 'none', padding: '6px 14px', textTransform: 'capitalize' }}
              onClick={() => setStatusFilter(st)}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          Loading projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="saas-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Briefcase size={40} color="#64748b" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
            No projects found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '420px', margin: '0 auto 16px' }}>
            {searchQuery ? 'No project matched your search term.' : 'Create your first project linked to an active client.'}
          </p>
          <button type="button" className="btn-primary" onClick={handleOpenCreate}>
            <Plus size={15} />
            <span>New Project</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {filteredProjects.map((project) => {
            const stColor = getStatusColor(project.status);
            return (
              <div key={project.id} className="saas-card">
                <div className="card-header-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="card-icon-pill cyan">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 600, color: '#f8fafc' }}>
                        {project.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#818cf8', marginTop: '2px' }}>
                        <User size={12} />
                        <span>{project.client_name || `Client #${project.client_id}`}</span>
                      </div>
                    </div>
                  </div>

                  <span className="nav-tag" style={{ color: stColor.text, borderColor: stColor.border, textTransform: 'capitalize' }}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '14px 0', minHeight: '40px' }}>
                  {project.description || 'No description provided.'}
                </p>

                {/* Project Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Allocated Budget
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
                      {project.budget !== null && project.budget !== undefined
                        ? `$${project.budget.toLocaleString()}`
                        : 'Not set'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Target Deadline
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px' }}>
                      <Calendar size={13} color="#94a3b8" />
                      <span>{project.deadline || 'Flexible'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    title="Unique client communication link"
                    onClick={() => setShareModalProject(project)}
                  >
                    <LinkIcon size={12} color="#818cf8" />
                    <span>Client Link</span>
                  </button>

                  <button
                    type="button"
                    className="action-icon-btn"
                    title="Edit project"
                    onClick={() => handleOpenEdit(project)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="action-icon-btn"
                    title="Delete project"
                    onClick={() => handleDelete(project)}
                  >
                    <Trash2 size={13} color="#f87171" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Project */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xl)', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                {editingProject ? 'Edit Project' : 'New Client Project'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {formErrors.submit && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '16px', color: '#f87171', fontSize: '0.84rem' }}>
                {formErrors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Linked Client *
                </label>
                <select
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  value={formValues.client_id}
                  onChange={(e) => setFormValues({ ...formValues, client_id: Number(e.target.value) })}
                >
                  {clients.length === 0 ? (
                    <option value={0}>No clients available</option>
                  ) : (
                    clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))
                  )}
                </select>
                {formErrors.client_id && (
                  <span style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '2px', display: 'block' }}>
                    {formErrors.client_id}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Project Title *
                </label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  placeholder="e.g. Omnichannel Commerce Upgrade"
                  value={formValues.title}
                  onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
                />
                {formErrors.title && (
                  <span style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '2px', display: 'block' }}>
                    {formErrors.title}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Description & Scope
                </label>
                <textarea
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Summary of deliverables, goals, and technical scope..."
                  value={formValues.description}
                  onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    value={formValues.status}
                    onChange={(e) => setFormValues({ ...formValues, status: e.target.value })}
                  >
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Budget (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    placeholder="25000"
                    value={formValues.budget ?? ''}
                    onChange={(e) => setFormValues({ ...formValues, budget: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Deadline Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  value={formValues.deadline}
                  onChange={(e) => setFormValues({ ...formValues, deadline: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Client Communication Share Link */}
      {shareModalProject && (
        <ProjectShareLinkModal
          project={shareModalProject}
          isOpen={Boolean(shareModalProject)}
          onClose={() => setShareModalProject(null)}
        />
      )}
    </div>
  );
};
