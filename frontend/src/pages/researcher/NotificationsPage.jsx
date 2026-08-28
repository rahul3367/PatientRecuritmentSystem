import React, { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle2, Clock, XCircle, Mail, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../components/common/Modal';

export function NotificationsPage() {
  const { notifications, patients, trials, sendNotification, showToast, refreshPatients } = useApp();

  useEffect(() => {
    if (refreshPatients) {
      refreshPatients();
    }
  }, []);

  const sortedNotifications = [...notifications].sort((a, b) => {
    const timeA = a.sent_at ? new Date(a.sent_at).getTime() : 0;
    const timeB = b.sent_at ? new Date(b.sent_at).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    return (Number(b.notification_id) || 0) - (Number(a.notification_id) || 0);
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [trialId, setTrialId] = useState('T001');
  const [channel, setChannel] = useState('PORTAL');
  const [message, setMessage] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!patientId || !message.trim()) return;

    sendNotification({
      patient_id: patientId,
      trial_id: trialId,
      message: message.trim(),
      channel
    });

    showToast('Notification Dispatched', `Message sent to ${patientId} via ${channel}.`, 'success');
    setIsModalOpen(false);
    setMessage('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            Communications & Notification Center
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Monitor delivery status (`SENT`, `FAILED`, `PENDING`) and patient responses (`ACCEPTED`, `DECLINED`, `NONE`).
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Send size={16} />
          <span>Dispatch Notification</span>
        </button>
      </div>

      {/* Communications Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Candidate / Patient</th>
                <th>Study Target</th>
                <th>Message Content</th>
                <th>Channel</th>
                <th>Delivery Status</th>
                <th>Patient Response</th>
              </tr>
            </thead>
            <tbody>
              {sortedNotifications.map((n) => {
                const pat = patients.find(p => p.patient_id === n.patient_id);
                const trial = trials.find(t => t.trial_id === n.trial_id);

                return (
                  <tr key={n.notification_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#0284c7', fontWeight: 700 }}>
                      #{n.notification_id}
                    </td>
                    <td>
                      <strong>{pat?.name || n.patient_id}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>{n.patient_id}</div>
                    </td>
                    <td>
                      <strong>{trial?.trial_id}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>{trial?.trial_name}</div>
                    </td>
                    <td style={{ maxWidth: 320, fontSize: '0.84rem', color: 'var(--slate-700)' }}>
                      {n.message}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--bg-subtle)', padding: '0.2rem 0.55rem', borderRadius: 4 }}>
                        {n.channel}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: n.delivery_status === 'SENT' ? '#059669' : '#d97706'
                        }}
                      >
                        {n.delivery_status}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: n.response === 'ACCEPTED' ? '#059669' : n.response === 'DECLINED' ? '#e11d48' : '#64748b'
                        }}
                      >
                        {n.response}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sortedNotifications.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--slate-500)' }}>
                    No communications or alerts recorded yet. Click Dispatch Notification to send study alerts to candidates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Send Candidate Communication"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSend}>Dispatch Message</button>
            </div>
          }
        >
          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label form-label-req">Select Candidate</label>
                <select className="form-select" value={patientId} onChange={e => setPatientId(e.target.value)} required>
                  <option value="">-- Select Patient --</option>
                  {patients.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.patient_id})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label form-label-req">Target Trial</label>
                <select className="form-select" value={trialId} onChange={e => setTrialId(e.target.value)} required>
                  {trials.map(t => (
                    <option key={t.trial_id} value={t.trial_id}>{t.trial_id}: {t.trial_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Channel</label>
              <select className="form-select" value={channel} onChange={e => setChannel(e.target.value)}>
                <option value="PORTAL">Patient Portal Notification</option>
                <option value="EMAIL">Email Dispatch</option>
                <option value="SMS">SMS Text Alert</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label form-label-req">Message Body</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Enter official study invitation or follow-up inquiry..."
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
