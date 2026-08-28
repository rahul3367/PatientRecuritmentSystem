import React, { useState } from 'react';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MatchScoreBadge } from '../../components/common/MatchScoreBadge';
import { OverrideVerdictModal } from '../../components/matching/OverrideVerdictModal';
import { formatDateTime } from '../../utils/formatters';

export function ScreeningLogPage() {
  const { screenings, verifications, patients, trials, verifyScreening } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [selectedScreeningIdForOverride, setSelectedScreeningIdForOverride] = useState(null);

  const filteredScreenings = screenings.filter(s => {
    const pat = patients.find(p => p.patient_id === s.patient_id);
    const patName = pat?.name || s.patient_id;
    const matchesSearch = patName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.trial_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVerdict = verdictFilter === 'ALL' || s.verdict === verdictFilter;
    return matchesSearch && matchesVerdict;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
          Official Screenings & Clinician Verification
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
          Immutable records of patient eligibility evaluations with human-in-the-loop verification and verdict override logs.
        </p>
      </div>

      {/* Filter Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 260, maxWidth: 360, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.45rem 0.85rem' }}>
          <Search size={16} color="var(--slate-400)" />
          <input
            type="text"
            placeholder="Search screenings by patient or study..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Screenings Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Screening #</th>
                <th>Patient</th>
                <th>Trial</th>
                <th>Score</th>
                <th>Verdict</th>
                <th>Verification State</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScreenings.map((s) => {
                const patient = patients.find(p => p.patient_id === s.patient_id);
                const trial = trials.find(t => t.trial_id === s.trial_id);
                const verification = verifications.find(v => v.screening_id === s.screening_id);

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
                      <strong>{trial?.trial_name || s.trial_id}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>{s.trial_id}</div>
                    </td>
                    <td>
                      <MatchScoreBadge score={s.match_percentage} />
                    </td>
                    <td>
                      <StatusBadge status={s.verdict} size="sm" />
                    </td>
                    <td>
                      {verification ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={13} />
                            <span>Verified by {verification.verified_by}</span>
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>
                            {verification.remarks}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={13} />
                          <span>Pending Clinician Sign-off</span>
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                      {formatDateTime(s.screened_at)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
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
              {filteredScreenings.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--slate-500)' }}>
                    No official screening evaluations recorded yet. Run screenings from the candidate discovery pool to generate verification logs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
