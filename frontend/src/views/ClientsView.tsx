import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Archive,
  RotateCcw,
  Edit2,
  Trash2,
  Building,
  Mail,
  Phone,
  Briefcase,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import type { Client, ClientInput } from '../types';

export const ClientsView: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formValues, setFormValues] = useState<ClientInput>({
    name: '',
    email: '',
    company: '',
    phone: '',
    status: 'active',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load clients
  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const isArchived = filterTab === 'archived' ? true : filterTab === 'active' ? false : undefined;
      const data = await api.getClients({
        is_archived: isArchived,
        search: searchQuery.trim() || undefined,
      });
      setClients(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  }, [filterTab, searchQuery]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormValues({
      name: '',
      email: '',
      company: '',
      phone: '',
      status: 'active',
      notes: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormValues({
      name: client.name,
      email: client.email,
      company: client.company || '',
      phone: client.phone || '',
      status: client.status,
      notes: client.notes || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formValues.name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!formValues.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      errors.email = 'Enter a valid email address';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit create or edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, formValues);
        setSuccessMsg(`Client "${formValues.name}" updated successfully.`);
      } else {
        await api.createClient(formValues);
        setSuccessMsg(`Client "${formValues.name}" created successfully.`);
      }
      setIsModalOpen(false);
      loadClients();
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Failed to save client' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive / Unarchive
  const handleToggleArchive = async (client: Client) => {
    try {
      if (client.is_archived) {
        await api.unarchiveClient(client.id);
        setSuccessMsg(`Restored "${client.name}" to active status.`);
      } else {
        await api.archiveClient(client.id);
        setSuccessMsg(`Archived "${client.name}".`);
      }
      loadClients();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed');
    }
  };

  // Delete
  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Are you sure you want to permanently delete client "${client.name}"? This will also remove their linked projects and conversations.`)) {
      return;
    }
    try {
      await api.deleteClient(client.id);
      setSuccessMsg(`Deleted client "${client.name}".`);
      loadClients();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete client');
    }
  };

  return (
    <div>
      {/* View Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
            Client Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Manage client profiles, contact points, and linked project engagements.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={handleOpenCreate}>
          <UserPlus size={16} />
          <span>Add New Client</span>
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
          <button
            type="button"
            className={`nav-tag ${filterTab === 'active' ? 'phase' : ''}`}
            style={{ cursor: 'pointer', border: 'none', padding: '6px 14px' }}
            onClick={() => setFilterTab('active')}
          >
            Active ({clients.filter(c => !c.is_archived).length})
          </button>
          <button
            type="button"
            className={`nav-tag ${filterTab === 'archived' ? 'phase' : ''}`}
            style={{ cursor: 'pointer', border: 'none', padding: '6px 14px' }}
            onClick={() => setFilterTab('archived')}
          >
            Archived ({clients.filter(c => c.is_archived).length})
          </button>
          <button
            type="button"
            className={`nav-tag ${filterTab === 'all' ? 'phase' : ''}`}
            style={{ cursor: 'pointer', border: 'none', padding: '6px 14px' }}
            onClick={() => setFilterTab('all')}
          >
            All
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Client List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          Loading client database...
        </div>
      ) : clients.length === 0 ? (
        <div className="saas-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Users size={40} color="#64748b" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
            No clients found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '420px', margin: '0 auto 16px' }}>
            {searchQuery ? 'No client matched your search criteria.' : 'Get started by creating your first client.'}
          </p>
          <button type="button" className="btn-primary" onClick={handleOpenCreate}>
            <UserPlus size={15} />
            <span>Add Client</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {clients.map((client) => (
            <div key={client.id} className="saas-card" style={{ opacity: client.is_archived ? 0.75 : 1 }}>
              <div className="card-header-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className={`card-icon-pill ${client.is_archived ? 'purple' : 'primary'}`}>
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                      {client.name}
                    </h3>
                    {client.company && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <Building size={12} />
                        <span>{client.company}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {client.is_archived ? (
                    <span className="nav-tag" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                      Archived
                    </span>
                  ) : (
                    <span className="nav-tag" style={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}>
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Contact meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '14px 0', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Mail size={13} color="#818cf8" />
                  <a href={`mailto:${client.email}`} style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                    {client.email}
                  </a>
                </div>
                {client.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Phone size={13} color="#818cf8" />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>

              {client.notes && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  {client.notes}
                </p>
              )}

              {/* Counts & Actions Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Briefcase size={12} /> {client.projects_count ?? 0} Projects
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageSquare size={12} /> {client.conversations_count ?? 0} Threads
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="action-icon-btn"
                    title="Edit client"
                    onClick={() => handleOpenEdit(client)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="action-icon-btn"
                    title={client.is_archived ? 'Restore Client' : 'Archive Client'}
                    onClick={() => handleToggleArchive(client)}
                  >
                    {client.is_archived ? <RotateCcw size={13} color="#34d399" /> : <Archive size={13} color="#fbbf24" />}
                  </button>
                  <button
                    type="button"
                    className="action-icon-btn"
                    title="Delete permanently"
                    onClick={() => handleDelete(client)}
                  >
                    <Trash2 size={13} color="#f87171" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create or Edit Client */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xl)', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                {editingClient ? 'Edit Client Profile' : 'Add New Client'}
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
                  Full Name *
                </label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  placeholder="e.g. Elena Vance"
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                />
                {formErrors.name && (
                  <span style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '2px', display: 'block' }}>
                    {formErrors.name}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  placeholder="elena@company.com"
                  value={formValues.email}
                  onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                />
                {formErrors.email && (
                  <span style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '2px', display: 'block' }}>
                    {formErrors.email}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Company
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    placeholder="Nexus Retail"
                    value={formValues.company}
                    onChange={(e) => setFormValues({ ...formValues, company: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Phone
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    placeholder="+1 (555) 000-0000"
                    value={formValues.phone}
                    onChange={(e) => setFormValues({ ...formValues, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Notes & Context
                </label>
                <textarea
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Key background notes, active priorities, or preferences..."
                  value={formValues.notes}
                  onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
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
                  {isSubmitting ? 'Saving...' : editingClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
