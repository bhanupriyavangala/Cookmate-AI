import React from 'react';
import { Sliders, Terminal, Shield, FileText } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div>
      <section className="hero-banner">
        <div className="hero-top-tag">
          <Sliders size={13} />
          <span>System Environment & Variables</span>
        </div>
        <h2 className="hero-heading">Runtime Configuration</h2>
        <p className="hero-desc">
          Configuration parameters loaded from <code style={{ color: '#818cf8' }}>.env</code>.
          Variables are safely decoupled from the codebase using <code style={{ color: '#818cf8' }}>pydantic-settings</code> for
          FastAPI and Vite environment prefixes for React.
        </p>
      </section>

      <div className="grid-cards">
        <div className="saas-card">
          <div className="card-header-row">
            <div className="card-icon-pill primary">
              <Shield size={20} />
            </div>
            <span className="nav-tag phase">Backend Env</span>
          </div>
          <h3 className="card-title">Backend Parameters</h3>
          <p className="card-body-text">
            Parameters configured in <code style={{ color: '#818cf8' }}>backend/.env</code>:
          </p>
          <div className="card-meta-list">
            <div className="meta-row">
              <span className="meta-label">PROJECT_NAME</span>
              <span className="meta-value">"ClientPulse AI"</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">ENVIRONMENT</span>
              <span className="meta-value">"development"</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">API_V1_PREFIX</span>
              <span className="meta-value">"/api/v1"</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">ALLOWED_ORIGINS</span>
              <span className="meta-value">http://localhost:5173</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">DATABASE_URL</span>
              <span className="meta-value">postgresql://postgres:***@localhost:5432/...</span>
            </div>
          </div>
        </div>

        <div className="saas-card">
          <div className="card-header-row">
            <div className="card-icon-pill cyan">
              <FileText size={20} />
            </div>
            <span className="nav-tag phase">Frontend Env</span>
          </div>
          <h3 className="card-title">Frontend Parameters</h3>
          <p className="card-body-text">
            Parameters configured in <code style={{ color: '#818cf8' }}>frontend/.env</code>:
          </p>
          <div className="card-meta-list">
            <div className="meta-row">
              <span className="meta-label">VITE_API_BASE_URL</span>
              <span className="meta-value">http://localhost:8000</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">VITE_APP_NAME</span>
              <span className="meta-value">"ClientPulse AI"</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Dev Port</span>
              <span className="meta-value">:5173</span>
            </div>
          </div>
        </div>
      </div>

      {/* Windows Quick Reference */}
      <div className="saas-card">
        <div className="card-header-row">
          <div className="card-icon-pill purple">
            <Terminal size={20} />
          </div>
          <span className="nav-tag" style={{ color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.3)' }}>
            Windows PowerShell
          </span>
        </div>
        <h3 className="card-title">Quick Start Commands</h3>
        <p className="card-body-text">
          Run the following commands in separate PowerShell terminal windows:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>
              1. Backend (FastAPI & Uvicorn):
            </div>
            <pre className="code-preview">cd backend&#10;python -m venv .venv&#10;.\.venv\Scripts\Activate.ps1&#10;pip install -r requirements.txt&#10;uvicorn app.main:app --reload --port 8000</pre>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>
              2. Frontend (React & Vite):
            </div>
            <pre className="code-preview">cd frontend&#10;npm install&#10;npm run dev</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
