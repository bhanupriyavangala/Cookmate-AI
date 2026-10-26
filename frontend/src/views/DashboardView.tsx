import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  ArrowRight,
  RefreshCw,
  Moon,
  MessageSquare,
  ShieldAlert,
  X,
  Building,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { GenerateFollowUpModal } from '../components/common/GenerateFollowUpModal';
import type {
  EmployeeDashboardStats,
  FollowUp,
  NavItemKey,
  HealthCheckResponse,
} from '../types';

interface DashboardViewProps {
  healthData?: HealthCheckResponse | null;
  backendOnline?: boolean;
  isChecking?: boolean;
  latencyMs?: number | null;
  onRefreshHealth?: () => void;
  onNavigate: (tab: NavItemKey) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
}) => {
  const [stats, setStats] = useState<EmployeeDashboardStats | null>(null);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [filterTab, setFilterTab] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Snooze Modal
  const [snoozeModalItem, setSnoozeModalItem] = useState<FollowUp | null>(null);
  const [snoozeDays, setSnoozeDays] = useState<number>(2.0);
  const [isSnoozing, setIsSnoozing] = useState(false);

  // Escalate Modal
  const [escalateModalItem, setEscalateModalItem] = useState<FollowUp | null>(null);
  const [escalateReason, setEscalateReason] = useState<string>('');
  const [isEscalating, setIsEscalating] = useState(false);

  // AI Follow-up Modal
  const [activeAiFollowup, setActiveAiFollowup] = useState<FollowUp | null>(null);

  // Load Dashboard Stats & Follow-up Items
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const statsData = await api.getEmployeeDashboardStats();
      setStats(statsData);

      const params: any = {};
      if (filterTab === 'active') {
        params.active_only = true;
      } else if (filterTab !== 'all') {
        params.status = filterTab;
      }

      const items = await api.getFollowups(params);
      setFollowups(items);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load employee follow-up data.');
    } finally {
      setIsLoading(false);
    }
  }, [filterTab]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Complete
  const handleComplete = async (item: FollowUp) => {
    try {
      await api.completeFollowup(item.id);
      setActionSuccess(`Follow-up for "${item.client_name}" marked as completed.`);
      loadDashboardData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete follow-up');
    }
  };

  // Submit Snooze
  const handleConfirmSnooze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snoozeModalItem) return;

    setIsSnoozing(true);
    try {
      await api.snoozeFollowup(snoozeModalItem.id, snoozeDays);
      setActionSuccess(`Follow-up snoozed for ${snoozeDays} day(s).`);
      setSnoozeModalItem(null);
      loadDashboardData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to snooze item');
    } finally {
      setIsSnoozing(false);
    }
  };

  // Submit Escalate
  const handleConfirmEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateModalItem) return;

    setIsEscalating(true);
    try {
      await api.escalateFollowup(escalateModalItem.id, escalateReason.trim() || undefined);
      setActionSuccess(`Follow-up escalated to urgent priority.`);
      setEscalateModalItem(null);
      setEscalateReason('');
      loadDashboardData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to escalate item');
    } finally {
      setIsEscalating(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { label: 'URGENT', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.4)' };
      case 'high':
        return { label: 'HIGH', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' };
      case 'medium':
        return { label: 'MEDIUM', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)' };
      default:
        return { label: 'LOW', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'escalated':
        return { label: 'Escalated (≥7d)', color: '#f43f5e' };
      case 'overdue':
        return { label: 'Overdue (≥5d)', color: '#f97316' };
      case 'due':
        return { label: 'Follow-up Due (≥2d)', color: '#eab308' };
      case 'snoozed':
        return { label: 'Snoozed', color: '#94a3b8' };
      case 'completed':
        return { label: 'Completed', color: '#34d399' };
      default:
        return { label: 'On Track (<2d)', color: '#38bdf8' };
    }
  };

  return (
    <div>
      {/* Employee Policy Banner */}
      <section className="hero-banner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
          <div className="hero-top-tag">
            <Flame size={13} />
            <span>Deterministic SLA Operations</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', fontSize: '0.74rem' }}>
            <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
              Due: ≥ 2.0d
            </span>
            <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(249, 115, 22, 0.15)', color: '#fdba74', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              Overdue: ≥ 5.0d
            </span>
            <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
              Escalation: ≥ 7.0d
            </span>
          </div>
        </div>

        <h2 className="hero-heading">Employee Follow-Up Dashboard</h2>
        <p className="hero-desc">
          Automated client communication cadence. Waiting time is computed from stored message timestamps.
          Conversations not requiring a response (answered by team or closed) are suppressed automatically.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={loadDashboardData}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh Queue</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate('messages')}
          >
            <MessageSquare size={14} />
            <span>Open Conversation Hub</span>
          </button>
        </div>
      </section>

      {/* Notifications */}
      {actionSuccess && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', color: '#34d399' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {actionError && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', color: '#f87171' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards: Clients, Projects, Pending Responses, Priority, Days Waiting, Due, Overdue */}
      <div className="grid-cards">
        {/* Active Clients */}
        <div
          className="saas-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('clients')}
        >
          <div className="card-header-row">
            <div className="card-icon-pill primary">
              <Users size={18} />
            </div>
            <span className="nav-tag phase">Accounts</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {stats ? stats.total_clients : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Active Client Accounts
          </div>
        </div>

        {/* Total Projects */}
        <div
          className="saas-card"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('projects')}
        >
          <div className="card-header-row">
            <div className="card-icon-pill cyan">
              <Briefcase size={18} />
            </div>
            <span className="nav-tag phase">Projects</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {stats ? stats.total_projects : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Client Engagements Linked
          </div>
        </div>

        {/* Pending Responses */}
        <div
          className="saas-card"
          style={{ borderColor: stats && stats.pending_responses > 0 ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-subtle)' }}
        >
          <div className="card-header-row">
            <div className="card-icon-pill purple">
              <Clock size={18} />
            </div>
            <span className="nav-tag" style={{ color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
              Action Needed
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#818cf8', margin: '4px 0' }}>
            {stats ? stats.pending_responses : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Clients Awaiting Response
          </div>
        </div>

        {/* Follow-ups Due */}
        <div
          className="saas-card"
          style={{ borderColor: stats && stats.followups_due > 0 ? 'rgba(234, 179, 8, 0.4)' : 'var(--border-subtle)' }}
        >
          <div className="card-header-row">
            <div className="card-icon-pill" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
              <AlertTriangle size={18} />
            </div>
            <span className="nav-tag" style={{ color: '#fde047', borderColor: 'rgba(234, 179, 8, 0.3)' }}>
              Due (≥2d)
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fde047', margin: '4px 0' }}>
            {stats ? stats.followups_due : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Recommended Cadence
          </div>
        </div>

        {/* Overdue Items */}
        <div
          className="saas-card"
          style={{ borderColor: stats && stats.overdue_items > 0 ? 'rgba(249, 115, 22, 0.4)' : 'var(--border-subtle)' }}
        >
          <div className="card-header-row">
            <div className="card-icon-pill" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#fdba74', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <AlertCircle size={18} />
            </div>
            <span className="nav-tag" style={{ color: '#fdba74', borderColor: 'rgba(249, 115, 22, 0.3)' }}>
              Overdue (≥5d)
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fdba74', margin: '4px 0' }}>
            {stats ? stats.overdue_items : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Exceeded Response SLA
          </div>
        </div>

        {/* Escalations */}
        <div
          className="saas-card"
          style={{ borderColor: stats && stats.escalated_items > 0 ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-subtle)' }}
        >
          <div className="card-header-row">
            <div className="card-icon-pill" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
              <ShieldAlert size={18} />
            </div>
            <span className="nav-tag" style={{ color: '#fda4af', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
              Escalated (≥7d)
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fda4af', margin: '4px 0' }}>
            {stats ? stats.escalated_items : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Critical Attention Required
          </div>
        </div>
      </div>

      {/* Follow-Up Work Queue Section */}
      <section className="saas-card" style={{ padding: '24px', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              Deterministic Follow-Up Work Queue
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Priority-ranked client items waiting for employee action.
            </p>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`nav-tag ${filterTab === 'active' ? 'phase' : ''}`}
              style={{ cursor: 'pointer', border: 'none', padding: '6px 12px' }}
              onClick={() => setFilterTab('active')}
            >
              Action Needed ({stats?.pending_responses ?? 0})
            </button>
            <button
              type="button"
              className={`nav-tag ${filterTab === 'overdue' ? 'phase' : ''}`}
              style={{ cursor: 'pointer', border: 'none', padding: '6px 12px' }}
              onClick={() => setFilterTab('overdue')}
            >
              Overdue ({stats?.overdue_items ?? 0})
            </button>
            <button
              type="button"
              className={`nav-tag ${filterTab === 'due' ? 'phase' : ''}`}
              style={{ cursor: 'pointer', border: 'none', padding: '6px 12px' }}
              onClick={() => setFilterTab('due')}
            >
              Due ({stats?.followups_due ?? 0})
            </button>
            <button
              type="button"
              className={`nav-tag ${filterTab === 'escalated' ? 'phase' : ''}`}
              style={{ cursor: 'pointer', border: 'none', padding: '6px 12px' }}
              onClick={() => setFilterTab('escalated')}
            >
              Escalated ({stats?.escalated_items ?? 0})
            </button>
            <button
              type="button"
              className={`nav-tag ${filterTab === 'snoozed' ? 'phase' : ''}`}
              style={{ cursor: 'pointer', border: 'none', padding: '6px 12px' }}
              onClick={() => setFilterTab('snoozed')}
            >
              Snoozed ({stats?.snoozed_items ?? 0})
            </button>
            <button
              type="button"
              className={`nav-tag ${filterTab === 'all' ? 'phase' : ''}`}
              style={{ cursor: 'pointer', border: 'none', padding: '6px 12px' }}
              onClick={() => setFilterTab('all')}
            >
              All Records
            </button>
          </div>
        </div>

        {/* Queue Items */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Calculating waiting times and status queue...
          </div>
        ) : followups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={36} color="#34d399" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>All Caught Up!</h4>
            <p style={{ fontSize: '0.84rem', maxWidth: '380px', margin: '6px auto 0' }}>
              No clients are waiting for a response under the selected filter.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {followups.map((item) => {
              const pr = getPriorityBadge(item.priority);
              const st = getStatusBadge(item.status);
              return (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(15, 20, 34, 0.65)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {/* Top Line: Client & Project, Priority Pill, Days Waiting */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="card-icon-pill primary" style={{ width: '32px', height: '32px' }}>
                        <Users size={15} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.96rem', fontWeight: 700, color: '#f8fafc' }}>
                            {item.client_name}
                          </span>
                          {item.client_company && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Building size={11} /> {item.client_company}
                            </span>
                          )}
                        </div>
                        {item.project_title && (
                          <div style={{ fontSize: '0.76rem', color: '#38bdf8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Briefcase size={11} /> {item.project_title}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Priority Pill */}
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: pr.bg,
                          color: pr.color,
                          border: `1px solid ${pr.border}`,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {pr.label}
                      </span>

                      {/* Status Badge */}
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: st.color,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: st.color }} />
                        {st.label}
                      </span>

                      {/* Days Waiting Indicator */}
                      <div
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontFamily: 'var(--font-mono)',
                          color: item.days_waiting >= 5 ? '#f97316' : item.days_waiting >= 2 ? '#fde047' : '#38bdf8',
                          fontWeight: 600,
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        {item.days_waiting.toFixed(1)} days waiting
                      </div>
                    </div>
                  </div>

                  {/* Conversation & Last Message Snippet */}
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                      Subject: {item.conversation_subject || 'Communication Thread'}
                    </div>
                    {item.last_message_content && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                        "{item.last_message_content}"
                      </p>
                    )}
                    {item.escalation_reason && (
                      <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#fda4af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldAlert size={12} />
                        <span>Escalation Notice: {item.escalation_reason}</span>
                      </div>
                    )}
                    {item.snoozed_until && (
                      <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Moon size={12} />
                        <span>Snoozed until: {new Date(item.snoozed_until).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Employee Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', flexWrap: 'wrap' }}>
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
                      onClick={() => setActiveAiFollowup(item)}
                      title="Analyze thread & generate professional follow-up draft"
                    >
                      <Sparkles size={12} />
                      <span>Generate Follow-up</span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                      onClick={() => setSnoozeModalItem(item)}
                      title="Snooze this item for 1-7 days"
                    >
                      <Moon size={12} />
                      <span>Snooze</span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '5px 12px', color: '#fda4af', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                      onClick={() => setEscalateModalItem(item)}
                      title="Flag as escalated"
                    >
                      <ShieldAlert size={12} />
                      <span>Escalate</span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '5px 12px', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}
                      onClick={() => handleComplete(item)}
                      title="Mark follow-up resolved"
                    >
                      <CheckCircle2 size={12} />
                      <span>Complete</span>
                    </button>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                      onClick={() => onNavigate('messages')}
                      title="View conversation thread in Messages"
                    >
                      <span>Open Thread</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal: Snooze Follow-Up */}
      {snoozeModalItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xl)', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Moon size={18} color="#818cf8" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                  Snooze Follow-up
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSnoozeModalItem(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Temporarily suppress alerts for <strong>{snoozeModalItem.client_name}</strong>. The item will revert to its active calculated status once the snooze duration expires.
            </p>

            <form onSubmit={handleConfirmSnooze} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Snooze Duration
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[1, 2, 3, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`nav-tag ${snoozeDays === d ? 'phase' : ''}`}
                      style={{ cursor: 'pointer', padding: '8px', textAlign: 'center', border: '1px solid var(--border-medium)' }}
                      onClick={() => setSnoozeDays(d)}
                    >
                      {d} Day{d > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSnoozeModalItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSnoozing}
                >
                  {isSnoozing ? 'Snoozing...' : `Confirm Snooze (${snoozeDays}d)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Escalate Follow-Up */}
      {escalateModalItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xl)', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#f43f5e" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                  Escalate Follow-up
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEscalateModalItem(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Immediately flag <strong>{escalateModalItem.client_name}</strong> for urgent escalation and senior management visibility.
            </p>

            <form onSubmit={handleConfirmEscalate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Escalation Reason
                </label>
                <textarea
                  className="search-input"
                  style={{ width: '100%', paddingLeft: '12px', minHeight: '80px', resize: 'vertical' }}
                  placeholder="e.g. Client requested urgent executive check-in..."
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEscalateModalItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' }}
                  disabled={isEscalating}
                >
                  {isEscalating ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generate AI Follow-Up */}
      {activeAiFollowup && (
        <GenerateFollowUpModal
          conversationId={activeAiFollowup.conversation_id}
          clientName={activeAiFollowup.client_name || 'Client'}
          subject={activeAiFollowup.conversation_subject || 'Communication Thread'}
          isOpen={Boolean(activeAiFollowup)}
          onClose={() => setActiveAiFollowup(null)}
          onSentSuccess={() => {
            setActiveAiFollowup(null);
            setActionSuccess(`Follow-up sent and marked completed for "${activeAiFollowup.client_name || 'Client'}".`);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
};
