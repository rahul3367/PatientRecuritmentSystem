import React from 'react';
import {
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardCheck,
  Send,
  UserCheck
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { MatchScoreBadge } from '../common/MatchScoreBadge';
import { StatusBadge } from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';

export function MatchAnalysisModal({
  isOpen,
  onClose,
  candidate,
  trial,
  onScreen,
  onVerify,
  onOverride,
  onInvite
}) {
  const { screenings, verifications } = useApp();

  if (!candidate || !trial) return null;

  const snapshot = candidate.criteria_snapshot || {};
  const explanations = snapshot.explanations || [];
  
  const hardExplanations = explanations.filter(e => e.type === 'HARD');
  const softExplanations = explanations.filter(e => e.type === 'SOFT');

  // Check if candidate already has an official screening
  const existingScreening = candidate.screening_id
    ? screenings.find(s => s.screening_id === candidate.screening_id)
    : screenings.find(s => s.trial_id === trial.trial_id && s.patient_id === candidate.patient_id);

  const verification = existingScreening
    ? verifications.find(v => v.screening_id === existingScreening.screening_id)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={`Eligibility Analysis: ${candidate.patient_name || candidate.name} (${candidate.patient_id})`}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
            Study: <strong>{trial.trial_id}</strong> — {trial.trial_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {!existingScreening && onScreen && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  onScreen(candidate.patient_id, trial.trial_id);
                  onClose();
                }}
              >
                <ClipboardCheck size={16} />
                <span>Perform Official Screening</span>
              </button>
            )}
            {existingScreening && !verification && onVerify && (
              <button
                className="btn btn-success"
                onClick={() => {
                  onVerify(existingScreening.screening_id);
                }}
              >
                <CheckCircle2 size={16} />
                <span>Verify as Reviewed</span>
              </button>
            )}
            {existingScreening && onOverride && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  onClose();
                  onOverride(existingScreening.screening_id);
                }}
              >
                Override Verdict
              </button>
            )}
            {candidate.verdict === 'APPROVED' && onInvite && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  onInvite(trial.trial_id, candidate.patient_id);
                  onClose();
                }}
              >
                <Send size={16} />
                <span>Send Invitation</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Summary Banner */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <MatchScoreBadge score={candidate.match_percentage} isRadial={true} size={76} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <StatusBadge status={candidate.verdict} />
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    background: existingScreening ? '#ecfdf5' : '#f1f5f9',
                    color: existingScreening ? '#065f46' : '#64748b',
                    border: `1px solid ${existingScreening ? '#a7f3d0' : '#cbd5e1'}`
                  }}
                >
                  {existingScreening ? `Official Screening #${existingScreening.screening_id}` : 'In-Memory Preview'}
                </span>
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)' }}>
                Candidate: <strong>{candidate.patient_name || candidate.name}</strong> • Gender: {candidate.gender || 'N/A'} • Location: {candidate.location || 'N/A'}
              </div>
            </div>
          </div>

          {/* Verification Status Pill */}
          {verification && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#065f46'
              }}
            >
              <CheckCircle2 size={16} color="#059669" />
              <div>
                <div><strong>Verified by {verification.verified_by}</strong></div>
                <div style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>{verification.remarks}</div>
              </div>
            </div>
          )}
        </div>

        {/* Hard Gates Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <ShieldAlert size={18} color="#e11d48" />
            <h4 style={{ fontSize: '0.98rem', color: 'var(--slate-900)' }}>
              Mandatory Inclusion & Exclusion Gates (HARD)
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {hardExplanations.map((exp, idx) => (
              <div
                key={idx}
                style={{
                  background: exp.passed ? '#f0fdf4' : '#fff1f2',
                  border: `1px solid ${exp.passed ? '#bbf7d0' : '#fecdd3'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                {exp.passed ? (
                  <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
                ) : (
                  <XCircle size={18} color="#e11d48" style={{ flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.86rem', color: exp.passed ? '#166534' : '#9f1239', textTransform: 'capitalize' }}>
                      {exp.field.replace(/_/g, ' ')}
                    </strong>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: exp.passed ? '#059669' : '#e11d48' }}>
                      {exp.passed ? 'PASSED GATE' : 'FAILED DISQUALIFIER'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: 2 }}>
                    {exp.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Soft Preferences Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Sparkles size={18} color="#0284c7" />
            <h4 style={{ fontSize: '0.98rem', color: 'var(--slate-900)' }}>
              Continuous Gaussian Preferences (SOFT)
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {softExplanations.map((exp, idx) => {
              const isPerfect = exp.score === exp.max_score;
              return (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isPerfect ? (
                      <CheckCircle2 size={16} color="#0284c7" />
                    ) : (
                      <AlertTriangle size={16} color="#d97706" />
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--slate-900)', textTransform: 'capitalize' }}>
                        {exp.field.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                        {exp.message}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.86rem', color: isPerfect ? '#0284c7' : '#d97706' }}>
                      {exp.score} / {exp.max_score}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--slate-400)', textTransform: 'uppercase' }}>
                      Weight Score
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gaps / Actionable Insights */}
        {candidate.gaps && candidate.gaps.length > 0 && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <AlertTriangle size={18} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.86rem', color: '#92400e' }}>
                Clinical Review Gaps Identified ({candidate.gaps.length})
              </strong>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#78350f' }}>
                {candidate.gaps.map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
