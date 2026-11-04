import React, { useState, useEffect } from 'react';
import {
  Mail,
  Sparkles,
  Send,
  X,
  AlertTriangle,
  CheckCircle2,
  Building,
  Briefcase,
  User,
  ShieldAlert,
  FileText,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  Contact,
  EmailMessage,
  EmailDraftTone,
} from '../../types';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: (sentEmail: EmailMessage) => void;
  initialContact?: Contact | null;
  initialClientId?: number | null;
  initialProjectId?: number | null;
}

const TEMPLATES = [
  {
    label: 'Status Check-In',
    subject: 'Project Progress & Milestone Update',
    body: (name: string, company?: string) =>
      `Hi ${name},\n\nI wanted to share a brief update regarding our ongoing deliverables${
        company ? ` for ${company}` : ''
      }.\n\nEverything is progressing smoothly according to our planned milestones. Please let us know if you have any questions or items you would like us to prioritize this week.\n\nBest regards,\nThe ClientPulse Team`,
  },
  {
    label: 'Feedback Request',
    subject: 'Feedback Request: Pending Review Items',
    body: (name: string) =>
      `Hi ${name},\n\nFollowing up on our recent milestone submission. Whenever you have a moment, could you please review the shared assets and let us know your feedback or sign-off?\n\nLooking forward to your thoughts so we can proceed with the next phase.\n\nBest regards,\nThe ClientPulse Team`,
  },
  {
    label: 'Meeting Follow-Up',
    subject: 'Recap & Next Steps: Recent Discussion',
    body: (name: string) =>
      `Hi ${name},\n\nThank you for taking the time to speak with us today. As discussed, here is a quick summary of the agreed action items and next milestones.\n\nPlease feel free to reply directly to this email if you need anything added or updated.\n\nBest regards,\nThe ClientPulse Team`,
  },
];

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  onSent,
  initialContact,
  initialClientId,
  initialProjectId,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<number | ''>(
    initialContact ? initialContact.id : ''
  );
  const [selectedContact, setSelectedContact] = useState<Contact | null>(
    initialContact || null
  );

  // Form Fields
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [forceSend, setForceSend] = useState(false);
  const [isAiDrafted, setIsAiDrafted] = useState(false);
  const [aiSource, setAiSource] = useState<string | null>(null);

  // AI Assist State
  const [showAiToolbar, setShowAiToolbar] = useState(true);
  const [aiTone, setAiTone] = useState<EmailDraftTone>('professional');
  const [aiInstructions, setAiInstructions] = useState('');
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false);

  // Submission State
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch contacts for dropdown if not locked to one contact
  useEffect(() => {
    if (!isOpen) return;

    if (initialContact) {
      setSelectedContact(initialContact);
      setSelectedContactId(initialContact.id);
      setRecipientEmail(initialContact.email);
      setRecipientName(initialContact.name);
      setForceSend(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    } else {
      api.getContacts()
        .then((data) => {
          setContacts(data);
          if (data.length > 0 && selectedContactId === '') {
            const first = data[0];
            setSelectedContactId(first.id);
            setSelectedContact(first);
            setRecipientEmail(first.email);
            setRecipientName(first.name);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialContact]);

  // Handle contact dropdown change
  const handleContactSelect = (contactIdStr: string) => {
    const id = Number(contactIdStr);
    setSelectedContactId(id);
    const found = contacts.find((c) => c.id === id) || null;
    setSelectedContact(found);
    if (found) {
      setRecipientEmail(found.email);
      setRecipientName(found.name);
      setForceSend(false);
    }
  };

  // Generate AI Draft
  const handleGenerateAiDraft = async () => {
    if (!selectedContact) {
      setErrorMsg('Please select a contact to generate an AI draft.');
      return;
    }

    setIsGeneratingAiDraft(true);
    setErrorMsg(null);
    try {
      const response = await api.generateEmailDraft({
        contact_id: selectedContact.id,
        project_id: selectedContact.project_id || initialProjectId || undefined,
        tone: aiTone,
        instructions: aiInstructions.trim() || undefined,
      });

      setSubject(response.subject);
      setBodyText(response.body_text);
      setIsAiDrafted(true);
      setAiSource(response.ai_source === 'gemini' ? 'Google Gemini AI' : 'Local AI Engine');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate AI email draft.');
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  // Apply Quick Template
  const handleApplyTemplate = (tmpl: (typeof TEMPLATES)[0]) => {
    const name = selectedContact?.name || recipientName || 'there';
    const company = selectedContact?.company || undefined;
    setSubject(tmpl.subject);
    setBodyText(tmpl.body(name, company));
    setIsAiDrafted(false);
    setAiSource(null);
  };

  // Submit Send
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      setErrorMsg('Recipient email is required.');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Subject line cannot be blank.');
      return;
    }
    if (!bodyText.trim()) {
      setErrorMsg('Email body content is required.');
      return;
    }

    // Consent check
    if (selectedContact?.consent_status === 'opted_out' && !forceSend) {
      setErrorMsg(
        'This contact has opted out of communications. Check "Consent Override" below if this is a required legal or transactional notice.'
      );
      return;
    }

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Generate client-side idempotency key
      const idempotencyKey = `web_send_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const sent = await api.sendEmail({
        recipient_email: recipientEmail.trim(),
        recipient_name: recipientName.trim() || undefined,
        contact_id: selectedContact?.id || undefined,
        client_id: selectedContact?.client_id || initialClientId || undefined,
        project_id: selectedContact?.project_id || initialProjectId || undefined,
        subject: subject.trim(),
        body_text: bodyText.trim(),
        idempotency_key: idempotencyKey,
        ai_drafted: isAiDrafted,
        force_send: forceSend,
      });

      setSuccessMsg(`Email successfully dispatched via ${sent.provider} (ID #${sent.id})!`);
      setTimeout(() => {
        if (onSent) onSent(sent);
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg = err.message || 'Failed to dispatch email';
      if (msg.includes('duplicate') || msg.includes('409')) {
        setErrorMsg('Rapid duplicate detected: an identical email was sent to this recipient in the last 60 seconds. Enable "Consent / Duplicate Override" to force send.');
      } else if (msg.includes('opted out') || msg.includes('400')) {
        setErrorMsg('Consent restriction: recipient is opted out. Please enable "Consent Override" if this is a mandatory notification.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const isOptedOut = selectedContact?.consent_status === 'opted_out';
  const isConsentPending = selectedContact?.consent_status === 'pending';

  return (
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
          maxWidth: '720px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 20, 34, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                border: '1px solid rgba(129, 140, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
              }}
            >
              <Mail size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Compose & Send Email
                </h3>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.15)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  DIRECT DISPATCH
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Outbound client messaging with AI drafting, deduplication, and consent verification.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Notifications */}
          {errorMsg && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                color: '#f87171',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                color: '#34d399',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Opt-Out / Consent Alert */}
          {isOptedOut && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185', fontWeight: 600, fontSize: '0.88rem' }}>
                <ShieldAlert size={18} />
                <span>Contact Opted-Out of Direct Communication</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#fda4af', margin: 0, lineHeight: 1.45 }}>
                {selectedContact?.name} has revoked consent. Sending unsolicited messages violates compliance regulations.
                Only proceed with direct transactional or legal notices.
              </p>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  color: '#fff',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                <input
                  type="checkbox"
                  checked={forceSend}
                  onChange={(e) => setForceSend(e.target.checked)}
                  style={{ accentColor: '#f43f5e', width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 600 }}>Consent Override: Force dispatch this essential communication</span>
              </label>
            </div>
          )}

          {isConsentPending && !isOptedOut && (
            <div
              style={{
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#facc15',
                fontSize: '0.82rem',
              }}
            >
              <Clock size={16} />
              <span>Contact communication consent is pending formal opt-in.</span>
            </div>
          )}

          {/* Recipient & Contact Selector */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {!initialContact && contacts.length > 0 ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  Select Recipient Contact
                </label>
                <select
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  value={selectedContactId}
                  onChange={(e) => handleContactSelect(e.target.value)}
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.email} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Recipient Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '34px' }}
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Recipient Name"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Recipient Email Address *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '34px' }}
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="client@company.com"
                    required
                  />
                </div>
              </div>
            </div>

            {selectedContact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {selectedContact.company && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building size={12} color="#94a3b8" />
                    <span>{selectedContact.company}</span>
                  </span>
                )}
                {selectedContact.client_name && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} color="#818cf8" />
                    <span>Client: {selectedContact.client_name}</span>
                  </span>
                )}
                {selectedContact.project_title && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                    <Briefcase size={12} />
                    <span>Project: {selectedContact.project_title}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* AI Drafting Toolbar */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#c084fc" />
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f8fafc' }}>
                  AI Follow-Up Assistant
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: '#c084fc',
                    background: 'rgba(192, 132, 252, 0.15)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid rgba(192, 132, 252, 0.3)',
                  }}
                >
                  Gemini AI
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAiToolbar(!showAiToolbar)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#c084fc',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {showAiToolbar ? 'Hide AI Assist' : 'Show AI Assist'}
              </button>
            </div>

            {showAiToolbar && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Tone:</span>
                  {(['professional', 'friendly', 'urgent', 'concise'] as EmailDraftTone[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAiTone(t)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-pill)',
                        border: aiTone === t ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
                        background: aiTone === t ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                        color: aiTone === t ? '#f8fafc' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        fontWeight: aiTone === t ? 600 : 400,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="search-input"
                    style={{ flex: 1, paddingLeft: '12px', fontSize: '0.82rem' }}
                    placeholder="Specific goal: e.g. Request approval on Phase 2 deliverables, schedule sync..."
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                  />

                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isGeneratingAiDraft || !selectedContact}
                    onClick={handleGenerateAiDraft}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                      border: 'none',
                      whiteSpace: 'nowrap',
                      padding: '8px 16px',
                    }}
                  >
                    {isGeneratingAiDraft ? (
                      <>
                        <RefreshCw size={14} className="spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Draft with AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick Presets:</span>
                  {TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        color: '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email Subject Field */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Email Subject *
              </label>
              {isAiDrafted && aiSource && (
                <span style={{ fontSize: '0.72rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={11} /> {aiSource}
                </span>
              )}
            </div>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', paddingLeft: '12px', fontSize: '0.9rem' }}
              placeholder="e.g. Project Deliverables Sign-Off & Timeline Update"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setIsAiDrafted(false);
              }}
              required
            />
          </div>

          {/* Email Body Textarea */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
              Email Message Body *
            </label>
            <textarea
              className="search-input"
              style={{
                width: '100%',
                padding: '12px',
                minHeight: '160px',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                lineHeight: 1.6,
              }}
              placeholder="Write your email message here or generate one using the AI Follow-Up Assistant..."
              value={bodyText}
              onChange={(e) => {
                setBodyText(e.target.value);
                setIsAiDrafted(false);
              }}
              required
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(15, 20, 34, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <FileText size={13} />
            <span>Idempotency deduplicated & logged to audit timeline</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSend}
              disabled={isSending || !subject.trim() || !bodyText.trim() || !recipientEmail.trim()}
              style={{ minWidth: '130px' }}
            >
              {isSending ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Send Email</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
