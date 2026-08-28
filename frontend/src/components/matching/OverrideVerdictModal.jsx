import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';

export function OverrideVerdictModal({ isOpen, onClose, screeningId }) {
  const { screenings, overrideVerdict, clinicianName, showToast } = useApp();
  const [selectedVerdict, setSelectedVerdict] = useState('APPROVED');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const screening = screenings.find(s => s.screening_id === screeningId);

  if (!screening) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      showToast('Validation Error', 'Clinical justification / remarks are strictly mandatory for verdict overrides.', 'danger');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await overrideVerdict(screeningId, selectedVerdict, remarks.trim());
      if (success) {
        setRemarks('');
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Override AI Screening Verdict: #${screeningId}`}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting || !remarks.trim()}>
            {isSubmitting ? 'Submitting...' : 'Submit Override & Log Audit'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Current State Summary */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>
              Current AI Screening Verdict
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 4 }}>
              <StatusBadge status={screening.verdict} />
              <span style={{ fontSize: '0.84rem', color: 'var(--slate-600)' }}>
                ({screening.match_percentage}% Score)
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--slate-600)' }}>
            Patient ID: <strong>{screening.patient_id}</strong><br />
            Trial ID: <strong>{screening.trial_id}</strong>
          </div>
        </div>

        {/* Verdict Selection */}
        <div>
          <label className="form-label form-label-req">Select New Official Verdict</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.35rem' }}>
            {['APPROVED', 'NEEDS_REVIEW', 'REJECTED'].map((v) => {
              const isSelected = selectedVerdict === v;
              return (
                <div
                  key={v}
                  onClick={() => setSelectedVerdict(v)}
                  style={{
                    border: `2px solid ${isSelected ? '#0284c7' : 'var(--border-subtle)'}`,
                    background: isSelected ? 'var(--primary-50)' : '#ffffff',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: isSelected ? '#0369a1' : 'var(--slate-700)' }}>
                    {v}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mandatory Clinical Reason */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label form-label-req">
            Clinical Reason & Justification
          </label>
          <textarea
            className="form-textarea"
            placeholder="Document mandatory clinical justification, lab re-evaluations, or protocol exemptions..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            required
          />
          <div className="form-hint">
            The backend strictly requires a clinical remark. This action will be logged in the permanent audit trail under <strong>{clinicianName}</strong>.
          </div>
        </div>

        {/* Audit Notice */}
        <div
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <ShieldAlert size={18} color="#e11d48" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.8rem', color: '#9f1239' }}>
            <strong>Institutional Audit Trail Notice:</strong> All verdict overrides are timestamped and permanently archived with your credential ID.
          </div>
        </div>
      </form>
    </Modal>
  );
}
