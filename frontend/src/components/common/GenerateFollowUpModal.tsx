import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Send,
  Copy,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ConversationAnalysis, GeneratedFollowUp } from '../../types';

interface GenerateFollowUpModalProps {
  conversationId: number;
  clientName: string;
  subject: string;
  isOpen: boolean;
  onClose: () => void;
  onSentSuccess: () => void;
}

export const GenerateFollowUpModal: React.FC<GenerateFollowUpModalProps> = ({
  conversationId,
  clientName,
  subject,
  isOpen,
  onClose,
  onSentSuccess,
}) => {
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [draft, setDraft] = useState<GeneratedFollowUp | null>(null);
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [tone, setTone] = useState<'professional' | 'concise' | 'friendly' | 'urgent'>('professional');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Analysis & Generate Draft
  const loadData = useCallback(async (selectedTone = tone, extraGuidance = customInstructions) => {
    setIsLoadingAnalysis(true);
    setIsGeneratingDraft(true);
    setErrorMessage(null);

    try {
      // 1. Fetch conversation analysis
      const analysisData = await api.analyzeConversation(conversationId);
      setAnalysis(analysisData);
      setIsLoadingAnalysis(false);

      // 2. Generate follow-up draft
      const draftData = await api.generateFollowUp(conversationId, {
        tone: selectedTone,
        instructions: extraGuidance.trim() || undefined,
      });
      setDraft(draftData);
      setEditedMessage(draftData.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate AI response');
    } finally {
      setIsLoadingAnalysis(false);
      setIsGeneratingDraft(false);
    }
  }, [conversationId, tone, customInstructions]);

  useEffect(() => {
    if (isOpen && conversationId) {
      loadData();
    }
  }, [isOpen, conversationId]);

  // Handle tone change & regenerate draft only
  const handleToneChange = async (newTone: 'professional' | 'concise' | 'friendly' | 'urgent') => {
    setTone(newTone);
    setIsGeneratingDraft(true);
    setErrorMessage(null);
    try {
      const draftData = await api.generateFollowUp(conversationId, {
        tone: newTone,
        instructions: customInstructions.trim() || undefined,
      });
      setDraft(draftData);
      setEditedMessage(draftData.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to regenerate follow-up draft');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Handle Mark as Sent
  const handleMarkAsSent = async () => {
    if (!editedMessage.trim()) return;

    setIsSending(true);
    setErrorMessage(null);
    try {
      await api.markGeneratedAsSent(conversationId, {
        content: editedMessage.trim(),
        sender_name: 'ClientPulse Support',
      });
      onSentSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record sent message');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-xl)', maxWidth: '780px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-glow)', overflow: 'hidden' }}>
        {/* Modal Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-icon-wrapper" style={{ width: '36px', height: '36px' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                  Gemini AI Follow-Up Assistant
                </h3>
                <span className="nav-tag phase" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  {analysis?.ai_source === 'gemini' ? 'Gemini 1.5 Flash' : 'Smart Context Engine'}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Target Client: <strong style={{ color: '#f8fafc' }}>{clientName}</strong> • Thread: <span style={{ color: '#cbd5e1' }}>{subject}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {errorMessage && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '0.84rem' }}>
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: AI Conversation Analysis Card */}
          <div style={{ background: 'rgba(15, 20, 34, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#818cf8' }}>
                <Brain size={16} />
                <span>Conversation Analysis & Risk Assessment</span>
              </div>
              {isLoadingAnalysis && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Analyzing message history...</span>
                </div>
              )}
            </div>

            {analysis ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                    Identified Pending Action
                  </span>
                  <strong style={{ color: '#f8fafc', lineHeight: 1.4 }}>{analysis.pending_action}</strong>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                    Responsible Party & Need
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span className="nav-tag" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)', textTransform: 'capitalize' }}>
                      {analysis.who_needs_to_respond}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: analysis.response_required ? '#fde047' : '#34d399' }}>
                      {analysis.response_required ? '• Response Required' : '• No Response Needed'}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 'var(--radius-md)', gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                    Potential Project Impact
                  </span>
                  <p style={{ color: '#cbd5e1', margin: 0, lineHeight: 1.45 }}>{analysis.possible_project_impact}</p>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 'var(--radius-md)', gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                    Recommended Next Action
                  </span>
                  <p style={{ color: '#34d399', margin: 0, fontWeight: 500, lineHeight: 1.45 }}>{analysis.recommended_next_action}</p>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                Loading conversation telemetry...
              </div>
            )}
          </div>

          {/* Section 2: Follow-Up Draft Generator & Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc' }}>
                  Generated Follow-Up Draft
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  (Review, edit, copy, and mark as sent)
                </span>
              </div>

              {/* Tone Selection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Tone:</span>
                {(['professional', 'concise', 'friendly', 'urgent'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`nav-tag ${tone === t ? 'phase' : ''}`}
                    style={{ cursor: 'pointer', padding: '4px 10px', textTransform: 'capitalize' }}
                    onClick={() => handleToneChange(t)}
                    disabled={isGeneratingDraft}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Guidance & Regenerate Bar */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="search-input"
                style={{ flex: 1, paddingLeft: '12px', fontSize: '0.8rem' }}
                placeholder="Optional extra guidance (e.g. 'Offer a 15-min call on Wednesday at 2pm')..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    loadData(tone, customInstructions);
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                onClick={() => loadData(tone, customInstructions)}
                disabled={isGeneratingDraft}
              >
                <RefreshCw size={12} style={{ animation: isGeneratingDraft ? 'spin 1s linear infinite' : 'none' }} />
                <span>Regenerate</span>
              </button>
            </div>

            {/* Editable Text Area */}
            <div style={{ position: 'relative' }}>
              <textarea
                className="search-input"
                style={{
                  width: '100%',
                  minHeight: '220px',
                  padding: '14px 16px',
                  lineHeight: 1.6,
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                placeholder="Drafting tailored response..."
                disabled={isGeneratingDraft}
              />
              {isGeneratingDraft && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(10, 13, 20, 0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#818cf8', fontSize: '0.86rem', borderRadius: 'var(--radius-md)' }}>
                  <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Synthesizing tailored follow-up message...</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>
                {editedMessage.trim().split(/\s+/).filter(Boolean).length} words • {editedMessage.length} characters
              </span>
              <span>
                {draft ? `Suggested Subject: ${draft.subject}` : 'Draft ready for review and edit'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Copy Button */}
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopy}
            disabled={!editedMessage.trim()}
          >
            {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
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
              onClick={handleMarkAsSent}
              disabled={isSending || !editedMessage.trim() || isGeneratingDraft}
              title="Record message in conversation and complete follow-up item"
            >
              <Send size={14} />
              <span>{isSending ? 'Marking as Sent...' : 'Mark as Sent'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
