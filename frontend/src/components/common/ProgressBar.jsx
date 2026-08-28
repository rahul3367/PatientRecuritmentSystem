import React from 'react';

export function ProgressBar({ current, target, height = 8, showLabels = false, label = 'Recruitment Progress' }) {
  const currentNum = Number(current) || 0;
  const targetNum = Number(target) || 1;
  const pct = targetNum > 0 ? Math.min(100, Math.round((currentNum / targetNum) * 100)) : 0;

  return (
    <div style={{ width: '100%' }}>
      {showLabels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.84rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--slate-800)' }}>
            <strong>{currentNum}</strong> / {targetNum} enrolled ({pct}%)
          </span>
        </div>
      )}
      <div className="progress-track" style={{ height }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
