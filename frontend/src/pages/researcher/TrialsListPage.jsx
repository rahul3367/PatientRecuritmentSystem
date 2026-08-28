import React, { useState } from 'react';
import {
  FlaskConical,
  PlusCircle,
  Search,
  ArrowRight,
  Filter,
  CheckCircle2,
  Sparkles,
  Users
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { formatDate } from '../../utils/formatters';

export function TrialsListPage({ setActiveTab, onSelectTrial }) {
  const { trials, setSelectedTrialId, enrollments } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredTrials = trials.filter(t => {
    const matchesSearch = t.trial_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.trial_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenTrial = (trialId) => {
    setSelectedTrialId(trialId);
    if (onSelectTrial) {
      onSelectTrial(trialId);
    } else {
      setActiveTab('trial-detail');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            Clinical Trials Portfolio
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Manage research protocols, criteria definitions, recruitment pipelines, and enrollments.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setActiveTab('create-trial')}
        >
          <Sparkles size={16} />
          <span>New AI Trial Builder</span>
        </button>
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
              maxWidth: 360
            }}
          >
            <Search size={16} color="var(--slate-400)" />
            <input
              type="text"
              placeholder="Search by trial title or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.86rem',
                width: '100%',
                color: 'var(--slate-800)'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-500)' }}>Status:</span>
          {['ALL', 'OPEN', 'PAUSED', 'CLOSED'].map((status) => (
            <button
              key={status}
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(status)}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Trials Grid */}
      {filteredTrials.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredTrials.map((trial) => {
            const enrolledCount = enrollments.filter(e => e.trial_id === trial.trial_id && e.status === 'ENROLLED').length;
            const target = trial.target_recruitment || 1;
            const progress = Math.min(100, Math.round((enrolledCount / target) * 100));

            return (
              <div
                key={trial.trial_id}
                className="card card-hoverable"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%'
                }}
              >
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#0284c7' }}>
                        {trial.trial_id}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)', marginTop: 2 }}>
                        {trial.trial_name}
                      </h3>
                    </div>
                    <StatusBadge status={trial.status} size="sm" />
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {trial.description}
                  </p>

                  {/* Progress Bar */}
                  <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--slate-600)' }}>Recruitment</span>
                      <span style={{ color: 'var(--slate-900)' }}>{enrolledCount} / {trial.target_recruitment} ({progress}%)</span>
                    </div>
                    <ProgressBar current={enrolledCount} target={trial.target_recruitment} height={6} />
                  </div>

                  {/* Criteria snapshot counts */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                    <span><strong>{trial.criteria?.length || 0}</strong> Criteria Rules</span>
                    <span>•</span>
                    <span>Source: <strong>{trial.source_type || 'MANUAL'}</strong></span>
                  </div>
                </div>

                <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                    Created {formatDate(trial.created_at)}
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleOpenTrial(trial.trial_id)}
                  >
                    <span>Open Workspace</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <FlaskConical size={36} color="var(--slate-400)" />
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--slate-800)', fontWeight: 700 }}>
              {searchTerm ? 'No matching clinical trials found' : 'Your trial portfolio is empty'}
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)', marginTop: 4 }}>
              {searchTerm ? 'Try adjusting your search query or status filter.' : 'Launch your first clinical trial protocol using AI criteria extraction.'}
            </p>
          </div>
          {!searchTerm && (
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab('create-trial')}
            >
              <Sparkles size={16} />
              <span>Launch AI Trial Builder</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
