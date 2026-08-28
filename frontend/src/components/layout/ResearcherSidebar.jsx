import React from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  PlusCircle,
  Users,
  Search,
  ClipboardCheck,
  UserCheck,
  Bell,
  FileSpreadsheet,
  History,
  Activity,
  X,
  Stethoscope
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

import { useAuth } from '../../context/AuthContext';

export function ResearcherSidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { trials, notifications, clinicianName, screenings } = useApp();
  const { profile, user, logout } = useAuth();

  const researcherDisplayName = profile?.name || clinicianName || user?.email?.split('@')[0];
  const researcherOrg = profile?.organization || 'Clinical Research Institute';

  const unreviewedCount = screenings.filter(s => s.verdict === 'NEEDS_REVIEW').length;
  const pendingNotifsCount = notifications.filter(n => n.delivery_status === 'PENDING' || n.response === 'NONE').length;

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'trials',
      label: 'Trials',
      icon: FlaskConical,
      subItems: [
        { id: 'trials-list', label: 'All Trials' },
        { id: 'create-trial', label: 'AI Trial Builder', isNew: true }
      ]
    },
    { id: 'candidates', label: 'Candidates & Match', icon: Search },
    { id: 'patients', label: 'Patient Registry', icon: Users },
    { id: 'screening', label: 'Official Screening', icon: ClipboardCheck, badge: unreviewedCount > 0 ? unreviewedCount : null },
    { id: 'enrollment', label: 'Enrollment & Waitlist', icon: UserCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: pendingNotifsCount > 0 ? pendingNotifsCount : null },
    { id: 'reports', label: 'Reports & Exports', icon: FileSpreadsheet },
    { id: 'audit', label: 'Audit Trail', icon: History }
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 35,
            display: 'block'
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand-icon">
            <Activity size={20} />
          </div>
          <div>
            <div className="sidebar-brand-title">AegisTrial</div>
            <div className="sidebar-brand-subtitle">Clinical Intelligence</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                marginLeft: 'auto',
                color: 'var(--slate-400)',
                padding: '0.2rem',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Research Workspace</div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeTab));

            if (item.subItems) {
              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <div
                    className={`sidebar-link ${isSelected ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.subItems[0].id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                  <div style={{ paddingLeft: '2.1rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    {item.subItems.map((sub) => (
                      <div
                        key={sub.id}
                        className={`sidebar-link ${activeTab === sub.id ? 'active' : ''}`}
                        onClick={() => handleNavClick(sub.id)}
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem', cursor: 'pointer' }}
                      >
                        <span>{sub.label}</span>
                        {sub.isNew && (
                          <span style={{ fontSize: '0.62rem', background: '#0284c7', color: '#fff', padding: '0.05rem 0.35rem', borderRadius: 4, marginLeft: 'auto', fontWeight: 700 }}>
                            AI
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                style={{ cursor: 'pointer' }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="sidebar-link-badge">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="clinician-pill">
            <div className="clinician-avatar">
              <Stethoscope size={16} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {researcherDisplayName}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--slate-400)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {researcherOrg}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
