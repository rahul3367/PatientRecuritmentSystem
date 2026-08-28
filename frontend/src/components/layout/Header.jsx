import React, { useState } from 'react';
import {
  Menu,
  FlaskConical,
  User,
  ArrowRightLeft,
  ChevronDown,
  Bell,
  Sparkles,
  ShieldCheck,
  Check,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export function Header({ onToggleSidebar, activeTabTitle = 'Overview' }) {
  const {
    trials,
    selectedTrialId,
    setSelectedTrialId,
    currentRole,
    setCurrentRole,
    patients,
    currentPatientId,
    setCurrentPatientId,
    showToast
  } = useApp();

  const { user, profile, logout } = useAuth();

  const [isTrialMenuOpen, setIsTrialMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const selectedTrial = trials.find(t => t.trial_id === selectedTrialId) || trials[0] || null;

  const handleLogout = () => {
    logout();
    showToast('Signed Out', 'You have been safely signed out.', 'info');
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Investigator';
  const displayOrg = profile?.organization || user?.email || 'Clinical Investigator';

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="btn-ghost"
          onClick={onToggleSidebar}
          style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)' }}
          aria-label="Toggle Navigation"
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            {activeTabTitle}
          </h2>

          {/* Active Trial Context Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsTrialMenuOpen(!isTrialMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--slate-700)',
                cursor: 'pointer'
              }}
            >
              <FlaskConical size={14} color="#0284c7" />
              <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedTrial ? `${selectedTrial.trial_id}: ${selectedTrial.trial_name}` : 'No Active Trials'}
              </span>
              <ChevronDown size={14} />
            </button>

            {isTrialMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  width: 320,
                  background: '#ffffff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-xl)',
                  zIndex: 50,
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase' }}>
                  Select Active Study
                </div>
                {trials.map(t => (
                  <div
                    key={t.trial_id}
                    onClick={() => {
                      setSelectedTrialId(t.trial_id);
                      setIsTrialMenuOpen(false);
                      showToast('Context Changed', `Active trial focused on ${t.trial_id}.`, 'info');
                    }}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: t.trial_id === selectedTrialId ? 'var(--primary-50)' : 'transparent',
                      color: t.trial_id === selectedTrialId ? 'var(--primary-700)' : 'var(--slate-800)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: t.trial_id === selectedTrialId ? 600 : 500
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.trial_id}: {t.trial_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                        Target: {t.target_recruitment} • {t.criteria?.length || 0} Criteria
                      </div>
                    </div>
                    {t.trial_id === selectedTrialId && <Check size={16} color="#0284c7" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Actions & Authenticated User Control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* User Badge & Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#0284c7',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.78rem'
              }}
            >
              {displayName.charAt(0)}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0369a1' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#0284c7' }}>
                Principal Investigator
              </div>
            </div>
            <ChevronDown size={14} color="#0284c7" />
          </button>

          {isUserMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '115%',
                right: 0,
                width: 260,
                background: '#ffffff',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 60,
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ padding: '0.25rem 0.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  {user?.email}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: 2 }}>
                  {displayOrg}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
                >
                  <LogOut size={16} />
                  <span>Log Out of Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
