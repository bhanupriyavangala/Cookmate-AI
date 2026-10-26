import React from 'react';
import {
  Activity,
  LayoutDashboard,
  Users,
  BookUser,
  Briefcase,
  MessageSquare,
  Settings,
  Database,
} from 'lucide-react';
import type { NavItemKey } from '../../types';

interface SidebarProps {
  currentTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  backendOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  backendOnline,
}) => {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon-wrapper">
          <Activity size={22} />
        </div>
        <div className="brand-text-container">
          <span className="brand-title">ClientPulse</span>
          <span className="brand-badge">AI Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">Core Workspace</div>

        <button
          className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
          type="button"
        >
          <LayoutDashboard className="nav-icon" />
          <span className="nav-label">Dashboard</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'clients' ? 'active' : ''}`}
          onClick={() => onTabChange('clients')}
          type="button"
        >
          <Users className="nav-icon" />
          <span className="nav-label">Clients</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'contacts' ? 'active' : ''}`}
          onClick={() => onTabChange('contacts')}
          type="button"
        >
          <BookUser className="nav-icon" />
          <span className="nav-label">Contacts</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'projects' ? 'active' : ''}`}
          onClick={() => onTabChange('projects')}
          type="button"
        >
          <Briefcase className="nav-icon" />
          <span className="nav-label">Projects</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'messages' ? 'active' : ''}`}
          onClick={() => onTabChange('messages')}
          type="button"
        >
          <MessageSquare className="nav-icon" />
          <span className="nav-label">Messages</span>
        </button>

        <div className="nav-section-title">Preferences</div>

        <button
          className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
          type="button"
        >
          <Settings className="nav-icon" />
          <span className="nav-label">Configuration</span>
        </button>
      </nav>

      {/* Sidebar Footer with System Diagnostics */}
      <div className="sidebar-footer">
        <div className="status-mini-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={15} color="#94a3b8" />
            <span style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>Backend API</span>
          </div>
          <div className="status-pill">
            <span
              className={`status-dot ${backendOnline ? 'healthy pulse' : 'degraded'}`}
            />
            <span style={{ fontSize: '0.72rem', color: backendOnline ? '#34d399' : '#f59e0b' }}>
              {backendOnline ? 'Online' : 'Standby'}
            </span>
          </div>
        </div>

        <div className="user-profile-bar">
          <div className="user-avatar">CP</div>
          <div className="user-info">
            <span className="user-name">Developer Mode</span>
            <span className="user-role">Full-Stack SaaS</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
