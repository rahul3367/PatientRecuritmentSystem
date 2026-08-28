import React, { useEffect } from 'react';
import {
  UserCheck,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  Building,
  FileText,
  Clock,
  Inbox,
  Sparkles,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';

export function MyEnrollmentPage({ setActiveTab }) {
  const { patients, currentPatientId, enrollments, trials, waitlists, refreshEnrollments } = useApp();

  useEffect(() => {
    if (refreshEnrollments) {
      refreshEnrollments();
    }
  }, []);

  const patient = patients.find(p => p.patient_id === currentPatientId) || patients[0] || null;
  const pId = patient?.patient_id || currentPatientId;

  // Retrieve all enrollments and applications belonging to this patient
  const patientEnrollments = enrollments.filter(e => e.patient_id === pId);
  const patientWaitlists = (waitlists || []).filter(w => w.patient_id === pId && (w.status === 'WAITING' || w.status === 'PROMOTED'));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ENROLLED':
        return {
          label: 'ACTIVE ENROLLED PARTICIPANT',
          bg: '#ecfdf5',
          color: '#065f46',
          border: '#a7f3d0'
        };
      case 'ACCEPTED':
        return {
          label: 'INVITATION ACCEPTED / PENDING ONBOARDING',
          bg: '#f0f9ff',
          color: '#0369a1',
          border: '#bae6fd'
        };
      case 'INVITED':
        return {
          label: 'APPLICATION SUBMITTED (UNDER REVIEW)',
          bg: '#fef3c7',
          color: '#92400e',
          border: '#fde68a'
        };
      case 'DROPPED':
        return {
          label: 'STUDY CONCLUDED / DROPPED',
          bg: '#f1f5f9',
          color: '#475569',
          border: '#cbd5e1'
        };
      case 'DECLINED':
        return {
          label: 'DECLINED',
          bg: '#fef2f2',
          color: '#991b1b',
          border: '#fecaca'
        };
      default:
        return {
          label: status || 'SUBMITTED',
          bg: '#f1f5f9',
          color: '#475569',
          border: '#cbd5e1'
        };
    }
  };

  const getEnrollmentDate = (enr) => {
    const rawDate = enr.enrolled_at || enr.accepted_at || enr.invited_at || enr.created_at;
    if (!rawDate) return 'Recent';
    try {
      const d = new Date(rawDate);
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return formatDate(rawDate);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
          My Study Enrollments & Applications
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
          Track your active clinical trial journey, submitted applications, enrollment milestone dates, and study coordinator contacts.
        </p>
      </div>

      {patientWaitlists.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {patientWaitlists.map(w => {
            const trial = trials.find(t => t.trial_id === w.trial_id) || { trial_id: w.trial_id, trial_name: `Trial ${w.trial_id}` };
            const isWaiting = w.status === 'WAITING';
            return (
              <div
                key={w.waitlist_id}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderLeft: `5px solid ${isWaiting ? '#d97706' : '#059669'}`,
                  background: isWaiting ? '#fffbeb' : '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Clock size={24} color={isWaiting ? '#d97706' : '#059669'} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isWaiting ? '#92400e' : '#065f46' }}>
                      {isWaiting ? `Waitlisted for ${trial.trial_name} (Priority Position #${w.rank})` : `Promoted from Waitlist for ${trial.trial_name}!`}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: isWaiting ? '#b45309' : '#047857', marginTop: 2 }}>
                      {isWaiting 
                        ? 'You are on the priority cohort waitlist. If an enrolled participant withdraws, you will be automatically promoted.'
                        : 'A slot opened and your application has been automatically promoted into the study cohort.'}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  background: isWaiting ? '#fef3c7' : '#d1fae5',
                  color: isWaiting ? '#92400e' : '#065f46'
                }}>
                  {isWaiting ? `WAITLIST RANK #${w.rank}` : 'PROMOTED'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {patientEnrollments.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {patientEnrollments.map((enr, idx) => {
            const trial = trials.find(t => t.trial_id === enr.trial_id) || {
              trial_id: enr.trial_id,
              trial_name: `Study ${enr.trial_id}`,
              description: 'Clinical trial evaluation protocol.'
            };
            const badge = getStatusBadge(enr.status);
            const dateStr = getEnrollmentDate(enr);
            const isActive = enr.status === 'ENROLLED' || enr.status === 'ACCEPTED';

            return (
              <div
                key={enr.enrollment_id || `${enr.trial_id}-${idx}`}
                className="card"
                style={{
                  padding: '2rem',
                  borderLeft: `5px solid ${isActive ? '#059669' : enr.status === 'INVITED' ? '#f59e0b' : '#94a3b8'}`,
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: '#0284c7' }}>
                        {trial.trial_id}
                      </span>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.65rem',
                        borderRadius: '4px',
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        {badge.label}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.35rem', color: 'var(--slate-900)', margin: '0.25rem 0' }}>
                      {trial.trial_name}
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginTop: 4, maxWidth: '800px', lineHeight: 1.5 }}>
                      {trial.description}
                    </p>
                  </div>

                  <div style={{
                    textAlign: 'right',
                    fontSize: '0.85rem',
                    color: 'var(--slate-600)',
                    background: 'var(--bg-subtle)',
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--slate-400)', fontWeight: 700 }}>
                      {enr.status === 'ENROLLED' ? 'Enrolled Date' : 'Application Date'}
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--slate-800)', marginTop: 2, fontSize: '0.92rem' }}>
                      📅 {dateStr}
                    </div>
                  </div>
                </div>

                {/* Specific Section: Active Milestones for ENROLLED/ACCEPTED */}
                {isActive ? (
                  <>
                    <div style={{ background: 'var(--bg-subtle)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginTop: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '1.25rem' }}>
                        Study Milestones & Timeline
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', position: 'relative' }}>
                        {[
                          { step: '1', title: 'Application / Screening', date: dateStr, done: true },
                          { step: '2', title: 'Consent & Baseline', date: formatDate(enr.enrolled_at || enr.accepted_at || new Date().toISOString()), done: true },
                          { step: '3', title: 'Study Phase 1 Evaluation', date: 'Upcoming Visit', done: false },
                          { step: '4', title: 'Mid-Point Follow-up', date: 'Scheduled Follow-up', done: false }
                        ].map((m, mIdx) => (
                          <div key={mIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: '50%',
                                  background: m.done ? '#059669' : '#ffffff',
                                  color: m.done ? '#ffffff' : 'var(--slate-600)',
                                  border: `2px solid ${m.done ? '#059669' : 'var(--slate-300)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.75rem'
                                }}
                              >
                                {m.done ? <CheckCircle2 size={15} /> : m.step}
                              </div>
                              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: m.done ? '#065f46' : 'var(--slate-700)' }}>
                                {m.title}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', paddingLeft: '2rem' }}>
                              {m.date}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Coordinator Contact Card */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                      <div className="card" style={{ background: '#f8fafc', padding: '1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.95rem', marginBottom: '0.6rem' }}>
                          Study Coordinator & Team
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.84rem', color: 'var(--slate-600)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Phone size={15} color="#0284c7" />
                            <span>Clinical Hotline: +1 (555) 019-2831</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={15} color="#0284c7" />
                            <span>Support: trials-support@aegistrial.org</span>
                          </div>
                        </div>
                      </div>

                      <div className="card" style={{ background: '#f8fafc', padding: '1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.95rem', marginBottom: '0.6rem' }}>
                          Clinical Site Location
                        </div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)', lineHeight: 1.4 }}>
                          Boston Medical Research Center<br />
                          85 East Concord Street, Suite 400, Boston, MA 02118
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Section for INVITED / SUBMITTED Applications */
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={16} color="#d97706" />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-800)' }}>
                        Application Successfully Submitted
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                      Your eligibility screening for <strong>{trial.trial_name}</strong> was recorded on <strong>{dateStr}</strong>. The principal investigator and clinical research team are reviewing candidate slots and will contact you regarding next steps.
                    </p>
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
          <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-800)' }}>No Study Enrollments or Applications Found</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', marginTop: 4, maxWidth: 440, margin: '4px auto 1.25rem' }}>
            You have not yet applied or enrolled in any clinical trials. Check out your recommended studies to find matching opportunities.
          </p>
          <button className="btn btn-primary" onClick={() => setActiveTab('recommended')}>
            <Sparkles size={16} />
            <span>Explore Recommended Trials</span>
          </button>
        </div>
      )}
    </div>
  );
}
