import React, { useState, useEffect, useCallback } from 'react';
import {
  BookUser,
  Plus,
  Search,
  Mail,
  Phone,
  MessageCircle,
  Globe,
  Building,
  Briefcase,
  User,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  Star,
} from 'lucide-react';
import { api } from '../services/api';
import type { Contact, ContactInput, Client, Project } from '../types';

export const ContactsView: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [consentFilter, setConsentFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Messages / Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<ContactInput>({
    name: '',
    company: '',
    email: '',
    phone: '',
    whatsapp: '',
    preferred_channel: 'email',
    consent_status: 'opted_in',
    notes: '',
    client_id: undefined,
    project_id: undefined,
    is_primary: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact Details Modal State
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load Contacts, Clients, and Projects
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params: any = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (channelFilter !== 'all') params.preferred_channel = channelFilter;
      if (consentFilter !== 'all') params.consent_status = consentFilter;
      if (clientFilter !== 'all') params.client_id = Number(clientFilter);

      const [contactsData, clientsData, projectsData] = await Promise.all([
        api.getContacts(params),
        api.getClients({ is_archived: false }),
        api.getProjects(),
      ]);

      setContacts(contactsData);
      setClients(clientsData);
      setProjects(projectsData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load contacts directory.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, channelFilter, consentFilter, clientFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      company: clients.length > 0 ? clients[0].company || '' : '',
      email: '',
      phone: '',
      whatsapp: '',
      preferred_channel: 'email',
      consent_status: 'opted_in',
      notes: '',
      client_id: clients.length > 0 ? clients[0].id : undefined,
      project_id: undefined,
      is_primary: false,
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      company: contact.company || '',
      email: contact.email,
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      preferred_channel: contact.preferred_channel,
      consent_status: contact.consent_status,
      notes: contact.notes || '',
      client_id: contact.client_id || undefined,
      project_id: contact.project_id || undefined,
      is_primary: contact.is_primary,
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Client dropdown change in form (auto-fill company if empty)
  const handleClientChange = (clientId: number) => {
    const selected = clients.find((c) => c.id === clientId);
    setFormData((prev) => ({
      ...prev,
      client_id: clientId > 0 ? clientId : undefined,
      company: !prev.company || prev.company === '' ? (selected?.company || '') : prev.company,
      project_id: undefined, // reset project when client changes
    }));
  };

  // Copy Phone to WhatsApp Helper
  const handleCopyPhoneToWhatsApp = () => {
    if (formData.phone) {
      setFormData((prev) => ({ ...prev, whatsapp: prev.phone }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please provide a valid email format (e.g. name@company.com)';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Form (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const payload: ContactInput = {
        name: formData.name.trim(),
        company: formData.company?.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone?.trim() || undefined,
        whatsapp: formData.whatsapp?.trim() || undefined,
        preferred_channel: formData.preferred_channel,
        consent_status: formData.consent_status,
        notes: formData.notes?.trim() || undefined,
        client_id: formData.client_id ? Number(formData.client_id) : undefined,
        project_id: formData.project_id ? Number(formData.project_id) : undefined,
        is_primary: formData.is_primary ?? false,
      };

      if (editingContact) {
        await api.updateContact(editingContact.id, payload);
        setSuccessMsg(`Contact "${payload.name}" updated successfully.`);
      } else {
        await api.createContact(payload);
        setSuccessMsg(`Contact "${payload.name}" created successfully.`);
      }

      setIsFormModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Failed to save contact.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Contact
  const handleDelete = async (contact: Contact) => {
    if (!window.confirm(`Are you sure you want to delete contact "${contact.name}"?`)) {
      return;
    }

    try {
      await api.deleteContact(contact.id);
      setSuccessMsg(`Contact "${contact.name}" was removed.`);
      if (detailContact?.id === contact.id) {
        setDetailContact(null);
      }
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete contact.');
    }
  };

  // Copy to clipboard helper
  const handleCopyText = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  };

  // Channel badge styling helper
  const getChannelBadge = (ch: string) => {
    switch (ch) {
      case 'whatsapp':
        return { label: 'WhatsApp', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: <MessageCircle size={12} /> };
      case 'phone':
        return { label: 'Phone Call', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: <Phone size={12} /> };
      case 'portal':
        return { label: 'Client Portal', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', icon: <Globe size={12} /> };
      default:
        return { label: 'Email', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)', icon: <Mail size={12} /> };
    }
  };

  // Consent status badge helper
  const getConsentBadge = (status: string) => {
    switch (status) {
      case 'opted_out':
        return { label: 'Opted Out', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.35)' };
      case 'pending':
        return { label: 'Consent Pending', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.35)' };
      default:
        return { label: 'Opted In', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' };
    }
  };

  // Filter projects by selected client in form modal
  const formProjects = projects.filter((p) => {
    if (!formData.client_id) return true;
    return p.client_id === formData.client_id;
  });

  // Calculate Metrics
  const totalCount = contacts.length;
  const optedInCount = contacts.filter((c) => c.consent_status === 'opted_in').length;
  const whatsappCount = contacts.filter((c) => Boolean(c.whatsapp)).length;
  const primaryCount = contacts.filter((c) => c.is_primary).length;

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="view-title">Contacts Directory</h2>
            <span className="nav-tag phase" style={{ fontSize: '0.72rem' }}>
              Phase 6
            </span>
          </div>
          <p className="view-subtitle">
            Manage client stakeholders, multi-channel preferences, WhatsApp routing, and communication consent.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleOpenCreate}
        >
          <Plus size={16} />
          <span>New Contact</span>
        </button>
      </div>

      {/* KPI Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="saas-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Contacts
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
            {totalCount}
          </div>
        </div>

        <div className="saas-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Consent Opted-In
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>
            {optedInCount}
          </div>
        </div>

        <div className="saas-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            WhatsApp Configured
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {whatsappCount}
          </div>
        </div>

        <div className="saas-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Primary Stakeholders
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#818cf8', marginTop: '4px' }}>
            {primaryCount}
          </div>
        </div>
      </div>

      {/* Alert Notices */}
      {successMsg && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="saas-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', paddingLeft: '36px' }}
              placeholder="Search by contact name, company, email, phone, or WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {/* Channel Filter */}
            <select
              className="search-input"
              style={{ paddingLeft: '10px', fontSize: '0.82rem' }}
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
              <option value="portal">Client Portal</option>
            </select>

            {/* Consent Status Filter */}
            <select
              className="search-input"
              style={{ paddingLeft: '10px', fontSize: '0.82rem' }}
              value={consentFilter}
              onChange={(e) => setConsentFilter(e.target.value)}
            >
              <option value="all">All Consent</option>
              <option value="opted_in">Opted In</option>
              <option value="pending">Pending</option>
              <option value="opted_out">Opted Out</option>
            </select>

            {/* Client Filter */}
            <select
              className="search-input"
              style={{ paddingLeft: '10px', fontSize: '0.82rem', maxWidth: '180px' }}
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contacts List / Cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Loading contacts directory...
        </div>
      ) : contacts.length === 0 ? (
        <div className="saas-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <BookUser size={42} color="#64748b" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
            No contacts found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', maxWidth: '400px', margin: '0 auto 18px' }}>
            {searchQuery || channelFilter !== 'all' || consentFilter !== 'all' || clientFilter !== 'all'
              ? 'No contacts matched your search and filter criteria.'
              : 'Add your first stakeholder or point of contact linked to a client.'}
          </p>
          <button type="button" className="btn-primary" onClick={handleOpenCreate}>
            <Plus size={15} />
            <span>New Contact</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {contacts.map((contact) => {
            const chBadge = getChannelBadge(contact.preferred_channel);
            const csBadge = getConsentBadge(contact.consent_status);
            const initials = contact.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div key={contact.id} className="saas-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* Card Header Row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--radius-lg)',
                          background: contact.is_primary
                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: contact.is_primary
                            ? '1px solid rgba(168, 85, 247, 0.5)'
                            : '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: contact.is_primary ? '#c084fc' : '#94a3b8',
                        }}
                      >
                        {initials}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h3
                            style={{
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: '#f8fafc',
                              margin: 0,
                              cursor: 'pointer',
                            }}
                            onClick={() => setDetailContact(contact)}
                            title="Click to view full contact details"
                          >
                            {contact.name}
                          </h3>
                          {contact.is_primary && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: '#c084fc',
                                background: 'rgba(192, 132, 252, 0.15)',
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-pill)',
                                border: '1px solid rgba(192, 132, 252, 0.3)',
                              }}
                            >
                              <Star size={10} fill="#c084fc" /> PRIMARY
                            </span>
                          )}
                        </div>

                        {contact.company && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            <Building size={12} color="#94a3b8" />
                            <span>{contact.company}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Consent Status Badge */}
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: csBadge.color,
                        background: csBadge.bg,
                        border: `1px solid ${csBadge.border}`,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-pill)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {csBadge.label}
                    </span>
                  </div>

                  {/* Contact Channels Grid */}
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                        <Mail size={12} color="#818cf8" />
                        <span style={{ wordBreak: 'break-all' }}>{contact.email}</span>
                      </span>
                    </div>

                    {contact.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                          <Phone size={12} color="#f59e0b" />
                          <span>{contact.phone}</span>
                        </span>
                      </div>
                    )}

                    {contact.whatsapp && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                          <MessageCircle size={12} color="#10b981" />
                          <span>WhatsApp: {contact.whatsapp}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Channel Preference & Link Tags */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {/* Preferred Channel */}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: chBadge.color,
                        background: chBadge.bg,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {chBadge.icon}
                      <span>Prefers {chBadge.label}</span>
                    </span>

                    {/* Linked Client */}
                    {contact.client_name && (
                      <span className="nav-tag" style={{ fontSize: '0.7rem' }}>
                        <User size={10} style={{ marginRight: '3px' }} />
                        {contact.client_name}
                      </span>
                    )}

                    {/* Linked Project */}
                    {contact.project_title && (
                      <span className="nav-tag" style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                        <Briefcase size={10} style={{ marginRight: '3px' }} />
                        {contact.project_title}
                      </span>
                    )}
                  </div>

                  {contact.notes && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: '6px 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      "{contact.notes}"
                    </p>
                  )}
                </div>

                {/* Card Actions Bottom Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                    onClick={() => setDetailContact(contact)}
                  >
                    <span>View Profile</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="action-icon-btn"
                      title="Edit contact"
                      onClick={() => handleOpenEdit(contact)}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="action-icon-btn"
                      title="Delete contact"
                      onClick={() => handleDelete(contact)}
                    >
                      <Trash2 size={13} color="#f87171" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Create or Edit Contact */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xl)', maxWidth: '560px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="card-icon-pill cyan">
                  <BookUser size={18} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  {editingContact ? 'Edit Contact' : 'New Contact Profile'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
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

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Full Name & Company */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    placeholder="e.g. Liam Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  {formErrors.name && (
                    <span style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '2px', display: 'block' }}>
                      {formErrors.name}
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    placeholder="e.g. Nexus Retail Group"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  placeholder="e.g. liam.patel@nexusretail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                {formErrors.email && (
                  <span style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '2px', display: 'block' }}>
                    {formErrors.email}
                  </span>
                )}
              </div>

              {/* Phone & WhatsApp */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    placeholder="+1 (555) 345-6789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      WhatsApp Number
                    </label>
                    {formData.phone && (
                      <button
                        type="button"
                        onClick={handleCopyPhoneToWhatsApp}
                        style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                      >
                        Copy Phone
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    placeholder="+1 (555) 345-6789"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              {/* Channel & Consent */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Preferred Channel
                  </label>
                  <select
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    value={formData.preferred_channel}
                    onChange={(e: any) => setFormData({ ...formData, preferred_channel: e.target.value })}
                  >
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Phone</option>
                    <option value="portal">Client Portal</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Consent Status
                  </label>
                  <select
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    value={formData.consent_status}
                    onChange={(e: any) => setFormData({ ...formData, consent_status: e.target.value })}
                  >
                    <option value="opted_in">Opted In (Active)</option>
                    <option value="pending">Pending Confirmation</option>
                    <option value="opted_out">Opted Out (Suppressed)</option>
                  </select>
                </div>
              </div>

              {/* Linked Client & Project */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Linked Client
                  </label>
                  <select
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    value={formData.client_id || 0}
                    onChange={(e) => handleClientChange(Number(e.target.value))}
                  >
                    <option value={0}>None (Independent)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Linked Project
                  </label>
                  <select
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    value={formData.project_id || 0}
                    onChange={(e) => setFormData({ ...formData, project_id: Number(e.target.value) || undefined })}
                  >
                    <option value={0}>None (General Contact)</option>
                    {formProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Primary Contact Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                <input
                  type="checkbox"
                  id="is_primary_checkbox"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#818cf8', cursor: 'pointer' }}
                />
                <label htmlFor="is_primary_checkbox" style={{ fontSize: '0.84rem', color: '#f8fafc', cursor: 'pointer' }}>
                  Designate as Primary Point of Contact for this account
                </label>
              </div>

              {/* Internal Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Internal Notes & Preferences
                </label>
                <textarea
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px', minHeight: '75px', resize: 'vertical' }}
                  placeholder="e.g. Lead architect, prefers technical specs over email..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingContact ? 'Update Contact' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Contact Profile & Details Drawer */}
      {/* ========================================================================= */}
      {detailContact && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xl)', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#c084fc',
                  }}
                >
                  {detailContact.name.slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      {detailContact.name}
                    </h3>
                    {detailContact.is_primary && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#c084fc', background: 'rgba(192, 132, 252, 0.15)', padding: '1px 6px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {detailContact.company || 'Independent Contact'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailContact(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Channels & Verification Card */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#e2e8f0' }}>
                  <Mail size={14} color="#818cf8" />
                  <span>{detailContact.email}</span>
                </span>
                <button
                  type="button"
                  className="action-icon-btn"
                  title="Copy email"
                  onClick={() => handleCopyText(detailContact.email, 'email')}
                >
                  {copiedField === 'email' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                </button>
              </div>

              {/* Phone */}
              {detailContact.phone && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    <Phone size={14} color="#f59e0b" />
                    <span>Phone: {detailContact.phone}</span>
                  </span>
                  <button
                    type="button"
                    className="action-icon-btn"
                    title="Copy phone"
                    onClick={() => handleCopyText(detailContact.phone || '', 'phone')}
                  >
                    {copiedField === 'phone' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                  </button>
                </div>
              )}

              {/* WhatsApp */}
              {detailContact.whatsapp && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#34d399' }}>
                    <MessageCircle size={14} color="#10b981" />
                    <span>WhatsApp: {detailContact.whatsapp}</span>
                  </span>
                  <button
                    type="button"
                    className="action-icon-btn"
                    title="Copy WhatsApp"
                    onClick={() => handleCopyText(detailContact.whatsapp || '', 'whatsapp')}
                  >
                    {copiedField === 'whatsapp' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                  </button>
                </div>
              )}
            </div>

            {/* Routing & Consent Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Preferred Channel
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', marginTop: '2px', textTransform: 'capitalize' }}>
                  {detailContact.preferred_channel}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Consent Status
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: detailContact.consent_status === 'opted_in' ? '#34d399' : detailContact.consent_status === 'pending' ? '#eab308' : '#f43f5e', marginTop: '2px', textTransform: 'capitalize' }}>
                  {detailContact.consent_status.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Account & Project Affiliation */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Account & Project Affiliations
              </div>
              <div style={{ fontSize: '0.84rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} color="#818cf8" />
                <span>Client: <strong>{detailContact.client_name || 'None'}</strong></span>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={13} />
                <span>Project: <strong>{detailContact.project_title || 'General Account'}</strong></span>
              </div>
            </div>

            {/* Internal Notes */}
            {detailContact.notes && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Internal Notes
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {detailContact.notes}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
              <span>Created: {new Date(detailContact.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(detailContact.updated_at).toLocaleDateString()}</span>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const target = detailContact;
                  setDetailContact(null);
                  handleOpenEdit(target);
                }}
              >
                <Edit2 size={13} />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setDetailContact(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
