import React from 'react';
import {
  Mail,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Calendar,
  Building,
  ShieldCheck,
  Inbox
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';

export function InvitationsPage({ setActiveTab }) {
  const {
    patients,
    currentPatientId,
    enrollments,
    trials,
    acceptInvite,
    declineInvite,
    showToast
  } = useApp();

  const patient = patients.find(p => p.patient_id === currentPatientId) || patients[0] || null;
  const myInvitations = patient ? enrollments.filter(
    e => e.patient_id === patient.patient_id && (e.status === 'INVITED' || e.status === 'ACCEPTED' || e.status === 'DECLINED')
  ) : [];

  const handleAccept = async (trialId) => {
    await acceptInvite(trialId, patient.patient_id);
  };

  const handleDecline = async (trialId) => {
    await declineInvite(trialId, patient.patient_id, 'Declined by patient');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
          Official Study Invitations
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
          Review and respond to clinical trial invitations dispatched by medical research investigators.
        </p>
      </div>

      {myInvitations.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {myInvitations.map((inv) => {
            const trial = trials.find(t => t.trial_id === inv.trial_id);
            const isPending = inv.status === 'INVITED';

            return (
              <div
                key={inv.enrollment_id}
                className="card"
                style={{
                  padding: '1.75rem',
                  borderLeft: `5px solid ${isPending ? '#0284c7' : inv.status === 'ACCEPTED' ? '#059669' : '#94a3b8'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: '#0284c7' }}>
                        {inv.trial_id}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.55rem',
                          borderRadius: 4,
                          background: isPending ? '#eff6ff' : inv.status === 'ACCEPTED' ? '#ecfdf5' : '#f1f5f9',
                          color: isPending ? '#1e40af' : inv.status === 'ACCEPTED' ? '#065f46' : '#64748b'
                        }}
                      >
                        {inv.status === 'INVITED' ? 'ACTION REQUIRED' : inv.status}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', color: 'var(--slate-900)' }}>
                      {trial?.trial_name || inv.trial_id}
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginTop: 4 }}>
                      {trial?.description}
                    </p>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', textAlign: 'right' }}>
                    Invited on {formatDate(inv.invited_at)}
                  </div>
                </div>

                {/* Personalized Message from PI */}
                <div style={{ background: 'var(--bg-subtle)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--slate-800)', marginBottom: 2 }}>
                    Message from Principal Investigator
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--slate-600)', fontStyle: 'italic' }}>
                    "Dear {patient.name}, based on your clinical profile and lab parameters, you qualify for participation in this study. We invite you to join our cohort."
                  </p>
                </div>

                {/* Decision Actions */}
                {isPending ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDecline(inv.trial_id)}
                      style={{ color: 'var(--danger-solid)' }}
                    >
                      <XCircle size={16} />
                      <span>Decline Invitation</span>
                    </button>
                    <button
                      className="btn btn-success btn-lg"
                      onClick={() => handleAccept(inv.trial_id)}
                    >
                      <CheckCircle2 size={18} />
                      <span>Accept Invitation</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.84rem' }}>
                    <span style={{ color: inv.status === 'ACCEPTED' ? '#059669' : '#64748b', fontWeight: 600 }}>
                      {inv.status === 'ACCEPTED' ? '✓ You accepted this study invitation.' : 'You declined this study invitation.'}
                    </span>
                    {inv.status === 'ACCEPTED' && (
                      <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('enrollment')}>
                        <span>View Study Tracker</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--bg-subtle)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)' }}>
            <Inbox size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-800)' }}>No Pending Invitations</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', marginTop: 4 }}>
            When research teams screen and select your profile, official study invitations will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
