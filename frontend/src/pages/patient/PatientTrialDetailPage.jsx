import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Building,
  ShieldCheck,
  Sparkles,
  Heart,
  Mail,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MatchScoreBadge } from '../../components/common/MatchScoreBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DynamicEligibilityModal } from '../../components/patient/DynamicEligibilityModal';

export function PatientTrialDetailPage({ trialId, onBack, setActiveTab }) {
  const { trials, patients, currentPatientId, enrollments, acceptInvite, showToast } = useApp();
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);

  const trial = trials.find(t => t.trial_id === trialId) || trials[0] || null;
  const patient = patients.find(p => p.patient_id === currentPatientId) || patients[0] || null;
  
  if (!trial) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
        {onBack && (
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ width: 'fit-content' }}>
            <ArrowLeft size={16} />
            <span>Back to Clinical Trials</span>
          </button>
        )}
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
          <h3>Clinical Trial Not Found</h3>
          <p>The requested study protocol is not currently available.</p>
        </div>
      </div>
    );
  }

  const existingEnrollment = patient ? enrollments.find(e => e.trial_id === trial.trial_id && e.patient_id === patient.patient_id) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Back Button */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={onBack}
        style={{ width: 'fit-content', color: 'var(--slate-600)' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Clinical Trials</span>
      </button>

      {/* Trial Header */}
      <div
        className="card"
        style={{
          padding: '2rem',
          borderLeft: '5px solid #059669',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}
      >
        <div style={{ flex: '1 1 500px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', fontWeight: 700, color: '#0284c7' }}>
              Study ID: {trial.trial_id}
            </span>
            <StatusBadge status={trial.status} size="sm" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {trial.trial_name}
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--slate-600)', marginTop: 6, lineHeight: 1.6 }}>
            {trial.description}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 200 }}>
          <button
            className="btn btn-primary"
            onClick={() => setIsEligibilityModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              color: '#ffffff',
              padding: '0.75rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              cursor: 'pointer'
            }}
          >
            <FileCheck size={18} />
            <span>Check Eligibility</span>
          </button>
        </div>
      </div>

      {/* What You Can Expect in this Study */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--slate-900)' }}>
            What to Expect During the Study
          </h3>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <Calendar size={22} color="#0284c7" />
            <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--slate-900)', marginTop: 8 }}>
              Study Duration
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: 4 }}>
              Regularly scheduled clinical evaluations with monitoring by the principal research investigator.
            </p>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <Heart size={22} color="#059669" />
            <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--slate-900)', marginTop: 8 }}>
              Medical Care & Testing
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: 4 }}>
              All study-related lab tests, monitoring, and study interventions provided under institutional supervision.
            </p>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <Building size={22} color="#d97706" />
            <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--slate-900)', marginTop: 8 }}>
              Enrollment & Ethics
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: 4 }}>
              Adheres to strict IRB clinical trial compliance and patient confidentiality protocols.
            </p>
          </div>
        </div>
      </div>

      {/* Action Footer Card */}
      <div
        className="card"
        style={{
          background: '#f8fafc',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--slate-900)' }}>
            Ready to participate in this study?
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)' }}>
            Perform a quick dynamic eligibility check to verify protocol matching and submit your application.
          </div>
        </div>

        {existingEnrollment?.status === 'INVITED' ? (
          <button
            className="btn btn-success btn-lg"
            onClick={() => {
              acceptInvite(trial.trial_id, patient.patient_id);
              if (setActiveTab) setActiveTab('enrollment');
            }}
          >
            <CheckCircle2 size={18} />
            <span>Accept Official Invitation</span>
          </button>
        ) : (
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setIsEligibilityModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Sparkles size={18} />
            <span>Check Dynamic Eligibility & Apply</span>
          </button>
        )}
      </div>

      {/* Dynamic Eligibility Modal */}
      {isEligibilityModalOpen && (
        <DynamicEligibilityModal
          trial={trial}
          isOpen={isEligibilityModalOpen}
          onClose={() => setIsEligibilityModalOpen(false)}
          onNavigateToEnrollment={() => {
            setIsEligibilityModalOpen(false);
            if (setActiveTab) setActiveTab('enrollment');
          }}
        />
      )}
    </div>
  );
}

