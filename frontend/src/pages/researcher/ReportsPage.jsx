import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, CheckCircle2, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportApi } from '../../services/api';

export function ReportsPage() {
  const { trials, getCandidatesForTrial, showToast } = useApp();
  const [selectedTrialId, setSelectedTrialId] = useState('T001');

  const trial = trials.find(t => t.trial_id === selectedTrialId) || trials[0] || null;

  if (!trial) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            Reports & Institutional Exports
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Download validated candidate rosters and executive trial recruitment reports.
          </p>
        </div>
        <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <FileSpreadsheet size={36} color="var(--slate-400)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--slate-800)', fontWeight: 700 }}>No Trials to Export</h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)', marginTop: 4 }}>
            Create or manage a clinical trial in your portfolio to generate downloadable CSV candidate rosters and executive PDF summaries.
          </p>
        </div>
      </div>
    );
  }

  const candidates = getCandidatesForTrial(trial.trial_id);

  const handleDownloadPdf = async () => {
    try {
      await exportApi.exportDashboardPdf(trial.trial_id);
      showToast('Report Generated', `Downloaded official report_${trial.trial_id}.pdf with ReportLab metrics.`, 'success');
    } catch (err) {
      showToast('Export Failed', err.message || 'Failed to generate PDF export.', 'danger');
    }
  };

  const handleDownloadCsv = () => {
    exportApi.exportCandidatesCsv(candidates, trial.trial_id);
    showToast('CSV Exported', `Generated candidates_${trial.trial_id}.csv containing ${candidates.length} records.`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
          Reports & Institutional Exports
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
          Download validated candidate rosters and executive trial recruitment reports.
        </p>
      </div>

      {/* Trial Context Selector */}
      <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--slate-700)' }}>
          Select Protocol Study:
        </span>
        <select
          className="form-select"
          value={selectedTrialId}
          onChange={(e) => setSelectedTrialId(e.target.value)}
          style={{ maxWidth: 360 }}
        >
          {trials.map(t => (
            <option key={t.trial_id} value={t.trial_id}>{t.trial_id}: {t.trial_name}</option>
          ))}
        </select>
      </div>

      {/* Export Cards Grid */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* CSV Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileSpreadsheet size={22} color="#059669" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--slate-900)' }}>
                Candidate Roster (CSV)
              </h3>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)' }}>
              Complete dataset of all evaluated candidates for <strong>{trial.trial_name}</strong>.
            </p>
            <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--slate-700)' }}>
              Fields: Patient ID, Patient Name, Contact Phone, Match Percentage, Verdict, Eligibility, Screened At.
            </div>
            <button className="btn btn-success" onClick={handleDownloadCsv}>
              <Download size={16} />
              <span>Download candidates_{trial.trial_id}.csv</span>
            </button>
          </div>
        </div>

        {/* PDF Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileText size={22} color="#0284c7" />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--slate-900)' }}>
                Executive Summary (PDF)
              </h3>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)' }}>
              Executive PDF dashboard summary including recruitment progression, conversion rates, and top exclusion tally.
            </p>
            <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--slate-700)' }}>
              Formatted for institutional IRBs and clinical trial sponsors.
            </div>
            <button className="btn btn-primary" onClick={handleDownloadPdf}>
              <Download size={16} />
              <span>Download report_{trial.trial_id}.pdf</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
