import React, { useState } from 'react';
import {
  User,
  Activity,
  Heart,
  Calendar,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FlaskConical,
  ClipboardCheck,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MatchScoreBadge } from '../../components/common/MatchScoreBadge';
import { MatchAnalysisModal } from '../../components/matching/MatchAnalysisModal';
import { formatDate, formatDateTime } from '../../utils/formatters';

export function PatientProfilePage({ patientId, onBack, onSelectTrial }) {
  const {
    patients,
    trials,
    getTrialsForPatient,
    performOfficialScreening,
    verifyScreening,
    invitePatient
  } = useApp();

  const [selectedTrialForModal, setSelectedTrialForModal] = useState(null);

  const patient = patients.find(p => p.patient_id === patientId) || patients[0] || null;
  const eligibleTrials = patient ? getTrialsForPatient(patient.patient_id) : [];

  if (!patient) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {onBack && (
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ width: 'fit-content' }}>
            <ArrowLeft size={16} />
            <span>Back to Registry</span>
          </button>
        )}
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
          <User size={36} style={{ margin: '0 auto 1rem', color: 'var(--slate-400)' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--slate-800)', fontWeight: 700 }}>Patient Record Not Found</h3>
          <p style={{ fontSize: '0.86rem', marginTop: 4 }}>The selected patient record does not exist in the active clinical registry.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back button */}
      {onBack && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={onBack}
          style={{ width: 'fit-content', color: 'var(--slate-600)' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Registry</span>
        </button>
      )}

      {/* Patient Header Card */}
      <div
        className="card"
        style={{
          padding: '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#0284c7',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.4rem'
            }}
          >
            {patient.name?.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                {patient.name}
              </h2>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#0284c7', fontWeight: 700 }}>
                {patient.patient_id}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: 4,
                  background: patient.consent ? '#ecfdf5' : '#fff1f2',
                  color: patient.consent ? '#065f46' : '#9f1239'
                }}
              >
                {patient.consent ? 'Consent Signed' : 'No Consent'}
              </span>
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--slate-500)', marginTop: 4 }}>
              {patient.gender} • DOB: {patient.dob} • Location: {patient.location} • Phone: {patient.phone}
            </div>
          </div>
        </div>

        {patient.active_trial_id && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-lg)',
              padding: '0.75rem 1.25rem',
              textAlign: 'right'
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Active Trial Enrollment
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>
              {patient.active_trial_id}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Health Snapshot & Conditions */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Clinical History & Demographics */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--slate-900)' }}>
              Clinical History & Lifestyle
            </h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.86rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
              <span style={{ color: 'var(--slate-500)' }}>Blood Group</span>
              <strong>{patient.blood_group || 'N/A'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
              <span style={{ color: 'var(--slate-500)' }}>Previous Surgeries</span>
              <strong>{patient.previous_surgery || 'None Reported'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
              <span style={{ color: 'var(--slate-500)' }}>Smoking Status</span>
              <strong>{patient.smoking ? 'Current Smoker' : 'Non-Smoker'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
              <span style={{ color: 'var(--slate-500)' }}>Alcohol Consumption</span>
              <strong>{patient.alcohol ? 'Yes' : 'No'}</strong>
            </div>

            {/* Conditions & Allergies */}
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Active Diagnoses
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {patient.conditions && patient.conditions.length > 0 ? (
                  patient.conditions.map((c, i) => (
                    <span key={i} style={{ background: '#eff6ff', color: '#1e40af', padding: '0.2rem 0.55rem', borderRadius: 4, fontWeight: 600, fontSize: '0.78rem' }}>
                      {c.condition_name} ({formatDate(c.diagnosed_at)})
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--slate-400)' }}>No active chronic diagnoses</span>
                )}
              </div>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Documented Allergies
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {patient.allergies && patient.allergies.length > 0 ? (
                  patient.allergies.map((a, i) => (
                    <span key={i} style={{ background: '#fff1f2', color: '#9f1239', padding: '0.2rem 0.55rem', borderRadius: 4, fontWeight: 600, fontSize: '0.78rem' }}>
                      {a.allergen}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--slate-400)' }}>No known drug/environmental allergies</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Historical Vitals Timeline */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--slate-900)' }}>
              Longitudinal Vitals Snapshots
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>BP</th>
                  <th>HbA1c</th>
                  <th>BMI</th>
                  <th>Glucose</th>
                </tr>
              </thead>
              <tbody>
                {patient.vitals && patient.vitals.length > 0 ? (
                  patient.vitals.map((v) => (
                    <tr key={v.vitals_id}>
                      <td style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                        {formatDate(v.recorded_at)}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {v.bp_systolic}/{v.bp_diastolic}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {v.hba1c ? `${v.hba1c}%` : '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {v.bmi || '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {v.blood_glucose ? `${v.blood_glucose} mg/dL` : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      No recorded vitals snapshots.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Multi-Trial Match Eligibility Matrix */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
              Open Trial Eligibility & Matching Matrix
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
              Real-time evaluation of patient {patient.name} against all active recruiting protocols.
            </p>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Study ID</th>
                <th>Protocol Name</th>
                <th>Match Score</th>
                <th>AI Verdict</th>
                <th>Eligibility Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {eligibleTrials.map((et) => {
                const targetTrial = trials.find(t => t.trial_id === et.trial_id);
                return (
                  <tr key={et.trial_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0284c7' }}>
                      {et.trial_id}
                    </td>
                    <td>
                      <strong>{et.trial_name}</strong>
                    </td>
                    <td>
                      <MatchScoreBadge score={et.match_percentage} />
                    </td>
                    <td>
                      <StatusBadge status={et.verdict} size="sm" />
                    </td>
                    <td>
                      {et.enrollment_status ? (
                        <StatusBadge status={et.enrollment_status} size="sm" />
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: et.eligible ? '#059669' : '#e11d48', fontWeight: 600 }}>
                          {et.eligible ? 'Eligible for Screening' : 'Ineligible'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedTrialForModal(targetTrial)}
                        >
                          Analyze Match
                        </button>
                        {et.verdict === 'APPROVED' && !et.enrollment_status && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => invitePatient(et.trial_id, patient.patient_id)}
                          >
                            Invite
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match Deep Dive Modal */}
      {selectedTrialForModal && (
        <MatchAnalysisModal
          isOpen={Boolean(selectedTrialForModal)}
          onClose={() => setSelectedTrialForModal(null)}
          candidate={{
            patient_id: patient.patient_id,
            patient_name: patient.name,
            gender: patient.gender,
            dob: patient.dob,
            location: patient.location,
            match_percentage: eligibleTrials.find(e => e.trial_id === selectedTrialForModal.trial_id)?.match_percentage || 0,
            verdict: eligibleTrials.find(e => e.trial_id === selectedTrialForModal.trial_id)?.verdict || 'REJECTED',
            criteria_snapshot: eligibleTrials.find(e => e.trial_id === selectedTrialForModal.trial_id)?.criteria_snapshot || {},
            gaps: eligibleTrials.find(e => e.trial_id === selectedTrialForModal.trial_id)?.gaps || []
          }}
          trial={selectedTrialForModal}
          onScreen={performOfficialScreening}
          onVerify={verifyScreening}
          onInvite={invitePatient}
        />
      )}
    </div>
  );
}
