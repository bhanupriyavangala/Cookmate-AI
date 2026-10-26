import React, { useState, useEffect, useCallback } from 'react';
import {
  Link as LinkIcon,
  Copy,
  Check,
  X,
  RefreshCw,
  ShieldAlert,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import type { Project, ProjectShareLink } from '../../types';

interface ProjectShareLinkModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectShareLinkModal: React.FC<ProjectShareLinkModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [shareLink, setShareLink] = useState<ProjectShareLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load existing active share link
  const loadLink = useCallback(async () => {
    setIsLoading(true);
    setActionMsg(null);
    try {
      const link = await api.getProjectShareLink(project.id);
      setShareLink(link);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to load link status.' });
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    if (isOpen) {
      loadLink();
    }
  }, [isOpen, loadLink]);

  // Construct full URL
  const getFullUrl = () => {
    if (!shareLink) return '';
    const origin = window.location.origin;
    return `${origin}/portal/${shareLink.token}`;
  };

  // Copy to clipboard
  const handleCopy = async () => {
    const url = getFullUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Generate or rotate link
  const handleGenerate = async () => {
    setIsActing(true);
    setActionMsg(null);
    try {
      const newLink = await api.generateProjectShareLink(project.id);
      setShareLink(newLink);
      setActionMsg({
        type: 'success',
        text: 'New unguessable client communication link generated. Any previous link was revoked.',
      });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to generate link.' });
    } finally {
      setIsActing(false);
    }
  };

  // Revoke link
  const handleRevoke = async () => {
    if (!window.confirm(`Revoke client communication link for "${project.title}"? Clients will immediately lose access until a new link is issued.`)) {
      return;
    }

    setIsActing(true);
    setActionMsg(null);
    try {
      await api.revokeProjectShareLink(project.id);
      setShareLink(null);
      setActionMsg({
        type: 'success',
        text: 'Communication link revoked. Client access has been immediately deactivated.',
      });
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to revoke link.' });
    } finally {
      setIsActing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xl)', maxWidth: '540px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="card-icon-pill cyan">
              <LinkIcon size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Client Communication Link
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Project: <strong style={{ color: '#e2e8f0' }}>{project.title}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alert */}
        {actionMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: actionMsg.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: actionMsg.type === 'success' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              color: actionMsg.type === 'success' ? '#34d399' : '#f87171',
            }}
          >
            {actionMsg.type === 'success' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
            <div style={{ fontSize: '0.84rem' }}>Checking active link status...</div>
          </div>
        ) : shareLink && shareLink.is_active ? (
          /* Active Link Details */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Unique Communication URL
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399' }} />
                  Active & Unguessable
                </span>
              </div>

              {/* URL Display Box */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  className="search-input"
                  style={{ flex: 1, paddingLeft: '12px', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}
                  value={getFullUrl()}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCopy}
                  style={{ padding: '8px 12px', minWidth: '85px' }}
                >
                  {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                <span>Token length: {shareLink.token.length} chars</span>
                <a
                  href={`/portal/${shareLink.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8', textDecoration: 'none' }}
                >
                  <span>Preview Portal</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Privacy Guarantee Card */}
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              <strong style={{ color: '#818cf8', display: 'block', marginBottom: '2px' }}>
                Privacy & Data Isolation:
              </strong>
              Clients can view milestones and exchange messages without an employee login. Internal employee notes, budget margins, AI suggestions, and escalation records are strictly shielded from the public client portal.
            </div>

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ color: '#fda4af', borderColor: 'rgba(244, 63, 94, 0.3)', fontSize: '0.78rem' }}
                onClick={handleRevoke}
                disabled={isActing}
              >
                <ShieldAlert size={13} />
                <span>Revoke Link</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem' }}
                  onClick={handleGenerate}
                  disabled={isActing}
                  title="Rotate to a new unguessable token and revoke previous link"
                >
                  <RefreshCw size={13} />
                  <span>Rotate Token</span>
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.78rem' }}
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* No Active Link State */
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <ShieldAlert size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
              No Active Communication Link
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.5, maxWidth: '380px', margin: '0 auto 20px' }}>
              Generate a unique, secure URL allowing the client to view project updates and send messages from mobile or desktop.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleGenerate}
              disabled={isActing}
            >
              <LinkIcon size={14} />
              <span>{isActing ? 'Generating...' : 'Generate Secure Link'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
