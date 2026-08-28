import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
  Calendar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MatchScoreBadge } from '../../components/common/MatchScoreBadge';
import { StatusBadge } from '../../components/common/StatusBadge';

export function RecommendedTrialsPage({ onSelectTrial, setActiveTab }) {
  const { patients, currentPatientId, getTrialsForPatient } = useApp();

  const patient = patients.find(p => p.patient_id === currentPatientId) || patients[0] || null;
  const recommendedTrials = patient ? getTrialsForPatient(patient.patient_id) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
          Recommended Clinical Studies for You
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
          These clinical trials were matched against your diagnosed health conditions and latest laboratory metrics.
        </p>
      </div>

      {/* Trial Cards Stream */}
      {recommendedTrials.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {recommendedTrials.map((trial) => {
            const isEligible = trial.eligible;

          return (
            <div
              key={trial.trial_id}
              className="card card-hoverable"
              style={{
                padding: '1.5rem',
                borderLeft: `5px solid ${isEligible ? '#059669' : '#e11d48'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', maxWidth: 780 }}>
                  <MatchScoreBadge score={trial.match_percentage} isRadial={true} size={70} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: '#0284c7' }}>
                        {trial.trial_id}
                      </span>
                      <StatusBadge status={trial.verdict} size="sm" />
                      {trial.enrollment_status && (
                        <StatusBadge status={trial.enrollment_status} size="sm" />
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--slate-900)' }}>
                      {trial.trial_name}
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', marginTop: 4 }}>
                      {trial.description}
                    </p>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (onSelectTrial) onSelectTrial(trial.trial_id);
                    if (setActiveTab) setActiveTab('trial-detail');
                  }}
                >
                  <span>View Full Details</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              {/* Patient Friendly Qualification Explanations */}
              <div
                style={{
                  background: isEligible ? '#f0fdf4' : '#fff1f2',
                  border: `1px solid ${isEligible ? '#bbf7d0' : '#fecdd3'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: isEligible ? '#166534' : '#9f1239' }}>
                  {isEligible ? 'Why you may qualify for this study:' : 'Eligibility Considerations:'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.82rem', color: isEligible ? '#15803d' : '#991b1b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={15} color="#059669" /> Matches your age group requirement
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={15} color="#059669" /> Matches your documented condition history
                  </span>
                  {trial.gaps && trial.gaps.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b45309' }}>
                      <AlertTriangle size={15} color="#d97706" /> Note: {trial.gaps[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <Sparkles size={36} color="var(--slate-400)" />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--slate-800)', fontWeight: 700 }}>
            No Recommended Trials Available
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)', maxWidth: 460 }}>
            There are currently no open clinical trials matching your health profile. When new trials opening recruitment match your qualifications, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
