import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';

// Layouts
import { ResearcherLayout } from './components/layout/ResearcherLayout';
import { PatientLayout } from './components/layout/PatientLayout';

// Auth & Landing Pages
import { LoginPage } from './pages/LoginPage';
import { PublicHomePage } from './pages/PublicHomePage';

// Researcher Pages
import { DashboardPage } from './pages/researcher/DashboardPage';
import { TrialsListPage } from './pages/researcher/TrialsListPage';
import { TrialDetailPage } from './pages/researcher/TrialDetailPage';
import { AITrialBuilderPage } from './pages/researcher/AITrialBuilderPage';
import { PatientsPage } from './pages/researcher/PatientsPage';
import { PatientProfilePage } from './pages/researcher/PatientProfilePage';
import { ScreeningLogPage } from './pages/researcher/ScreeningLogPage';
import { EnrollmentHubPage } from './pages/researcher/EnrollmentHubPage';
import { NotificationsPage } from './pages/researcher/NotificationsPage';
import { ReportsPage } from './pages/researcher/ReportsPage';
import { AuditTrailPage } from './pages/researcher/AuditTrailPage';

// Patient Pages
import { PatientHomePage } from './pages/patient/PatientHomePage';
import { BrowseTrialsPage } from './pages/patient/BrowseTrialsPage';
import { RecommendedTrialsPage } from './pages/patient/RecommendedTrialsPage';
import { PatientTrialDetailPage } from './pages/patient/PatientTrialDetailPage';
import { InvitationsPage } from './pages/patient/InvitationsPage';
import { MyEnrollmentPage } from './pages/patient/MyEnrollmentPage';
import { PatientProfileViewPage } from './pages/patient/PatientProfileViewPage';
import { PatientNotificationsPage } from './pages/patient/PatientNotificationsPage';
import { PatientOnboardingModal } from './components/patient/PatientOnboardingModal';

// Route Parser
function parseRoute(pathname, role) {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath === '/login') return { isAuth: true, mode: 'login' };
  if (cleanPath === '/register') return { isAuth: true, mode: 'register' };

  if (role === 'PATIENT') {
    if (cleanPath === '/' || cleanPath === '/home' || cleanPath === '/patient' || cleanPath === '/patient/home') {
      return { tab: 'home' };
    }
    if (cleanPath === '/browse' || cleanPath === '/patient/browse') {
      return { tab: 'browse' };
    }
    if (cleanPath === '/recommended' || cleanPath === '/patient/recommended') {
      return { tab: 'recommended' };
    }
    const patientTrialMatch = cleanPath.match(/^\/(?:patient\/)?trials\/([^/]+)/);
    if (patientTrialMatch) {
      return { tab: 'trial-detail', trialId: decodeURIComponent(patientTrialMatch[1]) };
    }
    if (cleanPath === '/invitations' || cleanPath === '/patient/invitations') {
      return { tab: 'invitations' };
    }
    if (cleanPath === '/enrollment' || cleanPath === '/patient/enrollment') {
      return { tab: 'enrollment' };
    }
    if (cleanPath === '/profile' || cleanPath === '/patient/profile') {
      return { tab: 'profile' };
    }
    if (cleanPath === '/notifications' || cleanPath === '/patient/notifications') {
      return { tab: 'notifications' };
    }
    return { tab: 'home' };
  }

  // RESEARCHER
  if (cleanPath === '/' || cleanPath === '/dashboard' || cleanPath === '/overview') {
    return { tab: 'dashboard' };
  }
  if (cleanPath === '/trials' || cleanPath === '/dashboard/trials' || cleanPath === '/trials-list') {
    return { tab: 'trials-list' };
  }
  if (cleanPath === '/create-trial' || cleanPath === '/dashboard/create-trial') {
    return { tab: 'create-trial' };
  }
  const trialDetailMatch = cleanPath.match(/^\/(?:dashboard\/)?trials\/([^/]+)/);
  if (trialDetailMatch) {
    return { tab: 'trial-detail', trialId: decodeURIComponent(trialDetailMatch[1]) };
  }
  if (cleanPath === '/candidates' || cleanPath === '/dashboard/candidates') {
    return { tab: 'candidates' };
  }
  const patientMatch = cleanPath.match(/^\/(?:dashboard\/)?patients\/([^/]+)/);
  if (patientMatch) {
    return { tab: 'patient-profile', patientId: decodeURIComponent(patientMatch[1]) };
  }
  if (cleanPath === '/patients' || cleanPath === '/dashboard/patients') {
    return { tab: 'patients' };
  }
  if (cleanPath === '/screening' || cleanPath === '/dashboard/screening') {
    return { tab: 'screening' };
  }
  if (cleanPath === '/enrollment' || cleanPath === '/dashboard/enrollment') {
    return { tab: 'enrollment' };
  }
  if (cleanPath === '/notifications' || cleanPath === '/dashboard/notifications') {
    return { tab: 'notifications' };
  }
  if (cleanPath === '/reports' || cleanPath === '/dashboard/reports') {
    return { tab: 'reports' };
  }
  if (cleanPath === '/audit' || cleanPath === '/dashboard/audit') {
    return { tab: 'audit' };
  }

  return { tab: 'dashboard' };
}

