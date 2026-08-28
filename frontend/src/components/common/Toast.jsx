import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  const iconMap = {
    success: <CheckCircle2 size={18} color="#059669" />,
    warning: <AlertTriangle size={18} color="#d97706" />,
    danger: <XCircle size={18} color="#e11d48" />,
    info: <Info size={18} color="#0284c7" />
  };

  const borderMap = {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#f43f5e',
    info: '#0ea5e9'
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        zIndex: 200,
        maxWidth: 400,
        width: 'calc(100vw - 3rem)'
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1.1rem',
            border: '1px solid var(--border-subtle)',
            borderLeft: `4px solid ${borderMap[toast.type] || borderMap.info}`,
            boxShadow: 'var(--shadow-xl)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            animation: 'slideUp 200ms ease forwards'
          }}
        >
          <div style={{ marginTop: 2, flexShrink: 0 }}>
            {iconMap[toast.type] || iconMap.info}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--slate-900)' }}>
              {toast.title}
            </div>
            {toast.message && (
              <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: 2 }}>
                {toast.message}
              </div>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              padding: '0.2rem',
              color: 'var(--slate-400)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
