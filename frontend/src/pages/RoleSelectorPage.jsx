import React from 'react';
import {
  ShieldCheck,
  User,
  Activity,
  Sparkles,
  ArrowRight,
  FlaskConical,
  Heart,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function RoleSelectorPage({ onEnter }) {
  const { setCurrentRole, setCurrentPatientId, patients } = useApp();

  const handleLaunchResearcher = () => {
    setCurrentRole('RESEARCHER');
    if (onEnter) onEnter();
  };

  const handleLaunchPatient = (patientId) => {
    setCurrentRole('PATIENT');
    setCurrentPatientId(patientId);
    if (onEnter) onEnter();
  };

  const demoPatients = [
    {
      id: 'P014',
      name: 'Jane Doe',
      match: '94.2%',
      verdict: 'APPROVED',
      desc: 'Type 2 Diabetes (HbA1c 6.8%, Glucose 124) • Pending Study Invitation',
      color: '#059669'
    },
    {
      id: 'P022',
      name: 'John Smith',
      match: '91.7%',
      verdict: 'APPROVED',
      desc: 'Type 2 Diabetes & Hypertension • Accepted Invitation',
      color: '#059669'
    },
    {
      id: 'P031',
      name: 'Sarah Williams',
      match: '87.3%',
      verdict: 'NEEDS_REVIEW',
      desc: 'Type 2 Diabetes (Smoker, HbA1c 7.9%) • Ranked Waitlist #1',
      color: '#d97706'
    },
    {
      id: 'P004',
      name: 'Michael Chang',
      match: '96.0%',
      verdict: 'APPROVED',
      desc: 'Primary Hypertension (BP 168/98) • Renal Protocol Candidate',
      color: '#0284c7'
    }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #075985 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        color: '#ffffff'
      }}
    >
      <div style={{ maxWidth: 1080, width: '100%', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(2, 132, 199, 0.5)'
            }}
          >
            <Activity size={28} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              AegisTrial
            </h1>
            <p style={{ color: 'var(--slate-300)', fontSize: '1.05rem', maxWidth: 620, margin: '0 auto', marginTop: 4 }}>
              Next-Generation Clinical Trial Recruitment & Screening Intelligence Platform
            </p>
          </div>
        </div>

        {/* Dual Experience Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.75rem' }}>
          {/* Card 1: Researcher */}
          <div
            className="card"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #0284c7, #0369a1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={26} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 700 }}>
                    Researcher Workspace
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase' }}>
                    Principal Investigator & Clinical Operations
                  </span>
                </div>
              </div>

              <p style={{ color: 'var(--slate-300)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Primary research workspace equipped with AI protocol criteria extraction, Gaussian candidate ranking, official screening logs, clinician verdict override with audit trail, and enrollment lifecycle management.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.84rem', color: 'var(--slate-200)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="#38bdf8" /> AI Criteria Builder (HARD/SOFT & Gaussian math)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="#38bdf8" /> Official Screening Verification & Reason Overrides
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="#38bdf8" /> Ranked Waitlist & Atomic Auto-Promotion on Drop
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={handleLaunchResearcher}
              style={{ marginTop: '2rem', width: '100%', background: '#0284c7', boxShadow: '0 0 16px rgba(2, 132, 199, 0.4)' }}
            >
              <span>Enter as Principal Investigator</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Card 2: Patient Portal */}
          <div
            className="card"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={26} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 700 }}>
                    Patient Experience Portal
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 600, textTransform: 'uppercase' }}>
                    Participant & Candidate View
                  </span>
                </div>
              </div>

              <p style={{ color: 'var(--slate-300)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Approachable healthcare portal designed for patients to discover matching clinical studies, understand qualification reasons, review and accept trial invitations, and track study visits.
              </p>

              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-300)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Select Demo Patient Persona:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {demoPatients.map((dp) => (
                    <div
                      key={dp.id}
                      onClick={() => handleLaunchPatient(dp.id)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.6rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff' }}>
                          {dp.name} <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontFamily: 'var(--font-mono)' }}>({dp.id})</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--slate-300)' }}>
                          {dp.desc}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: dp.color, background: 'rgba(255, 255, 255, 0.1)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                          {dp.match} {dp.verdict}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="btn btn-success btn-lg"
              onClick={() => handleLaunchPatient('P014')}
              style={{ marginTop: '1.5rem', width: '100%', background: '#059669', boxShadow: '0 0 16px rgba(5, 150, 105, 0.4)' }}
            >
              <span>Enter as Jane Doe (P014)</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
