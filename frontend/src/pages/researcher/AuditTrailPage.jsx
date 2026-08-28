import React, { useState } from 'react';
import { History, Search, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateTime } from '../../utils/formatters';

export function AuditTrailPage() {
  const { auditLogs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.reason && log.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
          Institutional Activity & Audit Log
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
          Immutable log of all clinician overrides, criteria revisions, and enrollment stage transitions.
        </p>
      </div>

      {/* Search Filter */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Search size={18} color="var(--slate-400)" />
        <input
          type="text"
          placeholder="Filter audit entries by action, clinician, or reason..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.88rem' }}
        />
      </div>

      {/* Audit Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Action</th>
                <th>Performed By</th>
                <th>Entity Target</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Clinical Reason / Remarks</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.audit_id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#0284c7', fontWeight: 700 }}>
                    #{log.audit_id}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: log.action.includes('OVERRIDE') ? '#fff1f2' : log.action.includes('VERIFY') ? '#ecfdf5' : 'var(--bg-subtle)',
                        color: log.action.includes('OVERRIDE') ? '#e11d48' : log.action.includes('VERIFY') ? '#059669' : '#0369a1',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 4
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <strong>{log.user_id}</strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: 'var(--slate-700)' }}>
                      {log.entity_type} ({log.entity_id})
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--slate-500)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.old_value || 'NONE'}
                  </td>
                  <td style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-800)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.new_value}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--slate-700)', maxWidth: 260 }}>
                    {log.reason || '—'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                    {formatDateTime(log.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
