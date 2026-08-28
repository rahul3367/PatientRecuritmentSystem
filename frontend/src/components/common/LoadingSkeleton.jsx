import React from 'react';

export function LoadingSkeleton({ lines = 3, height = 20, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            height,
            width: i === lines - 1 && lines > 1 ? '70%' : '100%',
            background: 'var(--bg-muted)',
            borderRadius: 'var(--radius-sm)'
          }}
        />
      ))}
    </div>
  );
}