function buildRouteUrl(role, tab, params = {}) {
  if (role === 'PATIENT') {
    switch (tab) {
      case 'home': return '/';
      case 'browse': return '/browse';
      case 'recommended': return '/recommended';
      case 'trial-detail': return params.trialId ? `/trials/${encodeURIComponent(params.trialId)}` : '/browse';
      case 'invitations': return '/invitations';
      case 'enrollment': return '/enrollment';
      case 'profile': return '/profile';
      case 'notifications': return '/notifications';
      default: return '/';
    }
  }

  // Researcher
  switch (tab) {
    case 'dashboard': return '/dashboard';
    case 'trials-list': return '/trials';
    case 'create-trial': return '/create-trial';
    case 'trial-detail': return params.trialId ? `/dashboard/trials/${encodeURIComponent(params.trialId)}` : '/trials';
    case 'candidates': return '/candidates';
    case 'patients': return '/patients';
    case 'patient-profile': return params.patientId ? `/dashboard/patients/${encodeURIComponent(params.patientId)}` : '/patients';
    case 'screening': return '/screening';
    case 'enrollment': return '/enrollment';
    case 'notifications': return '/notifications';
    case 'reports': return '/reports';
    case 'audit': return '/audit';
    default: return '/dashboard';
  }
}

function AppContent() {
  const { isAuthenticated, role, user, profile, loading: authLoading } = useAuth();
  const { currentRole, setCurrentRole, selectedTrialId, setSelectedTrialId, setCurrentPatientId, patients, setPatients, showToast } = useApp();

  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [forceOpenOnboarding, setForceOpenOnboarding] = useState(false);

  // Parse initial route on load / refresh
  const initialParsed = parseRoute(window.location.pathname, role || 'RESEARCHER');

  // Navigation states
  const [researcherTab, setResearcherTab] = useState(role === 'RESEARCHER' && initialParsed.tab ? initialParsed.tab : 'dashboard');
  const [patientTab, setPatientTab] = useState(role === 'PATIENT' && initialParsed.tab ? initialParsed.tab : 'home');
  const [selectedPatientIdForProfile, setSelectedPatientIdForProfile] = useState(initialParsed.patientId || null);
  const [patientSelectedTrialId, setPatientSelectedTrialId] = useState(role === 'PATIENT' ? initialParsed.trialId || null : null);

  // Initialize selectedTrialId from route if present
  useEffect(() => {
    if (initialParsed.trialId && role === 'RESEARCHER') {
      setSelectedTrialId(initialParsed.trialId);
    }
  }, []);

  // Keep AppContext synced with authenticated role & profile
  useEffect(() => {
    if (isAuthenticated && role) {
      setCurrentRole(role);
      if (role === 'PATIENT' && profile?.patient_id) {
        setCurrentPatientId(profile.patient_id);
      }
    }
  }, [isAuthenticated, role, profile, setCurrentRole, setCurrentPatientId]);

  // Synchronize route changes on state updates and popstate
  const syncRouteToUrl = useCallback((newRole, newTab, params = {}) => {
    const targetUrl = buildRouteUrl(newRole, newTab, params);
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  }, []);

  // Handle researcher tab navigation
  const handleResearcherNav = useCallback((tab, params = {}) => {
    setResearcherTab(tab);
    if (params.trialId) {
      setSelectedTrialId(params.trialId);
    }
    if (params.patientId) {
      setSelectedPatientIdForProfile(params.patientId);
    }
    syncRouteToUrl('RESEARCHER', tab, {
      trialId: params.trialId || selectedTrialId,
      patientId: params.patientId || selectedPatientIdForProfile
    });
  }, [syncRouteToUrl, selectedTrialId, selectedPatientIdForProfile, setSelectedTrialId]);

  // Handle patient tab navigation
  const handlePatientNav = useCallback((tab, params = {}) => {
    setPatientTab(tab);
    if (params.trialId) {
      setPatientSelectedTrialId(params.trialId);
    }
    syncRouteToUrl('PATIENT', tab, {
      trialId: params.trialId || patientSelectedTrialId
    });
  }, [syncRouteToUrl, patientSelectedTrialId]);

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseRoute(window.location.pathname, role || 'RESEARCHER');
      if (role === 'PATIENT') {
        if (parsed.tab) setPatientTab(parsed.tab);
        if (parsed.trialId) setPatientSelectedTrialId(parsed.trialId);
      } else {
        if (parsed.tab) setResearcherTab(parsed.tab);
        if (parsed.trialId) setSelectedTrialId(parsed.trialId);
        if (parsed.patientId) setSelectedPatientIdForProfile(parsed.patientId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [role, setSelectedTrialId]);

  // Once authenticated and done loading, handle URL redirects if needed
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const currentPath = window.location.pathname;
      const redirectTarget = sessionStorage.getItem('aegis_auth_redirect');

      if (redirectTarget && redirectTarget !== '/login' && redirectTarget !== '/register') {
        sessionStorage.removeItem('aegis_auth_redirect');
        const parsed = parseRoute(redirectTarget, role);
        if (role === 'PATIENT') {
          if (parsed.tab) setPatientTab(parsed.tab);
          if (parsed.trialId) setPatientSelectedTrialId(parsed.trialId);
        } else {
          if (parsed.tab) setResearcherTab(parsed.tab);
          if (parsed.trialId) setSelectedTrialId(parsed.trialId);
          if (parsed.patientId) setSelectedPatientIdForProfile(parsed.patientId);
        }
        window.history.replaceState(null, '', redirectTarget);
      } else if (currentPath === '/login' || currentPath === '/register') {
        const defaultUrl = role === 'PATIENT' ? '/' : '/dashboard';
        window.history.replaceState(null, '', defaultUrl);
      } else {
        // Initial parse for authenticated user
        const parsed = parseRoute(currentPath, role);
        if (role === 'PATIENT') {
          if (parsed.tab) setPatientTab(parsed.tab);
          if (parsed.trialId) setPatientSelectedTrialId(parsed.trialId);
        } else {
          if (parsed.tab) setResearcherTab(parsed.tab);
          if (parsed.trialId) setSelectedTrialId(parsed.trialId);
          if (parsed.patientId) setSelectedPatientIdForProfile(parsed.patientId);
        }
      }
    } else if (!authLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        sessionStorage.setItem('aegis_auth_redirect', currentPath + window.location.search);
      }
    }
  }, [authLoading, isAuthenticated, role, setSelectedTrialId]);

  // Titles map for Researcher Layout
  const titleMap = {
    'dashboard': 'Recruitment Operations Overview',
    'trials-list': 'Clinical Trials Portfolio',
    'create-trial': 'AI Protocol Extraction Wizard',
    'trial-detail': 'Clinical Study Workspace',
    'candidates': 'Candidate Match Discovery Pool',
    'patients': 'Patient Clinical Registry',
    'patient-profile': 'Patient Clinical Dossier',
    'screening': 'Official Screening & Verification Log',
    'enrollment': 'Enrollment & Waitlist Operations',
    'notifications': 'Communications & Alerts Center',
    'reports': 'Reports & Institutional Exports',
    'audit': 'Institutional Activity & Audit Log'
  };

  const [unauthPath, setUnauthPath] = useState(() => window.location.pathname.replace(/\/+$/, '') || '/');

  // Track unauthenticated popstate navigation
  useEffect(() => {
    const handleUnauthPop = () => {
      setUnauthPath(window.location.pathname.replace(/\/+$/, '') || '/');
    };
    window.addEventListener('popstate', handleUnauthPop);
    return () => window.removeEventListener('popstate', handleUnauthPop);
  }, []);

  // Loading Screen while restoring JWT session
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #075985 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          gap: '1rem'
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            border: '3px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: '#38bdf8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <div style={{ fontSize: '0.95rem', color: '#cbd5e1', fontWeight: 600 }}>
          Restoring secure clinical session...
        </div>
      </div>
    );
  }

  // If Unauthenticated: Serve Public Home Page or Login/Register Pages
  if (!isAuthenticated) {
    const cleanCurrent = unauthPath;

    if (cleanCurrent === '/login') {
      return (
        <LoginPage
          defaultMode="login"
          onBrowseRoles={() => {}}
        />
      );
    }
    if (cleanCurrent === '/register') {
      return (
        <LoginPage
          defaultMode="register"
          onBrowseRoles={() => {}}
        />
      );
    }
    if (cleanCurrent === '/' || cleanCurrent === '/home') {
      return (
        <PublicHomePage
          onNavigateToAuth={(targetMode, targetRole) => {
            let target = targetMode === 'register' ? '/register' : '/login';
            if (targetRole) {
              target += `?role=${encodeURIComponent(targetRole.toLowerCase())}`;
            }
            window.history.pushState(null, '', target);
            setUnauthPath(target);
          }}
        />
      );
    }

    // Direct access to protected page while unauthenticated -> save redirect and render Login
    return (
      <LoginPage
        defaultMode="login"
        onBrowseRoles={() => {}}
      />
    );
  }

  // Researcher Experience
  if (role === 'RESEARCHER' || currentRole === 'RESEARCHER') {
    return (
      <ResearcherLayout
        activeTab={researcherTab}
        setActiveTab={handleResearcherNav}
        title={titleMap[researcherTab] || 'Workspace'}
      >
        {researcherTab === 'dashboard' && (
          <DashboardPage setActiveTab={handleResearcherNav} />
        )}

        {researcherTab === 'trials-list' && (
          <TrialsListPage
            setActiveTab={handleResearcherNav}
            onSelectTrial={(id) => {
              handleResearcherNav('trial-detail', { trialId: id });
            }}
          />
        )}

        {researcherTab === 'create-trial' && (
          <AITrialBuilderPage setActiveTab={handleResearcherNav} />
        )}

        {(researcherTab === 'trial-detail' || researcherTab === 'candidates') && (
          <TrialDetailPage setActiveTab={handleResearcherNav} />
        )}

        {researcherTab === 'patients' && (
          <PatientsPage
            onSelectPatient={(id) => {
              handleResearcherNav('patient-profile', { patientId: id });
            }}
          />
        )}

        {researcherTab === 'patient-profile' && (
          <PatientProfilePage
            patientId={selectedPatientIdForProfile}
            onBack={() => handleResearcherNav('patients')}
            onSelectTrial={(id) => {
              handleResearcherNav('trial-detail', { trialId: id });
            }}
          />
        )}

        {researcherTab === 'screening' && (
          <ScreeningLogPage />
        )}

        {researcherTab === 'enrollment' && (
          <EnrollmentHubPage
            onSelectTrial={(id) => {
              handleResearcherNav('trial-detail', { trialId: id });
            }}
          />
        )}

        {researcherTab === 'notifications' && (
          <NotificationsPage />
        )}

        {researcherTab === 'reports' && (
          <ReportsPage />
        )}

        {researcherTab === 'audit' && (
          <AuditTrailPage />
        )}
      </ResearcherLayout>
    );
  }

  // Patient Experience
  const currentPatient = patients[0] || null;
  const isPatient = (role === 'PATIENT' || currentRole === 'PATIENT');
  const needsOnboarding = isPatient && currentPatient && (currentPatient.is_profile_complete === false || (!currentPatient.dob && !currentPatient.gender));

  return (
    <>
      <PatientLayout activeTab={patientTab} setActiveTab={handlePatientNav}>
        {patientTab === 'home' && (
          <PatientHomePage
            setActiveTab={handlePatientNav}
            onOpenOnboarding={() => setForceOpenOnboarding(true)}
            onSelectTrial={(id) => {
              handlePatientNav('trial-detail', { trialId: id });
            }}
          />
        )}

        {patientTab === 'browse' && (
          <BrowseTrialsPage
            setActiveTab={handlePatientNav}
            onSelectTrial={(id) => {
              handlePatientNav('trial-detail', { trialId: id });
            }}
          />
        )}

        {patientTab === 'recommended' && (
          <RecommendedTrialsPage
            setActiveTab={handlePatientNav}
            onSelectTrial={(id) => {
              handlePatientNav('trial-detail', { trialId: id });
            }}
          />
        )}

        {patientTab === 'trial-detail' && (
          <PatientTrialDetailPage
            trialId={patientSelectedTrialId}
            onBack={() => handlePatientNav('browse')}
            setActiveTab={handlePatientNav}
          />
        )}

        {patientTab === 'invitations' && (
          <InvitationsPage setActiveTab={handlePatientNav} />
        )}

        {patientTab === 'enrollment' && (
          <MyEnrollmentPage setActiveTab={handlePatientNav} />
        )}

        {patientTab === 'profile' && (
          <PatientProfileViewPage />
        )}

        {patientTab === 'notifications' && (
          <PatientNotificationsPage setActiveTab={handlePatientNav} />
        )}
      </PatientLayout>

      {/* Patient Onboarding Modal on First Login / Incomplete Profile */}
      {isPatient && currentPatient && ((needsOnboarding && !onboardingDismissed) || forceOpenOnboarding) && (
        <PatientOnboardingModal
          isOpen={true}
          initialProfile={currentPatient}
          onClose={() => {
            setOnboardingDismissed(true);
            setForceOpenOnboarding(false);
          }}
          onComplete={(updatedPatient) => {
            setOnboardingDismissed(true);
            setForceOpenOnboarding(false);
            if (setPatients && updatedPatient) {
              setPatients([updatedPatient]);
            }
            if (showToast) {
              showToast('Profile Completed', 'Your clinical profile has been updated and registered.', 'success');
            }
          }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
