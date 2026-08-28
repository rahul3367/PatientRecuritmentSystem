import React from 'react';
import { ShieldAlert, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export function CriteriaBadge({ criterion, onEdit, onDelete, editable = false }) {
  const isHard = criterion.classification === 'HARD';

  let ruleSummary = '';
  if (criterion.data_type === 'NUMERIC') {
    if (isHard) {
      ruleSummary = `Between ${criterion.numeric_min} and ${criterion.numeric_max}`;
    } else {
      ruleSummary = `Ideal: ${criterion.numeric_ideal} (±${criterion.numeric_tolerance} tol) • Weight: ${criterion.weight || 1.0}`;
    }
  } else if (criterion.data_type === 'CATEGORICAL') {
    ruleSummary = `${criterion.operator || 'Includes'}: "${criterion.categorical_ideal}"`;
  } else if (criterion.data_type === 'BOOLEAN') {
    ruleSummary = `Must be ${criterion.boolean_ideal ? 'Yes / True' : 'No / False'}`;
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${isHard ? '#fecdd3' : '#bae6fd'}`,
        borderLeft: `4px solid ${isHard ? '#e11d48' : '#0284c7'}`,
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        boxShadow: 'var(--shadow-xs)',
        transition: 'all var(--transition-fast)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--slate-900)', textTransform: 'capitalize' }}>
            {criterion.field.replace(/_/g, ' ')}
          </span>
          <StatusBadge status={criterion.classification} size="sm" />
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-subtle)',
              color: 'var(--slate-600)',
              letterSpacing: '0.04em'
            }}
          >
            {criterion.data_type}
          </span>
        </div>
        <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)' }}>
          {ruleSummary}
        </div>
      </div>

      {editable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {onEdit && (
            <button
              className="btn-ghost btn-sm"
              onClick={() => onEdit(criterion)}
              title="Edit Criterion"
              style={{ color: 'var(--slate-600)', padding: '0.35rem' }}
            >
              <Edit2 size={14} />
            </button>
          )}
          {onDelete && (
            <button
              className="btn-ghost btn-sm"
              onClick={() => onDelete(criterion.criterion_id || criterion.field)}
              title="Delete Criterion"
              style={{ color: 'var(--danger-solid)', padding: '0.35rem' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
