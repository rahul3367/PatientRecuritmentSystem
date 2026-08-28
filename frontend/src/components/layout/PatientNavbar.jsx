import React, { useState } from 'react';
import {
  Heart,
  Home,
  Compass,
  Sparkles,
  Mail,
  UserCheck,
  User,
  Bell,
  ArrowRightLeft,
  ChevronDown,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export function PatientNavbar({ activeTab, setActiveTab }) {
  const {
    patients,
    currentPatientId,
    setCurrentPatientId,
    setCurrentRole,
    notifications,
    enrollments,
    trials,
    showToast
  } = useApp();

  const { user, profile, logout } = useAuth();

  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activePatient = profile || patients.find(p => p.patient_id === currentPatientId) || patients[0] || null;
  const patientDisplayName = profile?.name || activePatient?.name || user?.email?.split('@')[0] || 'Participant';
  const patientDisplayId = profile?.patient_id || activePatient?.patient_id || '';
  const targetPatientId = profile?.patient_id || currentPatientId || activePatient?.patient_id || null;
  
  // Pending invitations count for this patient (only calculated once valid patient ID exists)
  const pendingInvites = targetPatientId
    ? enrollments.filter(e => e.patient_id === targetPatientId && e.status === 'INVITED').length
    : 0;
  const unreadNotifs = targetPatientId
    ? notifications.filter(n => 
        n.patient_id === targetPatientId && 
        n.response === 'NONE' &&
        (!trials || trials.length === 0 || trials.some(t => t.trial_id === n.trial_id))
      ).length
    : 0;

  const handleLogout = () => {
    logout();
    showToast('Signed Out', 'You have been signed out of the patient portal.', 'info');
  };

  const navLinks = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'browse', label: 'Browse Trials', icon: Compass },
    { id: 'recommended', label: 'Recommended Trials', icon: Sparkles },
    { id: 'invitations', label: 'Invitations', icon: Mail, badge: pendingInvites > 0 ? pendingInvites : null },
    { id: 'enrollment', label: 'My Enrollment', icon: UserCheck },
    { id: 'profile', label: 'My Health Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs > 0 ? unreadNotifs : null }
  ];

  return (
    <header className="patient-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
            }}
          >
            <Heart size={20} fill="#ffffff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--slate-900)' }}>
              AegisTrial
            </div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#059669', fontWeight: 700 }}>
              Patient Health Portal
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="patient-nav-links">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;

            return (
              <button
                key={link.id}
                className={`patient-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(link.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Icon size={16} />
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    style={{
                      background: '#e11d48',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-full)',
                      padding: '0.05rem 0.45rem'
                    }}
                  >
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Patient Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsPersonaOpen(!isPersonaOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#059669',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.75rem'
              }}
            >
              {patientDisplayName.charAt(0)}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                {patientDisplayName}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#15803d' }}>
                ID: {patientDisplayId}
              </div>
            </div>
            <ChevronDown size={14} color="#166534" />
          </button>

          {isPersonaOpen && (
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
                gap: '0.4rem'
              }}
            >
              <div style={{ padding: '0.25rem 0.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                  {patientDisplayName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  {user?.email || 'patient@example.com'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 2, fontWeight: 600 }}>
                  Participant ID: {patientDisplayId}
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
                  <span>Log Out of Patient Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 72,
            left: 0,
            right: 0,
            background: '#ffffff',
            borderBottom: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xl)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            zIndex: 35
          }}
        >
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => {
                setActiveTab(link.id);
                setIsMobileMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === link.id ? 'var(--primary-50)' : 'transparent',
                color: activeTab === link.id ? 'var(--primary-700)' : 'var(--slate-800)',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              <span>{link.label}</span>
              {link.badge && (
                <span style={{ background: '#e11d48', color: '#fff', fontSize: '0.72rem', padding: '0.1rem 0.5rem', borderRadius: 9999 }}>
                  {link.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
