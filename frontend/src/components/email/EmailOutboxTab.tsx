import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Search,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Send,
  User,
  Briefcase,
  Inbox,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { SendEmailModal } from './SendEmailModal';
import type { EmailMessage, EmailFilterParams, Contact } from '../../types';

export const EmailOutboxTab: React.FC = () => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeContact, setComposeContact] = useState<Contact | null>(null);

  // Inbound Simulation Modal State
  const [isInboundSimOpen, setIsInboundSimOpen] = useState(false);
  const [simFromEmail, setSimFromEmail] = useState('david.miller@apexdynamics.example.com');
  const [simSubject, setSimSubject] = useState('Re: Project Deliverables & Timeline Update');
  const [simBody, setSimBody] = useState('Thank you for the update! We reviewed the latest deliverables and everything looks great. We are ready to proceed with Phase 3.');
  const [isSimulating, setIsSimulating] = useState(false);

  // Load emails
  const loadEmails = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMsg(null);

    try {
      const params: EmailFilterParams = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (directionFilter !== 'all') params.direction = directionFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const data = await api.getEmails(params);
      setEmails(data);

      if (data.length > 0) {
        // Keep selected email if still in list, or select first
        setSelectedEmail((prev) => {
          if (!prev) return data[0];
          const match = data.find((e) => e.id === prev.id);
          return match || data[0];
        });
      } else {
        setSelectedEmail(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load email messages.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, directionFilter, statusFilter]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Handle Inbound Reply Simulation
  const handleSimulateInboundReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simFromEmail.trim() || !simBody.trim()) {
      setErrorMsg('From email and reply text are required.');
      return;
    }

    setIsSimulating(true);
    setErrorMsg(null);
    try {
      const result = await api.simulateInboundWebhook({
        from_email: simFromEmail.trim(),
        subject: simSubject.trim() || 'Re: Client Communication',
        text: simBody.trim(),
      });

      setSuccessMsg(
        `Inbound reply received from ${result.matched_contact || simFromEmail}! Associated pending follow-ups updated.`
      );
      setIsInboundSimOpen(false);
      await loadEmails(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to simulate inbound webhook.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Metrics
  const totalEmails = emails.length;
  const outboundCount = emails.filter((e) => e.direction === 'outbound').length;
  const inboundCount = emails.filter((e) => e.direction === 'inbound').length;
  const aiDraftedCount = emails.filter((e) => e.ai_drafted).length;
  const failedCount = emails.filter((e) => e.status === 'failed').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return { label: 'Sent', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' };
      case 'received':
        return { label: 'Received', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' };
      case 'failed':
        return { label: 'Failed', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)' };
      default:
        return { label: 'Queued', color: '#facc15', bg: 'rgba(250, 204, 21, 0.15)', border: 'rgba(250, 204, 21, 0.35)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
        <div className="saas-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Emails Exchanged
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
            {totalEmails}
          </div>
        </div>

        <div className="saas-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Outbound Dispatched
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#818cf8', marginTop: '4px' }}>
            {outboundCount}
          </div>
        </div>

        <div className="saas-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Inbound Replies
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
            {inboundCount}
          </div>
        </div>

        <div className="saas-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            AI-Assisted Messages
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#c084fc', marginTop: '4px' }}>
            {aiDraftedCount}
          </div>
        </div>

        {failedCount > 0 && (
          <div className="saas-card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Delivery Failures
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f87171', marginTop: '4px' }}>
              {failedCount}
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#34d399' }}>
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
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f87171' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter & Action Toolbar */}
      <div
        className="saas-card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', paddingLeft: '32px', fontSize: '0.84rem' }}
              placeholder="Search recipient, subject, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Direction Filter */}
          <select
            className="search-input"
            style={{ width: 'auto', minWidth: '130px', fontSize: '0.82rem', paddingLeft: '10px' }}
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
          >
            <option value="all">All Directions</option>
            <option value="outbound">Outbound (Sent)</option>
            <option value="inbound">Inbound (Replies)</option>
          </select>

          {/* Status Filter */}
          <select
            className="search-input"
            style={{ width: 'auto', minWidth: '110px', fontSize: '0.82rem', paddingLeft: '10px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            onClick={() => loadEmails(true)}
            title="Refresh emails"
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '6px 12px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
            onClick={() => setIsInboundSimOpen(true)}
            title="Simulate an inbound client email reply webhook"
          >
            <Inbox size={14} />
            <span>Simulate Reply</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            onClick={() => {
              setComposeContact(null);
              setIsComposeOpen(true);
            }}
          >
            <Plus size={15} />
            <span>Compose Email</span>
          </button>
        </div>
      </div>

      {/* Main Two-Pane Split View */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', minHeight: '620px', alignItems: 'stretch' }}>
        {/* Left Pane: Email List */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', height: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
              Messages ({emails.length})
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Ordered by latest
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                <p>Loading email records...</p>
              </div>
            ) : emails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                <Mail size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1' }}>No email messages found</p>
                <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  Click "Compose Email" to send an outbound message to a contact.
                </p>
              </div>
            ) : (
              emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                const statusBadge = getStatusBadge(email.status);
                const isOutbound = email.direction === 'outbound';

                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    style={{
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {/* Top Row: Direction, Recipient/Sender & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: 'var(--radius-sm)',
                            background: isOutbound ? 'rgba(129, 140, 248, 0.18)' : 'rgba(56, 189, 248, 0.18)',
                            color: isOutbound ? '#818cf8' : '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isOutbound ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                        </div>
                        <span
                          style={{
                            fontSize: '0.84rem',
                            fontWeight: 600,
                            color: isSelected ? '#f8fafc' : '#e2e8f0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {isOutbound
                            ? email.recipient_name || email.recipient_email
                            : email.contact_name || email.sender_email}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {email.ai_drafted && (
                          <span
                            title="Drafted with AI"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 5px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(192, 132, 252, 0.18)',
                              color: '#c084fc',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                            }}
                          >
                            <Sparkles size={10} style={{ marginRight: '2px' }} /> AI
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: statusBadge.color,
                            background: statusBadge.bg,
                            border: `1px solid ${statusBadge.border}`,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-pill)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>

                    {/* Subject Line */}
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: isSelected ? '#a5b4fc' : '#cbd5e1',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {email.subject}
                    </div>

                    {/* Snippet Preview */}
                    <p
                      style={{
                        fontSize: '0.76rem',
                        color: 'var(--text-muted)',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.4,
                      }}
                    >
                      {email.body_text}
                    </p>

                    {/* Bottom Metadata: Time & Provider */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span>{new Date(email.created_at).toLocaleDateString()} at {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{ textTransform: 'capitalize' }}>via {email.provider}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Email Detail Inspector */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', padding: '24px', height: '640px', overflowY: 'auto' }}>
          {selectedEmail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header Box */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: selectedEmail.direction === 'outbound' ? 'rgba(129, 140, 248, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                          color: selectedEmail.direction === 'outbound' ? '#818cf8' : '#38bdf8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {selectedEmail.direction === 'outbound' ? (
                          <>
                            <ArrowUpRight size={12} /> OUTBOUND DISPATCH
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft size={12} /> INBOUND REPLY
                          </>
                        )}
                      </span>

                      {selectedEmail.ai_drafted && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(192, 132, 252, 0.2)',
                            color: '#c084fc',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Sparkles size={12} /> AI DRAFTED
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-pill)',
                          ...getStatusBadge(selectedEmail.status),
                        }}
                      >
                        {selectedEmail.status.toUpperCase()}
                      </span>
                    </div>

                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc', margin: 0, lineHeight: 1.3 }}>
                      {selectedEmail.subject}
                    </h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => {
                        setComposeContact(
                          selectedEmail.contact_id
                            ? ({
                                id: selectedEmail.contact_id,
                                name: selectedEmail.recipient_name || selectedEmail.contact_name || '',
                                email: selectedEmail.recipient_email,
                                client_id: selectedEmail.client_id,
                                project_id: selectedEmail.project_id,
                                preferred_channel: 'email',
                                consent_status: 'opted_in',
                                is_primary: false,
                                created_at: '',
                                updated_at: '',
                              } as Contact)
                            : null
                        );
                        setIsComposeOpen(true);
                      }}
                    >
                      <Send size={13} />
                      <span>Send Follow-Up</span>
                    </button>
                  </div>
                </div>

                {/* Sender & Recipient Bar */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.28)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      <strong>From:</strong>{' '}
                      <span style={{ color: '#f8fafc' }}>{selectedEmail.sender_email}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {new Date(selectedEmail.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      <strong>To:</strong>{' '}
                      <span style={{ color: '#f8fafc' }}>
                        {selectedEmail.recipient_name
                          ? `${selectedEmail.recipient_name} <${selectedEmail.recipient_email}>`
                          : selectedEmail.recipient_email}
                      </span>
                    </div>
                  </div>

                  {(selectedEmail.client_name || selectedEmail.project_title) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem' }}>
                      {selectedEmail.client_name && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8' }}>
                          <User size={12} />
                          <span>Client: {selectedEmail.client_name}</span>
                        </span>
                      )}
                      {selectedEmail.project_title && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                          <Briefcase size={12} />
                          <span>Project: {selectedEmail.project_title}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Provider Failure Alert if any */}
              {selectedEmail.status === 'failed' && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    color: '#f87171',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} />
                    <span>Provider Delivery Failure Logged</span>
                  </div>
                  <div>{selectedEmail.error_details || 'The upstream email provider reported a delivery error.'}</div>
                </div>
              )}

              {/* Email Content Box */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                  Email Message Content
                </div>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    fontSize: '0.9rem',
                    color: '#e2e8f0',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    minHeight: '220px',
                  }}
                >
                  {selectedEmail.body_text}
                </div>
              </div>

              {/* Technical / Provider Metadata Footer */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div>
                  Provider: <strong>{selectedEmail.provider}</strong>
                  {selectedEmail.provider_message_id && (
                    <span style={{ marginLeft: '10px' }}>
                      Msg ID: <code style={{ color: '#94a3b8' }}>{selectedEmail.provider_message_id}</code>
                    </span>
                  )}
                </div>

                {selectedEmail.idempotency_key && (
                  <div>
                    Idempotency: <code style={{ color: '#94a3b8' }}>{selectedEmail.idempotency_key}</code>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <Inbox size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#cbd5e1' }}>No message selected</p>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                Select an email from the left pane to view its full details and delivery audit log.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      <SendEmailModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setComposeContact(null);
        }}
        initialContact={composeContact}
        onSent={async (sentEmail) => {
          setSuccessMsg(`Dispatched email "${sentEmail.subject}" successfully!`);
          await loadEmails(true);
        }}
      />

      {/* Inbound Reply Simulation Modal */}
      {isInboundSimOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 70,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '540px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="card-icon-pill cyan">
                  <Inbox size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Simulate Inbound Client Reply
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Triggers the backend webhook to test reply sync and follow-up auto-resolution.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsInboundSimOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSimulateInboundReply} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Client Sender Email (Must match a contact) *
                </label>
                <input
                  type="email"
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  value={simFromEmail}
                  onChange={(e) => setSimFromEmail(e.target.value)}
                  placeholder="contact@company.com"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Reply Subject Line
                </label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  value={simSubject}
                  onChange={(e) => setSimSubject(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Incoming Reply Message Body *
                </label>
                <textarea
                  className="search-input"
                  style={{ width: '100%', padding: '10px 12px', minHeight: '110px', resize: 'vertical' }}
                  value={simBody}
                  onChange={(e) => setSimBody(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsInboundSimOpen(false)}
                  disabled={isSimulating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSimulating || !simFromEmail.trim() || !simBody.trim()}
                >
                  {isSimulating ? 'Processing Webhook...' : 'Fire Inbound Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
