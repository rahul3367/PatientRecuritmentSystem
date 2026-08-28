import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  FlaskConical,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  ClipboardCheck,
  FileSpreadsheet,
  Activity,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/common/StatCard';
import { ProgressBar } from '../../components/common/ProgressBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MatchScoreBadge } from '../../components/common/MatchScoreBadge';
import { MatchAnalysisModal } from '../../components/matching/MatchAnalysisModal';
import { OverrideVerdictModal } from '../../components/matching/OverrideVerdictModal';
import { formatDateTime } from '../../utils/formatters';

export function DashboardPage({ setActiveTab }) {
  const {
    trials,
    selectedTrialId,
    setSelectedTrialId,
    getDashboardStats,
    getCandidatesForTrial,
    performOfficialScreening,
    verifyScreening,
    invitePatient,
    auditLogs
  } = useApp();

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedScreeningIdForOverride, setSelectedScreeningIdForOverride] = useState(null);

  const currentTrial = trials.find(t => t.trial_id === selectedTrialId) || trials[0];

  if (!currentTrial) {
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
            gap: '1.25rem',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.03), rgba(2, 132, 199, 0.05))',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-xl)'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FlaskConical size={32} />
          </div>
          <div style={{ maxWidth: 480 }}>
            <h3 style={{ fontSize: '1.35rem', color: 'var(--slate-900)', fontWeight: 700 }}>
              No Clinical Trials in Your Portfolio Yet
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: 6 }}>
              You have not created or been assigned any clinical trials yet. Use the AI Protocol Extraction Wizard to upload your study protocol and launch automated candidate matching.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab('create-trial')}
            >
              <Sparkles size={16} />
              <span>Launch AI Trial Builder</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = getDashboardStats(currentTrial.trial_id);
  const candidates = getCandidatesForTrial(currentTrial.trial_id);

  const topCandidates = candidates.slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Hero Recruitment Progress Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: '#ffffff',
          padding: '1.75rem 2rem',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(2, 132, 199, 0.3)', color: '#38bdf8' }}>
                  ACTIVE PROTOCOL
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--slate-400)' }}>
                  Study ID: {currentTrial.trial_id}
                </span>
              </div>
              <h2 style={{ fontSize: '1.6rem', color: '#ffffff', fontWeight: 700 }}>
                {currentTrial.trial_name}
              </h2>
              <p style={{ color: 'var(--slate-300)', fontSize: '0.88rem', maxWidth: 720, marginTop: '0.35rem' }}>
                {currentTrial.description}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('candidates')}
                style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                Find Candidates
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('create-trial')}
              >
                <Sparkles size={14} />
                <span>New AI Trial</span>
              </button>
            </div>
          </div>

          {/* Enrolled vs Target Bar */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#ffffff' }}>
                  {stats.enrolled}
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--slate-400)' }}>
                  / {stats.target} enrolled
                </span>
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                {stats.progress}% Target Met
              </span>
            </div>
            <div className="progress-track" style={{ height: 10, background: 'rgba(255, 255, 255, 0.1)' }}>
              <div className="progress-fill" style={{ width: `${Math.min(100, stats.progress)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        <StatCard
          label="Total Screened"
          value={stats.screened}
          subtext="Unique patient evaluations"
          icon={Users}
          color="primary"
          onClick={() => setActiveTab('screening')}
        />
        <StatCard
          label="Approved Candidates"
          value={stats.approved}
          subtext="Passed all HARD gates (≥90%)"
          icon={CheckCircle2}
          color="success"
          onClick={() => setActiveTab('candidates')}
        />
        <StatCard
          label="Needs Review"
          value={stats.needs_review}
          subtext="Eligible with soft score gaps"
          icon={AlertTriangle}
          color="warning"
          onClick={() => setActiveTab('screening')}
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          subtext="Failed mandatory hard criteria"
          icon={XCircle}
          color="danger"
        />
      </div>

      {/* Main Insights Grid: Funnel & Exclusion Breakdown */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
        {/* Recruitment Funnel Visualization */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                Recruitment Funnel Pipeline
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                Conversion of patient pool through clinical milestones
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7', background: 'var(--primary-50)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
              Active Flow
            </span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { stage: 'Screened Candidate Pool', count: stats.screened, color: '#0284c7', width: '100%' },
              { stage: 'Clinically Approved (Verdict)', count: stats.approved + stats.needs_review, color: '#0ea5e9', width: `${stats.screened > 0 ? ((stats.approved + stats.needs_review) / stats.screened) * 100 : 80}%` },
              { stage: 'Invited to Study', count: stats.enrolled + 2, color: '#38bdf8', width: `${stats.screened > 0 ? ((stats.enrolled + 2) / stats.screened) * 100 : 50}%` },
              { stage: 'Accepted Invitation', count: stats.enrolled + 1, color: '#10b981', width: `${stats.screened > 0 ? ((stats.enrolled + 1) / stats.screened) * 100 : 35}%` },
              { stage: 'Officially Enrolled', count: stats.enrolled, color: '#059669', width: `${stats.screened > 0 ? (stats.enrolled / stats.screened) * 100 : 25}%` }
            ].map((step, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--slate-700)' }}>{step.stage}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--slate-900)' }}>{step.count} candidates</span>
                </div>
                <div style={{ width: '100%', height: 24, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', padding: 2 }}>
                  <div
                    style={{
                      height: '100%',
                      width: step.width,
                      background: step.color,
                      borderRadius: 'var(--radius-sm)',
                      transition: 'width 0.6s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Exclusion Reasons */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                Top Exclusion Reasons
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                Primary disqualifying criteria gates
              </p>
            </div>
          </div>
          <div className="card-body">
            {stats.top_exclusion_reasons.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {stats.top_exclusion_reasons.map((reason, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--slate-800)', textTransform: 'capitalize' }}>
                        {reason.reason.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontWeight: 700, color: '#e11d48' }}>
                        {reason.count} fails
                      </span>
                    </div>
                    <div className="progress-track" style={{ height: 6 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, (reason.count / (stats.rejected || 1)) * 100)}%`,
                          background: '#e11d48',
                          borderRadius: 9999
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--slate-500)', fontSize: '0.86rem' }}>
                No criteria exclusion data recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Candidate Spotlight & Recent Audit Timeline */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        {/* Top Ranked Candidates */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                Top Ranked Candidates
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                Highest matching prospective candidates for {currentTrial.trial_id}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('candidates')}>
              View All Candidate Pool <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topCandidates.map((c) => (
              <div
                key={c.patient_id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <MatchScoreBadge score={c.match_percentage} isRadial={true} size={54} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--slate-900)' }}>
                        {c.patient_name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)', fontFamily: 'var(--font-mono)' }}>
                        ({c.patient_id})
                      </span>
                      <StatusBadge status={c.verdict} size="sm" />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 2 }}>
                      {c.gender} • {c.location}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedCandidate(c)}
                  >
                    Analyze Match
                  </button>
                  {c.verdict === 'APPROVED' && !c.enrollment_status && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => invitePatient(currentTrial.trial_id, c.patient_id)}
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

        {/* Recent Activity & Audit Trail Stream */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                Recent Audit Trail
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                Institutional actions & verifications
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('audit')}>
              Full Log <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {auditLogs.slice(0, 4).map((log) => (
              <div
                key={log.audit_id}
                style={{
                  borderLeft: '3px solid #0284c7',
                  paddingLeft: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                  <strong style={{ color: '#0369a1' }}>{log.action}</strong>
                  <span style={{ color: 'var(--slate-400)' }}>{formatDateTime(log.timestamp)}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--slate-800)', fontWeight: 500 }}>
                  {log.reason || `Action executed on ${log.entity_type} (${log.entity_id})`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                  By: <strong>{log.user_id}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Match Deep Dive Modal */}
      {selectedCandidate && (
        <MatchAnalysisModal
          isOpen={Boolean(selectedCandidate)}
          onClose={() => setSelectedCandidate(null)}
          candidate={selectedCandidate}
          trial={currentTrial}
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
    </div>
  );
}
