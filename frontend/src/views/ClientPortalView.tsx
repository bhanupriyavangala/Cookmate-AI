import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send,
  User,
  Clock,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  Building,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api';
import type { PortalProjectResponse, PortalConversationItem, PortalMessageItem } from '../types';

interface ClientPortalViewProps {
  token: string;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({ token }) => {
  const [portalData, setPortalData] = useState<PortalProjectResponse | null>(null);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [senderName, setSenderName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load project portal data
  const loadPortal = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    setErrorMsg(null);
    setIsRevoked(false);

    try {
      const data = await api.getPortalProject(token);
      setPortalData(data);
      if (!senderName && data.client_name) {
        setSenderName(data.client_name);
      }
      if (data.conversations && data.conversations.length > 0) {
        setSelectedConvId((prev) => (prev ? prev : data.conversations[0].id));
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to load project communication portal.';
      if (msg.toLowerCase().includes('revoked')) {
        setIsRevoked(true);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, senderName]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [portalData?.conversations]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;

    setIsSending(true);
    setErrorMsg(null);

    try {
      await api.postPortalMessage(token, {
        content: messageContent.trim(),
        conversation_id: selectedConvId ?? undefined,
        sender_name: senderName.trim() || undefined,
      });

      setMessageContent('');
      // Refresh messages
      await loadPortal(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const activeConversation: PortalConversationItem | undefined =
    portalData?.conversations.find((c) => c.id === selectedConvId) || portalData?.conversations[0];

  // ---------------------------------------------------------------------------
  // State: Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <RefreshCw size={36} color="#818cf8" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
            Opening Client Communication Portal...
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Securely verifying project access credentials
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // State: Link Revoked
  // ---------------------------------------------------------------------------
  if (isRevoked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '20px' }}>
        <div className="saas-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '40px 24px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
          <ShieldAlert size={48} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
            Communication Link Inactive
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
            This client communication link has been revoked or updated by the project team. For security purposes, access via this URL is no longer permitted.
          </p>
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: '#fda4af' }}>
            Please contact your account manager or engineering lead to receive an updated, active communication link.
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // State: Invalid Link / General Error
  // ---------------------------------------------------------------------------
  if (!portalData || errorMsg) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '20px' }}>
        <div className="saas-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '40px 24px' }}>
          <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
            Communication Link Unavailable
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
            {errorMsg || 'The project communication link could not be loaded. Please ensure the link is entered correctly.'}
          </p>
          <button type="button" className="btn-secondary" onClick={() => loadPortal()}>
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // State: Active Client Portal View
  // ---------------------------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header
        style={{
          background: 'rgba(15, 20, 34, 0.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div className="card-icon-pill cyan" style={{ width: '28px', height: '28px' }}>
                <Briefcase size={14} />
              </div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {portalData.project_title}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8' }}>
                <User size={12} />
                {portalData.client_name}
              </span>
              {portalData.client_company && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building size={12} />
                    {portalData.client_company}
                  </span>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(52, 211, 153, 0.1)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid rgba(52, 211, 153, 0.25)',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399' }} />
              Secure Client Portal
            </span>

            <button
              type="button"
              className="action-icon-btn"
              onClick={() => loadPortal(true)}
              title="Refresh conversation messages"
              style={{ padding: '6px' }}
            >
              <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '960px', width: '100%', margin: '0 auto', padding: '20px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Project Scope Summary (Safe public description only) */}
        {portalData.project_description && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 18px',
              fontSize: '0.86rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
            }}
          >
            <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '2px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Project Scope & Goals
            </strong>
            {portalData.project_description}
          </div>
        )}

        {/* Conversation Thread Container */}
        <div
          className="saas-card"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            minHeight: '480px',
          }}
        >
          {/* Thread Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'rgba(15, 20, 34, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} color="#818cf8" />
              <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc' }}>
                {activeConversation?.subject || 'Direct Communication Thread'}
              </span>
            </div>

            <span className="nav-tag" style={{ fontSize: '0.7rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}>
              Active Discussion
            </span>
          </div>

          {/* Message History List */}
          <div
            style={{
              flex: 1,
              padding: '20px 16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'rgba(10, 13, 20, 0.5)',
            }}
          >
            {(!activeConversation || !activeConversation.messages || activeConversation.messages.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No messages yet. Send an update or question below to start the conversation with the project team.
              </div>
            ) : (
              activeConversation.messages.map((msg: PortalMessageItem) => {
                const isClient = msg.sender_type === 'client';
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isClient ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 600, color: isClient ? '#38bdf8' : '#818cf8' }}>
                        {isClient ? msg.sender_name : `${msg.sender_name} (Team)`}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} />
                        {new Date(msg.sent_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-lg)',
                        background: isClient
                          ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.2) 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: isClient
                          ? '1px solid rgba(56, 189, 248, 0.35)'
                          : '1px solid var(--border-subtle)',
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        lineHeight: 1.55,
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error notice if message failed */}
          {errorMsg && (
            <div style={{ padding: '8px 18px', background: 'rgba(239, 68, 68, 0.15)', borderTop: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8rem' }}>
              {errorMsg}
            </div>
          )}

          {/* Client Message Composer */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '16px 18px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="text"
                className="search-input"
                style={{ flex: 1, paddingLeft: '12px', fontSize: '0.82rem' }}
                placeholder="Your name or team title (e.g. Sarah Connor)"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <textarea
                className="search-input"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  minHeight: '70px',
                  maxHeight: '160px',
                  resize: 'vertical',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                }}
                placeholder="Write your message or question for the project team... (Press Enter to send, Shift+Enter for newline)"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={isSending}
              />

              <button
                type="submit"
                className="btn-primary"
                style={{
                  padding: '12px 18px',
                  height: '70px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
                disabled={isSending || !messageContent.trim()}
              >
                {isSending ? (
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <Send size={16} />
                    <span style={{ fontSize: '0.74rem' }}>Send</span>
                  </>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <span>
                {messageContent.length} / 5000 characters
              </span>
              <span>Direct encrypted client channel</span>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '14px 20px', textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
        Powered by ClientPulse AI • Secure Project Collaboration
      </footer>
    </div>
  );
};
