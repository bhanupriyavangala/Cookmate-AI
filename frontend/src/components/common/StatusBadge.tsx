import React from 'react';

interface StatusBadgeProps {
  status: 'healthy' | 'degraded' | 'offline' | 'connected' | 'disconnected' | 'phase' | 'info';
  label?: string;
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  pulse = false,
}) => {
  const getDotClass = () => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'healthy';
      case 'degraded':
        return 'degraded';
      case 'offline':
      case 'disconnected':
        return 'offline';
      default:
        return 'healthy';
    }
  };

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="status-pill">
      <span className={`status-dot ${getDotClass()} ${pulse ? 'pulse' : ''}`} />
      <span>{displayLabel}</span>
    </div>
  );
};
