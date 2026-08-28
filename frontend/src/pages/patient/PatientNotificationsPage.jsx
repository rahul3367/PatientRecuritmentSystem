import React, { useState } from 'react';
import { Bell, Mail, CheckCircle2, XCircle, Inbox, FileCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';
import { DynamicEligibilityModal } from '../../components/patient/DynamicEligibilityModal';

export function PatientNotificationsPage({ setActiveTab }) {
  const { notifications, currentPatientId, respondNotification, trials } = useApp();
  const [selectedTrialForCheck, setSelectedTrialForCheck] = useState(null);

  // Filter for current patient, only include notifications for real trials in database, and sort descending (latest first)
  const myNotifications = notifications
    .filter(n => n.patient_id === currentPatientId)
    .filter(n => {
      if (!n.trial_id) return false;
      if (trials && trials.length > 0) {
        return trials.some(t => t.trial_id === n.trial_id);
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = a.sent_at ? new Date(a.sent_at).getTime() : 0;
      const timeB = b.sent_at ? new Date(b.sent_at).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (Number(b.notification_id) || 0) - (Number(a.notification_id) || 0);
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
          Communication & Notifications Inbox
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
          Direct messages, study invitations, and screening alerts from clinical trial research teams.
        </p>
      </div>

      {myNotifications.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {myNotifications.map((notif) => {
            const trial = trials.find(t => t.trial_id === notif.trial_id);
            const isUnanswered = notif.response === 'NONE';

            return (
              <div
                key={notif.notification_id}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  borderLeft: `4px solid ${notif.response === 'ACCEPTED' ? '#059669' : notif.response === 'DECLINED' ? '#e11d48' : '#0284c7'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--slate-900)' }}>
                      {trial?.trial_name || notif.trial_name || notif.trial_id}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-subtle)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                      via {notif.channel}
                    </span>
                    {notif.sent_at && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>
                        {formatDate(notif.sent_at)}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: notif.response === 'ACCEPTED' ? '#059669' : notif.response === 'DECLINED' ? '#e11d48' : '#d97706'
                    }}
                  >
                    {notif.response === 'NONE' ? 'Response Pending' : `Responded: ${notif.response}`}
                  </span>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--slate-700)', lineHeight: 1.5 }}>
                  {notif.message}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {notif.trial_id && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const targetTrial = trial || { trial_id: notif.trial_id, trial_name: notif.trial_id };
                        setSelectedTrialForCheck(targetTrial);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <FileCheck size={14} />
                      <span>Check Eligibility</span>
                    </button>
                  )}

                  {isUnanswered && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => respondNotification(notif.notification_id, 'DECLINED')}
                      >
                        <XCircle size={14} />
                        <span>Decline</span>
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => respondNotification(notif.notification_id, 'ACCEPTED')}
                      >
                        <CheckCircle2 size={14} />
                        <span>Accept Invitation</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--bg-subtle)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)' }}>
            <Inbox size={26} />
          </div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-800)' }}>No Notifications Yet</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', marginTop: 4 }}>
            You have no incoming messages or study alerts at this time.
          </p>
        </div>
      )}

      {selectedTrialForCheck && (
        <DynamicEligibilityModal
          trial={selectedTrialForCheck}
          isOpen={!!selectedTrialForCheck}
          onClose={() => setSelectedTrialForCheck(null)}
          onNavigateToEnrollment={() => {
            setSelectedTrialForCheck(null);
            if (setActiveTab) setActiveTab('enrollment');
          }}
        />
      )}
    </div>
  );
}
