import React from 'react';

export function StatCard({ label, value, subtext, icon: Icon, color = 'primary', onClick }) {
  const colorMap = {
    primary: { bg: '#f0f9ff', icon: '#0284c7', border: '#bae6fd' },
    success: { bg: '#ecfdf5', icon: '#059669', border: '#a7f3d0' },
    warning: { bg: '#fffbeb', icon: '#d97706', border: '#fde68a' },
    danger: { bg: '#fff1f2', icon: '#e11d48', border: '#fecdd3' },
    slate: { bg: '#f8fafc', icon: '#475569', border: '#e2e8f0' }
  };

  const theme = colorMap[color] || colorMap.primary;

  return (
    <div
      className={`stat-card ${onClick ? 'card-hoverable' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-card-label">
        <span>{label}</span>
        {Icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: theme.bg,
              color: theme.icon,
              border: `1px solid ${theme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      {subtext && <div className="stat-card-sub">{subtext}</div>}
    </div>
  );
}
