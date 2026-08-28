import React from 'react';
import {
  Sparkles,
  Mail,
  UserCheck,
  Heart,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Activity,
  AlertCircle,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MatchScoreBadge } from '../../components/common/MatchScoreBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatters';

export function PatientHomePage({ setActiveTab, onSelectTrial, onOpenOnboarding }) {
  const {
    patients,
    currentPatientId,
    getTrialsForPatient,
    enrollments,
    notifications
  } = useApp();

  const patient = patients.find(p => p.patient_id === currentPatientId) || patients[0] || null;
  const patientName = patient?.name ? patient.name.split(' ')[0] : 'Participant';
  const isProfileIncomplete = !patient || !patient.dob || !patient.gender;

  const recommendedTrials = patient ? getTrialsForPatient(patient.patient_id) : [];
  const topRecommendations = recommendedTrials.filter(t => t.eligible).slice(0, 3);

  const myEnrollments = patient ? enrollments.filter(e => e.patient_id === patient.patient_id) : [];
  const pendingInvites = myEnrollments.filter(e => e.status === 'INVITED');
  const activeEnrolled = myEnrollments.find(e => e.status === 'ENROLLED');

  const latestVitals = patient && patient.vitals && patient.vitals.length > 0 ? patient.vitals[0] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Warm Hero Welcome Banner */}
      <div className="patient-hero-banner">
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.2)', padding: '0.15rem 0.6rem', borderRadius: 9999, fontWeight: 700 }}>
              PATIENT HEALTH PORTAL
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', color: '#ffffff', fontWeight: 800 }}>
            Welcome, {patientName} 👋
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '0.96rem', marginTop: '0.5rem', lineHeight: 1.6 }}>
            {isProfileIncomplete
              ? 'Your account has been created. Complete your clinical profile below so our automated protocol matching engine can identify trials matching your health requirements.'
              : recommendedTrials.filter(t => t.eligible).length > 0 
                ? `You currently have ${recommendedTrials.filter(t => t.eligible).length} clinical trials that match your clinical criteria. Participating gives you access to next-generation therapeutic therapies.`
                : 'Welcome to your private clinical participant portal. Connect your health profile to discover open trials matching your eligibility.'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            {isProfileIncomplete ? (
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (onOpenOnboarding) onOpenOnboarding();
                  else setActiveTab('profile');
                }}
                style={{ background: '#ffffff', color: '#0369a1', fontWeight: 700, boxShadow: 'var(--shadow-md)' }}
              >
                <FileText size={16} />
                <span>Complete Health Profile Now</span>
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setActiveTab('recommended')}
                style={{ background: '#ffffff', color: '#0369a1', boxShadow: 'var(--shadow-md)' }}
              >
                <Sparkles size={16} />
                <span>View Recommended Trials</span>
              </button>
            )}

            {pendingInvites.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => setActiveTab('invitations')}
                style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.3)' }}
              >
                <Mail size={16} />
                <span>Review {pendingInvites.length} Invitation{pendingInvites.length > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Onboarding Callout Banner for Incomplete Profiles */}
      {isProfileIncomplete && (
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1.5px solid #93c5fd',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e3a8a' }}>
                Finish Your Clinical Health Setup
              </div>
              <div style={{ fontSize: '0.84rem', color: '#3b82f6', marginTop: 2 }}>
                Provide your basic demographics and biomarkers to enable instant AI protocol matching and investigator invitations.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenOnboarding) onOpenOnboarding();
              else setActiveTab('profile');
            }}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.65rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
            }}
          >
            <span>Set Up Profile</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Quick Summary Cards */}
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
        {/* Recommended Card */}
        <div className="card card-hoverable" onClick={() => setActiveTab('recommended')} style={{ cursor: 'pointer', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>Matched Studies</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                {recommendedTrials.filter(t => t.eligible).length} Trials
              </div>
            </div>
          </div>
        </div>

        {/* Invitations Card */}
        <div className="card card-hoverable" onClick={() => setActiveTab('invitations')} style={{ cursor: 'pointer', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>Invitations</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                {pendingInvites.length} Pending
              </div>
            </div>
          </div>
        </div>

        {/* Enrollment Card */}
        <div className="card card-hoverable" onClick={() => setActiveTab('enrollment')} style={{ cursor: 'pointer', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>Study Status</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#065f46' }}>
                {activeEnrolled ? 'Active in Study' : 'Not Enrolled'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Recommended Studies */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--slate-900)' }}>
              Recommended Clinical Studies
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
              Studies matching your current health records and profile.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('recommended')}>
            View All ({recommendedTrials.length}) <ArrowRight size={14} />
          </button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {topRecommendations.length > 0 ? (
            topRecommendations.map((t) => (
              <div
                key={t.trial_id}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  flexWrap: 'wrap',
                  background: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', maxWidth: 700 }}>
                  <MatchScoreBadge score={t.match_percentage} isRadial={true} size={64} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '1.05rem', color: 'var(--slate-900)' }}>
                        {t.trial_name}
                      </h4>
                      <StatusBadge status={t.verdict} size="sm" />
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--slate-600)', marginTop: 4 }}>
                      {t.description}
                    </p>
                    
                    {/* Friendly reasons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.6rem', fontSize: '0.78rem', color: '#065f46', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={13} color="#059669" /> Matches age & conditions
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={13} color="#059669" /> Recruiting in your area
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (onSelectTrial) onSelectTrial(t.trial_id);
                    setActiveTab('trial-detail');
                  }}
                >
                  <span>View Study Guide</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--slate-500)', fontSize: '0.88rem' }}>
              {isProfileIncomplete
                ? 'Complete your clinical profile to discover matching clinical studies.'
                : 'No matched clinical studies right now. As new study protocols are registered by clinical researchers, eligible recommendations will be highlighted here.'}
            </div>
          )}
        </div>
      </div>

      {/* Health Snapshot */}
      {latestVitals && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                Your Latest Health Biomarkers Snapshot
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                Recorded on {formatDate(latestVitals.recorded_at)}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('profile')}>
              Update Profile <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>Blood Pressure</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: 4 }}>
                {latestVitals.bp_systolic}/{latestVitals.bp_diastolic}
              </div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>HbA1c</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: 4 }}>
                {latestVitals.hba1c}%
              </div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>Body Mass Index</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: 4 }}>
                {latestVitals.bmi}
              </div>
            </div>
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>Blood Glucose</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: 4 }}>
                {latestVitals.blood_glucose} mg/dL
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
