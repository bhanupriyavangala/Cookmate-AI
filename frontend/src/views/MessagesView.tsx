import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Send,
  User,
  Clock,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  X,
  Mail,
  PhoneCall,
  Globe,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { GenerateFollowUpModal } from '../components/common/GenerateFollowUpModal';
import { EmailOutboxTab } from '../components/email/EmailOutboxTab';
import type { Conversation, ConversationInput, Client, Project, Message } from '../types';

export const MessagesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'conversations' | 'emails'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compose Message State
  const [messageContent, setMessageContent] = useState('');
  const [senderType, setSenderType] = useState<'team' | 'client'>('team');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // New Conversation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newConvForm, setNewConvForm] = useState<ConversationInput>({
    client_id: 0,
    project_id: undefined,
    subject: '',
    channel: 'email',
    status: 'open',
    initial_message: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Follow-up Modal State
  const [showAiModal, setShowAiModal] = useState(false);

  // Load conversations and clients
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [convsData, clientsData, projectsData] = await Promise.all([
        api.getConversations(),
        api.getClients({ is_archived: false }),
        api.getProjects(),
      ]);
      setConversations(convsData);
      setClients(clientsData);
      setProjects(projectsData);

      if (convsData.length > 0) {
        // If nothing selected or previously selected, load details of first
        const targetId = selectedConv ? selectedConv.id : convsData[0].id;
        const detail = await api.getConversation(targetId).catch(() => convsData[0]);
        setSelectedConv(detail);
      } else {
        setSelectedConv(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  // Select conversation
  const handleSelectConversation = async (conv: Conversation) => {
    try {
      const detail = await api.getConversation(conv.id);
      setSelectedConv(detail);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to open conversation');
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !messageContent.trim()) return;

    setIsSending(true);
    try {
      const senderName = senderType === 'team'
        ? 'ClientPulse Support'
        : selectedConv.client_name || 'Client';

      await api.sendMessage(selectedConv.id, {
        sender_type: senderType,
        sender_name: senderName,
        content: messageContent.trim(),
      });

      setMessageContent('');
      // Reload active conversation
      const updated = await api.getConversation(selectedConv.id);
      setSelectedConv(updated);

      // Refresh left list previews
      const convs = await api.getConversations();
      setConversations(convs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Open New Thread Modal
  const handleOpenNewThread = () => {
    setNewConvForm({
      client_id: clients.length > 0 ? clients[0].id : 0,
      project_id: undefined,
      subject: '',
      channel: 'email',
      status: 'open',
      initial_message: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Submit New Thread
  const handleSubmitNewThread = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newConvForm.client_id || newConvForm.client_id === 0) {
      errors.client_id = 'Please select a client';
    }
    if (!newConvForm.subject.trim()) {
      errors.subject = 'Subject is required';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createConversation({
        ...newConvForm,
        project_id: newConvForm.project_id ? Number(newConvForm.project_id) : undefined,
      });
      setSuccessMsg(`Started conversation "${created.subject}".`);
      setIsModalOpen(false);
      await loadData();
      setSelectedConv(created);
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Failed to create conversation' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'portal':
        return <Globe size={13} color="#38bdf8" />;
      case 'phone':
        return <PhoneCall size={13} color="#fbbf24" />;
      default:
        return <Mail size={13} color="#818cf8" />;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
            Client Communications Hub
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Omnichannel inbox: internal collaboration threads & AI-assisted transactional email dispatch.
          </p>
        </div>
        {activeTab === 'conversations' && (
          <button type="button" className="btn-primary" onClick={handleOpenNewThread}>
            <Plus size={16} />
            <span>New Conversation</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('conversations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'conversations' ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
            background: activeTab === 'conversations' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
            color: activeTab === 'conversations' ? '#f8fafc' : 'var(--text-secondary)',
            fontSize: '0.86rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <MessageSquare size={15} color={activeTab === 'conversations' ? '#818cf8' : '#94a3b8'} />
          <span>Internal Threads & Chat ({conversations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('emails')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'emails' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
            background: activeTab === 'emails' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.02)',
            color: activeTab === 'emails' ? '#f8fafc' : 'var(--text-secondary)',
            fontSize: '0.86rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Mail size={15} color={activeTab === 'emails' ? '#38bdf8' : '#94a3b8'} />
          <span>Email Dispatch & Outbox</span>
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              padding: '1px 6px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            PHASE 7
          </span>
        </button>
      </div>

      {activeTab === 'emails' ? (
        <EmailOutboxTab />
      ) : (
        <>
          {/* Notifications */}
          {successMsg && (
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', color: '#34d399' }}>
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
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', color: '#f87171' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
              <button type="button" onClick={() => setErrorMsg(null)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Main Two-Pane Container */}
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', minHeight: '620px', alignItems: 'stretch' }}>
            {/* Left Pane: Conversation Threads List */}
            <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px', height: '640px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                  Threads ({conversations.length})
                </span>
              </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading threads...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>No conversations started yet.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--primary-light)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: isSelected ? '#818cf8' : '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                        {conv.subject}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getChannelIcon(conv.channel)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <User size={11} color="#94a3b8" />
                      <span>{conv.client_name || `Client #${conv.client_id}`}</span>
                      {conv.project_title && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>•</span>
                          <span style={{ color: '#38bdf8' }}>{conv.project_title}</span>
                        </>
                      )}
                    </div>

                    {conv.last_message_preview && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.last_message_preview}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Thread Messages */}
        <div className="saas-card" style={{ display: 'flex', flexDirection: 'column', padding: '0', height: '640px', overflow: 'hidden' }}>
          {selectedConv ? (
            <>
              {/* Thread Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 20, 34, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                    {selectedConv.subject}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} color="#818cf8" /> {selectedConv.client_name}
                    </span>
                    {selectedConv.project_title && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                        <Briefcase size={12} /> {selectedConv.project_title}
                      </span>
                    )}
                    <span className="nav-tag" style={{ fontSize: '0.68rem', padding: '2px 6px', textTransform: 'capitalize' }}>
                      {selectedConv.channel}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{
                      fontSize: '0.78rem',
                      padding: '5px 12px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 8px rgba(168, 85, 247, 0.25)',
                    }}
                    onClick={() => setShowAiModal(true)}
                    title="Generate AI Follow-up for this thread"
                  >
                    <Sparkles size={12} />
                    <span>Generate Follow-up</span>
                  </button>

                  <span className="nav-tag" style={{ color: selectedConv.status === 'open' ? '#34d399' : '#94a3b8', borderColor: selectedConv.status === 'open' ? 'rgba(52, 211, 153, 0.3)' : 'var(--border-subtle)' }}>
                    {selectedConv.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Messages History List */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(10, 13, 20, 0.5)' }}>
                {(!selectedConv.messages || selectedConv.messages.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No messages in this conversation yet. Send an opening message below.
                  </div>
                ) : (
                  selectedConv.messages.map((msg: Message) => {
                    const isTeam = msg.sender_type === 'team';
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isTeam ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: 600, color: isTeam ? '#818cf8' : '#38bdf8' }}>
                            {msg.sender_name}
                          </span>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} />
                            {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          style={{
                            maxWidth: '75%',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-lg)',
                            background: isTeam
                              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)'
                              : 'rgba(255, 255, 255, 0.05)',
                            border: isTeam
                              ? '1px solid rgba(99, 102, 241, 0.4)'
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

              {/* Message Compose Form */}
              <form onSubmit={handleSendMessage} style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    <span>Send as:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="senderType"
                        checked={senderType === 'team'}
                        onChange={() => setSenderType('team')}
                      />
                      <span style={{ color: senderType === 'team' ? '#818cf8' : 'inherit' }}>Team / Support</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="senderType"
                        checked={senderType === 'client'}
                        onChange={() => setSenderType('client')}
                      />
                      <span style={{ color: senderType === 'client' ? '#38bdf8' : 'inherit' }}>Client</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="search-input"
                    style={{ flex: 1, paddingLeft: '14px' }}
                    placeholder="Type follow-up response or client message..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSending || !messageContent.trim()}
                    style={{ padding: '8px 18px' }}
                  >
                    <Send size={14} />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Select a thread on the left or create a new conversation.
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* Modal: New Conversation Thread */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xl)', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                Start New Client Conversation
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

            <form onSubmit={handleSubmitNewThread} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Client *
                </label>
                <select
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  value={newConvForm.client_id}
                  onChange={(e) => setNewConvForm({ ...newConvForm, client_id: Number(e.target.value) })}
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
                  Linked Project (Optional)
                </label>
                <select
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  value={newConvForm.project_id ?? ''}
                  onChange={(e) => setNewConvForm({ ...newConvForm, project_id: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">No specific project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.client_name || `Client #${p.client_id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Subject / Topic *
                </label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px' }}
                  placeholder="e.g. Weekly Status & Milestone Review"
                  value={newConvForm.subject}
                  onChange={(e) => setNewConvForm({ ...newConvForm, subject: e.target.value })}
                />
                {formErrors.subject && (
                  <span style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '2px', display: 'block' }}>
                    {formErrors.subject}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Channel
                  </label>
                  <select
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    value={newConvForm.channel}
                    onChange={(e) => setNewConvForm({ ...newConvForm, channel: e.target.value })}
                  >
                    <option value="email">Email</option>
                    <option value="portal">Client Portal</option>
                    <option value="phone">Phone / Meeting</option>
                    <option value="chat">Direct Chat</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '12px' }}
                    value={newConvForm.status}
                    onChange={(e) => setNewConvForm({ ...newConvForm, status: e.target.value })}
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Initial Message (Optional)
                </label>
                <textarea
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Opening message content..."
                  value={newConvForm.initial_message}
                  onChange={(e) => setNewConvForm({ ...newConvForm, initial_message: e.target.value })}
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
                  {isSubmitting ? 'Starting...' : 'Start Conversation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generate AI Follow-Up */}
      {showAiModal && selectedConv && (
        <GenerateFollowUpModal
          conversationId={selectedConv.id}
          clientName={selectedConv.client_name || `Client #${selectedConv.client_id}`}
          subject={selectedConv.subject}
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          onSentSuccess={async () => {
            setShowAiModal(false);
            setSuccessMsg(`Follow-up sent and recorded into conversation thread.`);
            const updated = await api.getConversation(selectedConv.id);
            setSelectedConv(updated);
            const convs = await api.getConversations();
            setConversations(convs);
          }}
        />
      )}
    </div>
  );
};
