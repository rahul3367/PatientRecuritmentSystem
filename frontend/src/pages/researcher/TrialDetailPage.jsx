import React, { useState } from 'react';
import {
  FlaskConical,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  FileText,
  Clock,
  ShieldCheck,
  Send,
  Plus,
  Search,
  Download,
  ClipboardCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  UserCheck,
  UserMinus,
  MessageSquare
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MatchScoreBadge } from '../../components/common/MatchScoreBadge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { CriteriaBadge } from '../../components/common/CriteriaBadge';
import { MatchAnalysisModal } from '../../components/matching/MatchAnalysisModal';
import { OverrideVerdictModal } from '../../components/matching/OverrideVerdictModal';
import { Modal } from '../../components/common/Modal';
import { exportApi } from '../../services/api';
import { formatDate, formatDateTime, formatPercent } from '../../utils/formatters';

export function TrialDetailPage({ setActiveTab }) {
  const {
    trials,
    selectedTrialId,
    updateTrial,
    patients,
    screenings,
    verifications,
    enrollments,
    waitlists,
    notifications,
    performOfficialScreening,
    verifyScreening,
    invitePatient,
    acceptInvite,
    declineInvite,
    enrollPatient,
    dropPatient,
    sendNotification,
    getCandidatesForTrial,
    getDashboardStats,
    showToast
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState('overview'); // overview, eligibility, candidates, screening, enrollment, waitlist, notifications, reports
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedScreeningIdForOverride, setSelectedScreeningIdForOverride] = useState(null);

  // Filter states for candidate pool
  const [candidateSearch, setCandidateSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');

  // New Notification Modal
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifPatientId, setNotifPatientId] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifChannel, setNotifChannel] = useState('PORTAL');

  // Drop Patient with Reason Modal
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [dropPatientId, setDropPatientId] = useState('');
  const [dropReason, setDropReason] = useState('');

  const trial = trials.find(t => t.trial_id === selectedTrialId) || trials[0];

  if (!trial) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div
          className="card"
          style={{
            padding: '3.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <FlaskConical size={36} color="var(--slate-400)" />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--slate-800)', fontWeight: 700 }}>
            No Clinical Trial Selected
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', maxWidth: 460 }}>
            Please select an existing trial from your portfolio or create a new study protocol to view its operational workspace.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setActiveTab('trials-list')}>
              View Trials Portfolio
            </button>
            <button className="btn btn-primary" onClick={() => setActiveTab('create-trial')}>
              <Sparkles size={15} />
              <span>Create New Trial</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = getDashboardStats(trial.trial_id);
  const candidates = getCandidatesForTrial(trial.trial_id);

  // Filtered Candidates
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.patient_name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
                          c.patient_id.toLowerCase().includes(candidateSearch.toLowerCase());
    const matchesVerdict = verdictFilter === 'ALL' || c.verdict === verdictFilter;
    return matchesSearch && matchesVerdict;
  });

  // Trial Screenings
  const trialScreenings = screenings.filter(s => s.trial_id === trial.trial_id);
  
  // Trial Enrollments
  const trialEnrollments = enrollments.filter(e => e.trial_id === trial.trial_id);
  const invitedList = trialEnrollments.filter(e => e.status === 'INVITED');
  const acceptedList = trialEnrollments.filter(e => e.status === 'ACCEPTED');
  const enrolledList = trialEnrollments.filter(e => e.status === 'ENROLLED');
  const droppedList = trialEnrollments.filter(e => e.status === 'DROPPED' || e.status === 'DECLINED');

  // Trial Waitlist
  const trialWaitlist = waitlists.filter(w => w.trial_id === trial.trial_id).sort((a, b) => a.rank - b.rank);

  // Trial Notifications
  const trialNotifications = notifications
    .filter(n => n.trial_id === trial.trial_id)
    .sort((a, b) => {
      const timeA = a.sent_at ? new Date(a.sent_at).getTime() : 0;
      const timeB = b.sent_at ? new Date(b.sent_at).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (Number(b.notification_id) || 0) - (Number(a.notification_id) || 0);
    });

  const handleSendCustomNotification = (e) => {
    e.preventDefault();
    if (!notifPatientId || !notifMessage.trim()) return;

    sendNotification({
      patient_id: notifPatientId,
      trial_id: trial.trial_id,
      message: notifMessage.trim(),
      channel: notifChannel
    });

    showToast('Notification Dispatched', `Message sent to ${notifPatientId} via ${notifChannel}.`, 'success');
    setIsNotifModalOpen(false);
    setNotifMessage('');
  };

  const handleConfirmDrop = (e) => {
    e.preventDefault();
    if (!dropPatientId) return;

    dropPatient(trial.trial_id, dropPatientId, dropReason || 'Clinical withdrawal / protocol deviation');
    setIsDropModalOpen(false);
    setDropReason('');
  };

  const subTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'eligibility', label: `Eligibility (${trial.criteria?.length || 0})` },
    { id: 'candidates', label: `Candidates (${candidates.length})` },
    { id: 'screening', label: `Screening (${trialScreenings.length})` },
    { id: 'enrollment', label: `Enrollment (${trialEnrollments.length})` },
    { id: 'waitlist', label: `Waitlist (${trialWaitlist.length})` },
    { id: 'notifications', label: `Notifications (${trialNotifications.length})` },
    { id: 'reports', label: 'Reports & Exports' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Trial Header Banner */}
      <div
        className="card"
        style={{
          padding: '1.5rem 1.75rem',
          borderLeft: '5px solid #0284c7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ maxWidth: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#0284c7', fontSize: '0.9rem' }}>
              {trial.trial_id}
            </span>
            <StatusBadge status={trial.status} size="sm" />
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
              Source: <strong>{trial.source_type}</strong>
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            {trial.trial_name}
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', marginTop: 4 }}>
            {trial.description}
          </p>
        </div>

        {/* Quick Recruitment Metric Badge */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1.25rem',
            textAlign: 'right',
            minWidth: 200
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 700 }}>
            Target Recruitment
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--slate-900)' }}>
            {stats.enrolled} / {trial.target_recruitment}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700 }}>
            {stats.progress}% Filled
          </div>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="card" style={{ padding: 0 }}>
        <div className="tabs-nav">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            <div className="stat-card">
              <span className="stat-card-label">Screened Cohort</span>
              <span className="stat-card-value">{stats.screened}</span>
              <span className="stat-card-sub">Evaluated against criteria</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Approved</span>
              <span className="stat-card-value" style={{ color: '#059669' }}>{stats.approved}</span>
              <span className="stat-card-sub">≥90% match without fails</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Needs Review</span>
              <span className="stat-card-value" style={{ color: '#d97706' }}>{stats.needs_review}</span>
              <span className="stat-card-sub">Qualified with soft gaps</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Enrolled</span>
              <span className="stat-card-value" style={{ color: '#0284c7' }}>{stats.enrolled}</span>
              <span className="stat-card-sub">{stats.progress}% of target {trial.target_recruitment}</span>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1.05rem', color: 'var(--slate-900)' }}>Study Fast-Actions</h3>
              </div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={() => setActiveSubTab('candidates')}>
                  <Search size={16} />
                  <span>Discover Candidates</span>
                </button>
                <button className="btn btn-secondary" onClick={() => exportApi.exportCandidatesCsv(candidates, trial.trial_id)}>
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveSubTab('screening')}>
                  <ClipboardCheck size={16} />
                  <span>Screening Log</span>
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveSubTab('reports')}>
                  <FileText size={16} />
                  <span>Generate Report</span>
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1.05rem', color: 'var(--slate-900)' }}>Recruitment Rate</h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <ProgressBar current={stats.enrolled} target={trial.target_recruitment} showLabels={true} height={10} />
                <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginTop: 4 }}>
                  Target cohort is set to <strong>{trial.target_recruitment} subjects</strong>. 
                  Currently <strong>{stats.enrolled} patients</strong> are confirmed and enrolled.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ELIGIBILITY CRITERIA */}
      {activeSubTab === 'eligibility' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                  Configured Eligibility Criteria Rules ({trial.criteria?.length || 0})
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                  Strict HARD gates enforce instantaneous disqualification; SOFT preferences score affinity using continuous Gaussian models.
                </p>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(trial.criteria || []).map((crit, idx) => (
                <CriteriaBadge key={idx} criterion={crit} editable={false} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CANDIDATE POOL */}
      {activeSubTab === 'candidates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filters Bar */}
          <div
            className="card"
            style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 260 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.45rem 0.85rem',
                  width: '100%',
                  maxWidth: 320
                }}
              >
                <Search size={16} color="var(--slate-400)" />
                <input
                  type="text"
                  placeholder="Filter candidates..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.86rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {['ALL', 'APPROVED', 'NEEDS_REVIEW', 'REJECTED'].map((v) => (
                  <button
                    key={v}
                    className={`btn btn-sm ${verdictFilter === v ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setVerdictFilter(v)}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportApi.exportCandidatesCsv(candidates, trial.trial_id)}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Candidates Pipeline Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredCandidates.map((c) => (
              <div
                key={c.patient_id}
                className="card card-hoverable"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <MatchScoreBadge score={c.match_percentage} isRadial={true} size={64} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--slate-900)' }}>
                        {c.patient_name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                        ({c.patient_id})
                      </span>
                      <StatusBadge status={c.verdict} size="sm" />
                      {c.enrollment_status && (
                        <StatusBadge status={c.enrollment_status} size="sm" />
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: 3 }}>
                      {c.gender} • DOB: {c.dob} • Location: {c.location}
                    </div>

                    {c.gaps && c.gaps.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 4, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <AlertTriangle size={12} color="#d97706" />
                        <span>Review gap: {c.gaps[0]}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedCandidate(c)}
                  >
                    Analyze Match
                  </button>

                  {!c.screening_id && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => performOfficialScreening(c.patient_id, trial.trial_id)}
                      title="Officially screen patient"
                    >
                      <ClipboardCheck size={14} />
                      <span>Screen</span>
                    </button>
                  )}

                  {c.verdict === 'APPROVED' && !c.enrollment_status && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => invitePatient(trial.trial_id, c.patient_id)}
                    >
                      <Send size={13} />
                      <span>Invite</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: OFFICIAL SCREENING */}
      {activeSubTab === 'screening' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                  Official Screenings Log ({trialScreenings.length})
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                  All persisted screening evaluations with clinician verification and override audit status.
                </p>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Screening #</th>
                    <th>Patient</th>
                    <th>Score</th>
                    <th>AI Verdict</th>
                    <th>Clinician Verification</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trialScreenings.map((s) => {
                    const verification = verifications.find(v => v.screening_id === s.screening_id);
                    const patient = patients.find(p => p.patient_id === s.patient_id);

                    return (
                      <tr key={s.screening_id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0284c7' }}>
                          #{s.screening_id}
                        </td>
                        <td>
                          <strong>{patient?.name || s.patient_id}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>{s.patient_id}</div>
                        </td>
                        <td>
                          <MatchScoreBadge score={s.match_percentage} />
                        </td>
                        <td>
                          <StatusBadge status={s.verdict} size="sm" />
                        </td>
                        <td>
                          {verification ? (
                            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <CheckCircle2 size={14} />
                              <span>Verified by {verification.verified_by}</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Clock size={14} />
                              <span>Pending Review</span>
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                          {formatDateTime(s.screened_at)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {!verification && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => verifyScreening(s.screening_id)}
                              >
                                Verify
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedScreeningIdForOverride(s.screening_id)}
                            >
                              Override
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ENROLLMENT STAGE PIPELINE */}
      {activeSubTab === 'enrollment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {/* Column 1: INVITED */}
            <div className="card" style={{ background: '#f8fafc' }}>
              <div className="card-header" style={{ padding: '0.85rem 1rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0284c7' }}>
                  Invited ({invitedList.length})
                </span>
              </div>
              <div className="card-body" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 280 }}>
                {invitedList.map(enr => {
                  const pat = patients.find(p => p.patient_id === enr.patient_id);
                  return (
                    <div key={enr.enrollment_id} style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{pat?.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>ID: {enr.patient_id}</div>
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
                        <button className="btn btn-success btn-sm" onClick={() => acceptInvite(trial.trial_id, enr.patient_id)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
                          Accept
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => declineInvite(trial.trial_id, enr.patient_id, 'Declined by study team')} style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: ACCEPTED */}
            <div className="card" style={{ background: '#f8fafc' }}>
              <div className="card-header" style={{ padding: '0.85rem 1rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#059669' }}>
                  Accepted ({acceptedList.length})
                </span>
              </div>
              <div className="card-body" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 280 }}>
                {acceptedList.map(enr => {
                  const pat = patients.find(p => p.patient_id === enr.patient_id);
                  return (
                    <div key={enr.enrollment_id} style={{ background: '#ffffff', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{pat?.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>ID: {enr.patient_id}</div>
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => enrollPatient(trial.trial_id, enr.patient_id)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', width: '100%' }}>
                          Confirm Enrollment
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 3: ENROLLED */}
            <div className="card" style={{ background: '#f8fafc' }}>
              <div className="card-header" style={{ padding: '0.85rem 1rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#065f46' }}>
                  Enrolled ({enrolledList.length})
                </span>
              </div>
              <div className="card-body" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 280 }}>
                {enrolledList.map(enr => {
                  const pat = patients.find(p => p.patient_id === enr.patient_id);
                  return (
                    <div key={enr.enrollment_id} style={{ background: '#ffffff', border: '1px solid #6ee7b7', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#065f46' }}>{pat?.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>Enrolled: {formatDate(enr.enrolled_at)}</div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setDropPatientId(enr.patient_id);
                            setIsDropModalOpen(true);
                          }}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: 'var(--danger-solid)', width: '100%' }}
                        >
                          Withdraw / Drop
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 4: DROPPED / DECLINED */}
            <div className="card" style={{ background: '#f8fafc' }}>
              <div className="card-header" style={{ padding: '0.85rem 1rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#991b1b' }}>
                  Dropped ({droppedList.length})
                </span>
              </div>
              <div className="card-body" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 280 }}>
                {droppedList.map(enr => {
                  const pat = patients.find(p => p.patient_id === enr.patient_id);
                  return (
                    <div key={enr.enrollment_id} style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '0.75rem', opacity: 0.85 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#991b1b' }}>{pat?.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>Status: {enr.status}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: WAITLIST */}
      {activeSubTab === 'waitlist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                  Ranked Study Waitlist ({trialWaitlist.length})
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                  Automatic FIFO + Score prioritization. When an active participant drops, Rank #1 is automatically promoted.
                </p>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Patient</th>
                    <th>Match Percentage</th>
                    <th>Status</th>
                    <th>Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  {trialWaitlist.length > 0 ? (
                    trialWaitlist.map((w) => {
                      const pat = patients.find(p => p.patient_id === w.patient_id);
                      return (
                        <tr key={w.waitlist_id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: '#0284c7' }}>
                            #{w.rank}
                          </td>
                          <td>
                            <strong>{pat?.name || w.patient_id}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>{w.patient_id}</div>
                          </td>
                          <td>
                            <MatchScoreBadge score={w.match_percentage} />
                          </td>
                          <td>
                            <StatusBadge status={w.status} size="sm" />
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                            {formatDate(w.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                        No candidates currently on the waitlist for this trial.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: NOTIFICATIONS */}
      {activeSubTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                  Trial Communications Hub ({trialNotifications.length})
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                  Delivery status and candidate response tracking.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setIsNotifModalOpen(true)}>
                <Send size={14} />
                <span>Send Communication</span>
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Message</th>
                    <th>Channel</th>
                    <th>Delivery Status</th>
                    <th>Patient Response</th>
                  </tr>
                </thead>
                <tbody>
                  {trialNotifications.map((n) => {
                    const pat = patients.find(p => p.patient_id === n.patient_id);
                    return (
                      <tr key={n.notification_id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          #{n.notification_id}
                        </td>
                        <td>
                          <strong>{pat?.name || n.patient_id}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>{n.patient_id}</div>
                        </td>
                        <td style={{ maxWidth: 300, fontSize: '0.82rem' }}>
                          {n.message}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-subtle)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                            {n.channel}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: n.delivery_status === 'SENT' ? '#059669' : '#d97706', fontWeight: 600, fontSize: '0.8rem' }}>
                            {n.delivery_status}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: n.response === 'ACCEPTED' ? '#059669' : n.response === 'DECLINED' ? '#e11d48' : '#64748b', fontWeight: 700, fontSize: '0.8rem' }}>
                            {n.response}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: REPORTS & EXPORTS */}
      {activeSubTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Candidate CSV Export */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileSpreadsheet size={20} color="#059669" />
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                    Candidate Recruitment CSV
                  </h3>
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)' }}>
                  Export full candidate roster with match percentages, screening results, contact info, and current enrollment statuses.
                </p>
                <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--slate-600)' }}>
                  Includes {candidates.length} candidates evaluated against {trial.trial_id}.
                </div>
                <button
                  className="btn btn-success"
                  onClick={() => exportApi.exportCandidatesCsv(candidates, trial.trial_id)}
                >
                  <Download size={16} />
                  <span>Download candidates_{trial.trial_id}.csv</span>
                </button>
              </div>
            </div>

            {/* Trial PDF Report */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} color="#0284c7" />
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                    Trial Executive PDF Report
                  </h3>
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)' }}>
                  Generate an institutional PDF summary featuring target progression, funnel conversion metrics, and top exclusion reasons.
                </p>
                <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--slate-600)' }}>
                  Generated with ReportLab standard letter formatting.
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    showToast('PDF Generated', `Executive report for ${trial.trial_id} created.`, 'success');
                  }}
                >
                  <Download size={16} />
                  <span>Download report_{trial.trial_id}.pdf</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Deep Dive Modal */}
      {selectedCandidate && (
        <MatchAnalysisModal
          isOpen={Boolean(selectedCandidate)}
          onClose={() => setSelectedCandidate(null)}
          candidate={selectedCandidate}
          trial={trial}
          onScreen={performOfficialScreening}
          onVerify={verifyScreening}
          onOverride={(screeningId) => {
            setSelectedCandidate(null);
            setSelectedScreeningIdForOverride(screeningId);
          }}
          onInvite={invitePatient}
        />
      )}

      {/* Override Modal */}
      {selectedScreeningIdForOverride && (
        <OverrideVerdictModal
          isOpen={Boolean(selectedScreeningIdForOverride)}
          onClose={() => setSelectedScreeningIdForOverride(null)}
          screeningId={selectedScreeningIdForOverride}
        />
      )}

      {/* Send Notification Modal */}
      {isNotifModalOpen && (
        <Modal
          isOpen={isNotifModalOpen}
          onClose={() => setIsNotifModalOpen(false)}
          title="Dispatch Trial Notification"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
              <button className="btn btn-secondary" onClick={() => setIsNotifModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSendCustomNotification}>Send</button>
            </div>
          }
        >
          <form onSubmit={handleSendCustomNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label form-label-req">Select Candidate</label>
              <select className="form-select" value={notifPatientId} onChange={(e) => setNotifPatientId(e.target.value)} required>
                <option value="">-- Select Patient --</option>
                {patients.map(p => (
                  <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Channel</label>
              <select className="form-select" value={notifChannel} onChange={(e) => setNotifChannel(e.target.value)}>
                <option value="PORTAL">Patient Portal Notification</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS Text Message</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label form-label-req">Message Body</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="Type communication message..."
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Drop Patient Modal */}
      {isDropModalOpen && (
        <Modal
          isOpen={isDropModalOpen}
          onClose={() => setIsDropModalOpen(false)}
          title="Withdraw / Drop Enrolled Patient"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
              <button className="btn btn-secondary" onClick={() => setIsDropModalOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmDrop}>Confirm Drop & Auto-Promote Waitlist</button>
            </div>
          }
        >
          <form onSubmit={handleConfirmDrop} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)' }}>
              Dropping patient <strong>{dropPatientId}</strong> will clear their active trial assignment and immediately auto-promote the top candidate from the waitlist into active enrollment.
            </p>
            <div className="form-group">
              <label className="form-label form-label-req">Reason for Discontinuation</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="e.g. Adverse event, lost to follow-up, consent withdrawn, protocol violation..."
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
