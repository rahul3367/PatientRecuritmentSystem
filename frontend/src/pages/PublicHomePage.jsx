import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Stethoscope,
  Users,
  FlaskConical,
  ClipboardCheck,
  Award,
  Lock,
  ChevronRight,
  Shield,
  FileSpreadsheet,
  Search,
  Check,
  Menu,
  X
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import clinicalTeamImg from '../assets/clinical_team.jpg';

export function PublicHomePage({ onNavigateToAuth }) {
  const [stats, setStats] = useState({
    registered_patients: null,
    active_trials: null,
    researchers: null,
    eligibility_screenings: null,
    successful_matches: null
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const data = await dashboardApi.getPublicStats();
        if (isMounted && data) {
          setStats(data);
        }
      } catch (err) {
        console.warn('Failed to load public stats:', err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    }
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Utility Bar */}
      <div
        style={{
          background: '#0c4a6e',
          color: '#e0f2fe',
          fontSize: '0.78rem',
          padding: '0.4rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 500
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={13} color="#38bdf8" />
          <span>AI-Driven Clinical Trial Protocol & Biomarker Screening Platform</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span style={{ display: 'none', md: 'inline' }}>HIPAA & 21 CFR Part 11 Compliant</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Shield size={12} /> Institutional Security Verified
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.9rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Activity size={22} color="#ffffff" strokeWidth={2.4} />
            </div>
            <div>
              <span
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: '#0369a1',
                  textTransform: 'uppercase'
                }}
              >
                AegisTrial
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.75rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#334155'
            }}
            className="desktop-nav"
          >
            <button
              onClick={() => scrollToSection('how-it-works')}
              style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: 0 }}
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('for-patients')}
              style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: 0 }}
            >
              For Patients
            </button>
            <button
              onClick={() => scrollToSection('for-researchers')}
              style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: 0 }}
            >
              For Researchers
            </button>
            <button
              onClick={() => scrollToSection('ai-matching')}
              style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: 0 }}
            >
              AI Screening
            </button>
            <button
              onClick={() => scrollToSection('metrics')}
              style={{ background: 'none', border: 'none', color: '#334155', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', padding: 0 }}
            >
              Platform Metrics
            </button>
          </nav>
        </div>

        {/* Authentication Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={() => onNavigateToAuth('login')}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => onNavigateToAuth('register')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(2, 132, 199, 0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(2, 132, 199, 0.35)'; }}
          >
            <span>Register</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* Hero Section (Matching Reference Style) */}
      <section
        style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 45%, #e0f2fe 100%)',
          position: 'relative',
          padding: '4rem 2rem',
          overflow: 'hidden'
        }}
      >
        {/* Subtle Ambient Glow Blobs */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-5%',
            width: '50vw',
            height: '50vw',
            maxWidth: 600,
            maxHeight: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(186, 230, 253, 0.45) 0%, rgba(240, 249, 255, 0) 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }}
        />

        <div
          style={{
            maxWidth: 1240,
            width: '100%',
            margin: '0 auto',
            position: 'relative',
            zIndex: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '3rem',
            alignItems: 'center'
          }}
        >
          {/* Left Column: Headline & Action */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                background: '#e0f2fe',
                border: '1px solid #bae6fd',
                color: '#0369a1',
                fontSize: '0.8rem',
                fontWeight: 700,
                width: 'fit-content'
              }}
            >
              <Sparkles size={14} color="#0284c7" />
              <span>Next-Generation Clinical Trial Intelligence</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.4rem, 4.5vw, 3.5rem)',
                fontWeight: 900,
                lineHeight: 1.12,
                color: '#0f172a',
                letterSpacing: '-0.03em',
                margin: 0
              }}
            >
              Smarter Clinical Trial Recruitment
            </h1>

            <p
              style={{
                color: '#475569',
                fontSize: '1.15rem',
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 560
              }}
            >
              AegisTrial bridges patients and research institutions through automated protocol extraction, verifiable biomarker eligibility screening, and end-to-end recruitment management.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => onNavigateToAuth('register')}
                style={{
                  padding: '0.85rem 1.6rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.35)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(2, 132, 199, 0.45)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(2, 132, 199, 0.35)'; }}
              >
                <span>Find Clinical Trials</span>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => onNavigateToAuth('login')}
                style={{
                  padding: '0.85rem 1.5rem',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0369a1',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.background = '#f0f9ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#ffffff'; }}
              >
                <Stethoscope size={18} color="#0284c7" />
                <span>For Researchers</span>
              </button>
            </div>

            {/* Feature Checklist */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1.5rem',
                fontSize: '0.86rem',
                fontWeight: 600,
                color: '#64748b',
                marginTop: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#059669" />
                <span>Instant Protocol AI Parser</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#0284c7" />
                <span>Real-Time Biomarker Fit</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#7c3aed" />
                <span>256-bit Protected Data</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Container (matching reference image) */}
          <div
            style={{
              position: 'relative',
              borderRadius: '32px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(226, 232, 240, 0.8)',
              background: '#ffffff'
            }}
          >
            <img
              src={clinicalTeamImg}
              alt="AegisTrial Clinical Research Team"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                objectFit: 'cover'
              }}
            />
            {/* Overlay Badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '1.25rem',
                left: '1.25rem',
                right: '1.25rem',
                background: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(16px)',
                color: '#ffffff',
                padding: '0.85rem 1.15rem',
                borderRadius: '16px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#34d399',
                    boxShadow: '0 0 8px #34d399'
                  }}
                />
                <span style={{ fontWeight: 600 }}>Active Recruitment Operations Live</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700 }}>
                HIPAA Certified
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Statistics Section (Live Data from Database) */}
      <section
        id="metrics"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '3.5rem 2rem'
        }}
      >
        <div style={{ maxWidth: 1240, width: '100%', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Real-Time Clinical Registry Metrics
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '6px 0 0 0', letterSpacing: '-0.02em' }}>
              Powered by Live Clinical Trial Database
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '6px 0 0 0' }}>
              Aggregated directly from institutional protocols, patient dossiers, and verification logs.
            </p>
          </div>

          {/* 5 Stats Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {/* Card 1: Registered Patients */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto'
                }}
              >
                <Users size={22} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                {loadingStats ? '...' : (stats.registered_patients ?? 0)}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', marginTop: '0.4rem' }}>
                Registered Patients
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.2rem' }}>
                Consented clinical dossiers
              </div>
            </div>

            {/* Card 2: Active Clinical Trials */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto'
                }}
              >
                <FlaskConical size={22} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                {loadingStats ? '...' : (stats.active_trials ?? 0)}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', marginTop: '0.4rem' }}>
                Active Clinical Trials
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.2rem' }}>
                Structured study protocols
              </div>
            </div>

            {/* Card 3: Researchers */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: '#f5f3ff',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto'
                }}
              >
                <Stethoscope size={22} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                {loadingStats ? '...' : (stats.researchers ?? 0)}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', marginTop: '0.4rem' }}>
                Principal Investigators
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.2rem' }}>
                Verified medical researchers
              </div>
            </div>

            {/* Card 4: Screenings */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: '#fffbeb',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto'
                }}
              >
                <ClipboardCheck size={22} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                {loadingStats ? '...' : (stats.eligibility_screenings ?? 0)}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', marginTop: '0.4rem' }}>
                Eligibility Screenings
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.2rem' }}>
                Automated criteria evaluations
              </div>
            </div>

            {/* Card 5: Matches */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: '#fdf2f8',
                  color: '#db2777',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto'
                }}
              >
                <Award size={22} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                {loadingStats ? '...' : (stats.successful_matches ?? 0)}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', marginTop: '0.4rem' }}>
                Successful Enrollments
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.2rem' }}>
                Enrolled study participants
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How AegisTrial Works Section */}
      <section
        id="how-it-works"
        style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '4.5rem 2rem'
        }}
      >
        <div style={{ maxWidth: 1240, width: '100%', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Structured Clinical Workflow
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 0 0', letterSpacing: '-0.02em' }}>
              How AegisTrial Works
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' }}>
              A 5-step intelligent workflow connecting scientific protocol design with patient enrollment.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.5rem'
            }}
          >
            {[
              {
                step: '01',
                title: 'Trial Creation',
                desc: 'Researchers configure trial protocols, target cohorts, and study phases.',
                icon: FlaskConical,
                color: '#0284c7'
              },
              {
                step: '02',
                title: 'AI Criteria Extraction',
                desc: 'LLM parser converts inclusion/exclusion guidelines into standardized vector rules.',
                icon: Sparkles,
                color: '#7c3aed'
              },
              {
                step: '03',
                title: 'Patient Dossier',
                desc: 'Participants securely input verified vitals, medical history, and clinical parameters.',
                icon: User,
                color: '#059669'
              },
              {
                step: '04',
                title: 'Biomarker Matching',
                desc: 'Deterministic rules engine ranks eligibility fit with explainable clinical gap analysis.',
                icon: Search,
                color: '#d97706'
              },
              {
                step: '05',
                title: 'Screening & Enrollment',
                desc: 'Investigators verify candidates, send digital invites, and finalize cohort enrollment.',
                icon: CheckCircle2,
                color: '#0284c7'
              }
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.75rem 1.25rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: item.color,
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>STEP {item.step}</span>
                  <item.icon size={20} color={item.color} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dual Value Section: For Patients & For Researchers */}
      <section style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '4.5rem 2rem' }}>
        <div style={{ maxWidth: 1240, width: '100%', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem'
            }}
          >
            {/* For Patients Card */}
            <div
              id="for-patients"
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                border: '1.5px solid #bbf7d0',
                borderRadius: '24px',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: '0 10px 30px rgba(5, 150, 105, 0.06)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: '#dcfce7',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <User size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                    Participant Portal
                  </span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    For Patients & Volunteers
                  </h3>
                </div>
              </div>

              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                Access groundbreaking treatments and clinical investigations tailored to your medical history with complete transparency.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  'Browse active, recruiting clinical trials across therapy areas',
                  'One-click automated eligibility check against published protocols',
                  'Direct invitation tracking with accept/decline digital workflows',
                  'Encrypted clinical dossier management with granular consent'
                ].map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155' }}>
                    <Check size={18} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onNavigateToAuth('register', 'PATIENT')}
                style={{
                  marginTop: 'auto',
                  padding: '0.75rem 1.4rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                }}
              >
                <span>Register as a Patient</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* For Researchers Card */}
            <div
              id="for-researchers"
              style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
                border: '1.5px solid #bae6fd',
                borderRadius: '24px',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: '0 10px 30px rgba(2, 132, 199, 0.06)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                    Investigator Workspace
                  </span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    For Principal Investigators
                  </h3>
                </div>
              </div>

              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                Accelerate cohort discovery, streamline candidate verification, and maintain rigorous 21 CFR Part 11 audit trails.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  'AI Protocol Wizard: Upload documents or paste protocols for auto-extraction',
                  'Candidate discovery pool ranked by structured criteria match score',
                  'Official verification log with manual override reason logging',
                  'Institutional CSV & PDF report exports for IRB compliance'
                ].map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: '#334155' }}>
                    <Check size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onNavigateToAuth('register')}
                style={{
                  marginTop: 'auto',
                  padding: '0.75rem 1.4rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                }}
              >
                <span>Access Researcher Workspace</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* AI-Powered Screening Feature Highlight */}
      <section
        id="ai-matching"
        style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '4.5rem 2rem'
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            width: '100%',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'center'
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                background: 'rgba(2, 132, 199, 0.2)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '1rem'
              }}
            >
              <Sparkles size={14} />
              <span>Deterministic & LLM Hybrid Matching</span>
            </div>

            <h2
              style={{
                fontSize: '2.3rem',
                fontWeight: 800,
                lineHeight: 1.2,
                color: '#ffffff',
                margin: '0 0 1rem 0'
              }}
            >
              Explainable AI That Clinicians Trust
            </h2>

            <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
              Unlike black-box models, AegisTrial pairs high-precision Natural Language Processing with deterministic rule validation to evaluate HbA1c, blood pressure, BMI, age limits, and diagnostic exclusions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', height: 'fit-content' }}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                    Precise Gap Identification
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                    Pinpoints exact reasons why a patient does or does not meet clinical thresholds.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', height: 'fit-content' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                    Zero Data Leakage Architecture
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 2 }}>
                    All screenings execute within authenticated institutional boundaries.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Interactive Preview Card */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#38bdf8' }}>
                Matching Engine Output Simulation
              </div>
              <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, background: 'rgba(52, 211, 153, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                VERIFIED FIT: 94%
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.65rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)' }}>
                <span style={{ color: '#cbd5e1' }}>Age Criteria [18 – 65]</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Met (Age: 42)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.65rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)' }}>
                <span style={{ color: '#cbd5e1' }}>HbA1c Threshold [&ge; 7.0%]</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Met (HbA1c: 7.8%)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.65rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)' }}>
                <span style={{ color: '#cbd5e1' }}>Prior Cardiovascular Event</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Exclusion Clear</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          padding: '4.5rem 2rem',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
            Join AegisTrial Clinical Network
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#e0f2fe', lineHeight: 1.6, margin: 0 }}>
            Whether you are a medical researcher launching an observational study or a patient seeking clinical trial access, AegisTrial provides the secure tools you need.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => onNavigateToAuth('register')}
              style={{
                padding: '0.85rem 1.75rem',
                borderRadius: '12px',
                border: 'none',
                background: '#ffffff',
                color: '#0369a1',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Create Free Account
            </button>

            <button
              type="button"
              onClick={() => onNavigateToAuth('login')}
              style={{
                padding: '0.85rem 1.6rem',
                borderRadius: '12px',
                border: '1.5px solid rgba(255, 255, 255, 0.6)',
                background: 'transparent',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Sign In to Workspace
            </button>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer
        style={{
          background: '#0f172a',
          color: '#94a3b8',
          borderTop: '1px solid #1e293b',
          padding: '2.5rem 2rem',
          fontSize: '0.85rem'
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={20} color="#38bdf8" />
            <span style={{ fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>AEGISTRIAL</span>
            <span>• Clinical Trial Recruitment & Intelligence</span>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', fontWeight: 600 }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>IRB Guidelines</span>
            <span>Security & Compliance</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            © {new Date().getFullYear()} AegisTrial Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
