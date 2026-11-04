import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import type { EmployeeUser } from '../../types';

interface EmployeeLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: EmployeeUser) => void;
}

export const EmployeeLoginModal: React.FC<EmployeeLoginModalProps> = ({
  isOpen,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('employee@clientpulse.ai');
  const [password, setPassword] = useState('ClientPulse2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.login(email.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        className="saas-card"
        style={{
          maxWidth: '440px',
          width: '100%',
          padding: '36px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.2)',
          background: 'linear-gradient(180deg, rgba(20, 26, 46, 0.95) 0%, rgba(13, 17, 30, 0.98) 100%)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            className="brand-icon-wrapper"
            style={{
              width: '54px',
              height: '54px',
              margin: '0 auto 16px',
              boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)',
            }}
          >
            <ShieldCheck size={28} color="#818cf8" />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Employee Portal
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Sign in with JWT credentials to access client operations and AI tools.
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#f87171',
              fontSize: '0.84rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
              Corporate Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="search-input"
                style={{ width: '100%', paddingLeft: '38px' }}
                placeholder="employee@clientpulse.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="search-input"
                style={{ width: '100%', paddingLeft: '38px' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              fontSize: '0.76rem',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={14} color="#818cf8" />
            <span>
              Pre-filled demo login: <strong>employee@clientpulse.ai</strong> / <strong>ClientPulse2026!</strong>
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 18px',
              fontSize: '0.92rem',
              fontWeight: 600,
              justifyContent: 'center',
              marginTop: '4px',
            }}
          >
            {isLoading ? 'Verifying session...' : 'Sign In as Employee'}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};
