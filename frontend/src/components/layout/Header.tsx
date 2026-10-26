import React from 'react';
import { Search, RefreshCw, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import type { NavItemKey } from '../../types';

interface HeaderProps {
  currentTab: NavItemKey;
  backendOnline: boolean;
  isChecking: boolean;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  backendOnline,
  isChecking,
  onRefreshHealth,
}) => {
  const getTabDetails = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'System Dashboard & Metrics',
          subtitle: 'Operational summary, live backend status, and database diagnostics',
        };
      case 'clients':
        return {
          title: 'Client Management',
          subtitle: 'Create, update, search, and archive client accounts and contacts',
        };
      case 'projects':
        return {
          title: 'Projects & Engagements',
          subtitle: 'Manage client deliverables, budgets, delivery timelines, and statuses',
        };
      case 'messages':
        return {
          title: 'Client Conversations & Messages',
          subtitle: 'Chronological message history, communication channels, and follow-up threads',
        };
      case 'settings':
        return {
          title: 'Environment & Configuration',
          subtitle: 'ClientPulse AI runtime variables and database credentials',
        };
      default:
        return {
          title: 'ClientPulse AI',
          subtitle: 'Client Communication & Follow-up Management',
        };
    }
  };

  const details = getTabDetails();

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-title-container">
          <h1 className="header-title">{details.title}</h1>
          <span className="header-subtitle">{details.subtitle}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Search Bar */}
        <div className="header-search">
          <Search className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search records..."
            readOnly
          />
        </div>

        {/* Backend Status Chip */}
        <div className="header-chip">
          {backendOnline ? (
            <>
              <ShieldCheck size={14} color="#10b981" />
              <span style={{ color: '#34d399' }}>FastAPI Active :8000</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} color="#f59e0b" />
              <span style={{ color: '#fbbf24' }}>FastAPI Standby</span>
            </>
          )}
          <button
            type="button"
            className="action-icon-btn"
            style={{ width: '22px', height: '22px', border: 'none', background: 'transparent' }}
            title="Refresh health check"
            onClick={onRefreshHealth}
          >
            <RefreshCw
              size={12}
              style={{
                animation: isChecking ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
        </div>

        {/* Swagger Docs External Link */}
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ textDecoration: 'none', padding: '6px 12px', fontSize: '0.78rem' }}
        >
          <span>Swagger Docs</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </header>
  );
};
