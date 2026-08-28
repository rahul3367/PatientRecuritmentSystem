import React from 'react';
import { UserCheck, Clock, Users, ArrowRight, UserMinus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatters';

export function EnrollmentHubPage({ onSelectTrial }) {
  const { enrollments, waitlists, patients, trials } = useApp();

  const enrolledCount = enrollments.filter(e => e.status === 'ENROLLED').length;
  const invitedCount = enrollments.filter(e => e.status === 'INVITED').length;
  const acceptedCount = enrollments.filter(e => e.status === 'ACCEPTED').length;
  const waitlistCount = waitlists.filter(w => w.status === 'WAITING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
          Enrollment & Waitlist Operations Hub
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
          Cross-study participant lifecycle management, stage transitions, and ranked waitlists.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        <div className="stat-card">
          <span className="stat-card-label">Active Enrolled</span>
          <span className="stat-card-value" style={{ color: '#059669' }}>{enrolledCount}</span>
          <span className="stat-card-sub">Active in clinical protocols</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Invitations Pending</span>
          <span className="stat-card-value" style={{ color: '#0284c7' }}>{invitedCount}</span>
          <span className="stat-card-sub">Dispatched to candidates</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Accepted Invites</span>
          <span className="stat-card-value" style={{ color: '#10b981' }}>{acceptedCount}</span>
          <span className="stat-card-sub">Awaiting enrollment confirmation</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Ranked Waitlist</span>
          <span className="stat-card-value" style={{ color: '#d97706' }}>{waitlistCount}</span>
          <span className="stat-card-sub">Auto-promoted on drop</span>
        </div>
      </div>

      {/* Cross-Study Enrollment Master Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
            All Active Study Enrollments ({enrollments.length})
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Enrollment #</th>
                <th>Patient</th>
                <th>Trial Study</th>
                <th>Current Status</th>
                <th>Invited Date</th>
                <th>Enrolled Date</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => {
                const pat = patients.find(p => p.patient_id === e.patient_id);
                const trial = trials.find(t => t.trial_id === e.trial_id);

                return (
                  <tr key={e.enrollment_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0284c7' }}>
                      #{e.enrollment_id}
                    </td>
                    <td>
                      <strong>{pat?.name || e.patient_id}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>{e.patient_id}</div>
                    </td>
                    <td>
                      <strong>{trial?.trial_name || e.trial_id}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>{e.trial_id}</div>
                    </td>
                    <td>
                      <StatusBadge status={e.status} size="sm" />
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                      {formatDate(e.invited_at)}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                      {formatDate(e.enrolled_at)}
                    </td>
                  </tr>
                );
              })}
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--slate-500)' }}>
                    No clinical study enrollments recorded yet. Invite approved candidates from your study workspace to initiate participation workflows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
