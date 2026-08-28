import React, { useState, useEffect } from 'react';
import { trialsApi } from '../../services/api';
import { DynamicEligibilityModal } from '../../components/patient/DynamicEligibilityModal';

export function BrowseTrialsPage({ onSelectTrial, setActiveTab }) {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrialForCheck, setSelectedTrialForCheck] = useState(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const fetchTrials = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (statusFilter) filters.status = statusFilter;
      if (yearFilter) filters.year = yearFilter;
      if (monthFilter) filters.month = monthFilter;

      const data = await trialsApi.getTrials(filters);
      const safeData = Array.isArray(data) ? data : [];
      // Sequence trials strictly by created date & time descending (latest created first)
      const sorted = [...safeData].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return String(b.trial_id || '').localeCompare(String(a.trial_id || ''), undefined, { numeric: true });
      });
      setTrials(sorted);
    } catch (err) {
      console.warn('Error loading trials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrials();
  }, [statusFilter, yearFilter, monthFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTrials();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setYearFilter('');
    setMonthFilter('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>🔬</span> Clinical Discovery
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: '0.25rem 0' }}>
          Explore Clinical Trials
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
          Browse accredited clinical studies, evaluate your eligibility dynamically with auto-filled health data, and apply directly.
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by trial title, condition, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.25rem',
                borderRadius: '8px',
                background: '#0f172a',
                border: '1px solid #475569',
                color: '#ffffff',
                fontSize: '0.9rem'
              }}
            />
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
              🔍
            </span>
          </div>

          <button
            type="submit"
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.25rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.85rem' }}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open for Recruitment</option>
              <option value="RECRUITING">Recruiting</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Year:</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.85rem' }}
            >
              <option value="">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Month:</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              style={{ background: '#0f172a', border: '1px solid #475569', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.85rem' }}
            >
              <option value="">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          {(search || statusFilter || yearFilter || monthFilter) && (
            <button
              onClick={handleClearFilters}
              style={{
                background: 'transparent',
                border: '1px solid #64748b',
                color: '#94a3b8',
                padding: '0.4rem 0.75rem',
                borderRadius: 6,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Trials List */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{
            width: 36, height: 36,
            border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#38bdf8',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 0.8s linear infinite'
          }} />
          Fetching clinical studies...
        </div>
      ) : trials.length === 0 ? (
        <div style={{
          background: '#1e293b',
          border: '1px dashed #475569',
          borderRadius: '12px',
          padding: '3.5rem 2rem',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 0.5rem' }}>No Clinical Trials Found</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            No clinical studies matched your current search and filter settings. Try clearing filters or searching for different terms.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
          {trials.map(trial => {
            const isOpen = trial.status === 'OPEN' || trial.status === 'RECRUITING';
            const criteriaCount = trial.criteria ? trial.criteria.length : 0;

            return (
              <div
                key={trial.trial_id}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'border-color 0.2s ease, transform 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                      {trial.trial_id}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: isOpen ? '#34d399' : '#94a3b8',
                      background: isOpen ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 4
                    }}>
                      {trial.status || 'OPEN'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem' }}>
                    {trial.trial_name}
                  </h3>

                  <p style={{
                    fontSize: '0.875rem',
                    color: '#cbd5e1',
                    lineHeight: 1.5,
                    margin: '0 0 1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {trial.description || 'No study overview description provided.'}
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {trial.target_recruitment && (
                      <span style={{ background: '#0f172a', padding: '0.25rem 0.6rem', borderRadius: 4, border: '1px solid #334155' }}>
                        🎯 Target: {trial.target_recruitment} participants
                      </span>
                    )}
                    {criteriaCount > 0 && (
                      <span style={{ background: '#0f172a', padding: '0.25rem 0.6rem', borderRadius: 4, border: '1px solid #334155' }}>
                        📋 {criteriaCount} Eligibility Rules
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
                  <button
                    onClick={() => setSelectedTrialForCheck(trial)}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                    }}
                  >
                    Check Eligibility
                  </button>

                  <button
                    onClick={() => {
                      if (onSelectTrial) onSelectTrial(trial.trial_id);
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid #475569',
                      color: '#cbd5e1',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Eligibility Check Modal */}
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
