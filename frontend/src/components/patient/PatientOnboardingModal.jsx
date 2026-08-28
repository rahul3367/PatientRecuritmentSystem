import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Heart,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X
} from 'lucide-react';
import { patientsApi } from '../../services/api';

export function PatientOnboardingModal({ isOpen, onClose, onComplete, initialProfile = null }) {
  if (!isOpen) return null;

  const latestVitals = initialProfile?.vitals && initialProfile.vitals.length > 0
    ? initialProfile.vitals[initialProfile.vitals.length - 1]
    : null;

  const [activeStep, setActiveStep] = useState(1);

  const [formData, setFormData] = useState({
    name: initialProfile?.name || '',
    dob: initialProfile?.dob || '',
    gender: initialProfile?.gender || 'Male',
    location: initialProfile?.location || '',
    phone: initialProfile?.phone || '',
    blood_group: initialProfile?.blood_group || 'O+',
    smoking: initialProfile?.smoking ?? false,
    alcohol: initialProfile?.alcohol ?? false,
    previous_surgery: initialProfile?.previous_surgery || '',
    // Vitals
    bp_systolic: latestVitals?.bp_systolic ?? '',
    bp_diastolic: latestVitals?.bp_diastolic ?? '',
    heart_rate: latestVitals?.heart_rate ?? '',
    bmi: latestVitals?.bmi ?? '',
    hba1c: latestVitals?.hba1c ?? '',
    blood_glucose: latestVitals?.blood_glucose ?? '',
    // Lists
    conditions: (initialProfile?.conditions || []).map(c => c.condition_name).join(', ') || '',
    allergies: (initialProfile?.allergies || []).map(a => a.allergen).join(', ') || '',
    consent: initialProfile?.consent ?? true
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (value === 'true' ? true : (value === 'false' ? false : value))
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!formData.dob) {
      setError('Date of Birth is required for clinical protocol matching.');
      setActiveStep(1);
      return;
    }
    if (!formData.gender) {
      setError('Gender is required for clinical protocol matching.');
      setActiveStep(1);
      return;
    }
    if (!formData.consent) {
      setError('You must accept the clinical research and privacy consent.');
      return;
    }

    setSubmitting(true);
    try {
      // Format payload for backend
      const conditionsList = formData.conditions
        ? formData.conditions.split(',').map(c => ({ condition_name: c.trim() })).filter(c => c.condition_name.length > 0)
        : [];

      const allergiesList = formData.allergies
        ? formData.allergies.split(',').map(a => ({ allergen: a.trim() })).filter(a => a.allergen.length > 0)
        : [];

      const vitalsObj = (formData.bp_systolic || formData.bp_diastolic || formData.heart_rate || formData.bmi || formData.hba1c || formData.blood_glucose) ? {
        bp_systolic: formData.bp_systolic ? Number(formData.bp_systolic) : undefined,
        bp_diastolic: formData.bp_diastolic ? Number(formData.bp_diastolic) : undefined,
        heart_rate: formData.heart_rate ? Number(formData.heart_rate) : undefined,
        bmi: formData.bmi ? Number(formData.bmi) : undefined,
        hba1c: formData.hba1c ? Number(formData.hba1c) : undefined,
        blood_glucose: formData.blood_glucose ? Number(formData.blood_glucose) : undefined
      } : undefined;

      const payload = {
        name: formData.name ? formData.name.trim() : undefined,
        gender: formData.gender,
        dob: formData.dob,
        location: formData.location ? formData.location.trim() : undefined,
        phone: formData.phone ? formData.phone.trim() : undefined,
        blood_group: formData.blood_group || undefined,
        smoking: Boolean(formData.smoking),
        alcohol: Boolean(formData.alcohol),
        previous_surgery: formData.previous_surgery ? formData.previous_surgery.trim() : 'None',
        consent: Boolean(formData.consent),
        vitals: vitalsObj,
        conditions: conditionsList,
        allergies: allergiesList
      };

      const updated = await patientsApi.updateMyProfile(payload);
      if (onComplete) onComplete(updated);
    } catch (err) {
      setError(err.message || 'Failed to complete profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = formData.name || initialProfile?.name || 'Participant';

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem'
      }}
    >
      <div
        className="modal-content"
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          maxWidth: '740px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          color: '#0f172a',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          padding: '2.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          position: 'relative'
        }}
      >
        {/* Close / Skip button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Welcoming Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem'
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Sparkles size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#bae6fd', fontWeight: 700 }}>
              Welcome to AegisTrial
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0.2rem 0 0.3rem 0', color: '#ffffff' }}>
              Welcome, {displayName}! 👋
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#f0f9ff', lineHeight: 1.45 }}>
              Your account has been created. Let's set up your clinical health profile to start matching you with open clinical trials and breakthrough therapies.
            </p>
          </div>
        </div>

        {/* Step Indicator Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: '#f8fafc', padding: '0.35rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            style={{
              padding: '0.6rem 0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: activeStep === 1 ? '#ffffff' : 'transparent',
              color: activeStep === 1 ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              boxShadow: activeStep === 1 ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <User size={15} />
            <span>1. Demographics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(2)}
            style={{
              padding: '0.6rem 0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: activeStep === 2 ? '#ffffff' : 'transparent',
              color: activeStep === 2 ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              boxShadow: activeStep === 2 ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Activity size={15} />
            <span>2. Medical History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(3)}
            style={{
              padding: '0.6rem 0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: activeStep === 3 ? '#ffffff' : 'transparent',
              color: activeStep === 3 ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              boxShadow: activeStep === 3 ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Heart size={15} />
            <span>3. Biomarkers & Vitals</span>
          </button>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#dc2626',
              fontSize: '0.85rem'
            }}
          >
            <AlertCircle size={16} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* STEP 1: Personal Demographics */}
          {activeStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Alice Johnson"
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="dob"
                    required
                    value={formData.dob}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    City & State
                  </label>
                  <input
                    type="text"
                    name="location"
                    placeholder="Boston, MA"
                    value={formData.location}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Blood Group
                  </label>
                  <select
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.dob) {
                      setError('Please specify Date of Birth to proceed.');
                      return;
                    }
                    setError(null);
                    setActiveStep(2);
                  }}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span>Next: Medical History</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Lifestyle & Medical History */}
          {activeStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Smoking Status
                  </label>
                  <select
                    name="smoking"
                    value={String(formData.smoking)}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  >
                    <option value="false">Non-Smoker</option>
                    <option value="true">Active Smoker</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Alcohol Consumption
                  </label>
                  <select
                    name="alcohol"
                    value={String(formData.alcohol)}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  >
                    <option value="false">No / Rarely</option>
                    <option value="true">Regular / Moderate</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Previous Surgeries
                  </label>
                  <input
                    type="text"
                    name="previous_surgery"
                    placeholder="e.g. Appendectomy, Knee Arthroscopy, or None"
                    value={formData.previous_surgery}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Current Diagnosed Conditions (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="conditions"
                    placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
                    value={formData.conditions}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Known Allergies (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="allergies"
                    placeholder="e.g. Penicillin, Peanuts, Latex"
                    value={formData.allergies}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.65rem 1.1rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ← Back to Demographics
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span>Next: Baseline Vitals</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Baseline Biomarkers & Vitals */}
          {activeStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>
                Optional: Providing current biomarker measurements helps our AI engine calculate precise trial eligibility scores.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    BP Systolic (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="120"
                    name="bp_systolic"
                    value={formData.bp_systolic}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    BP Diastolic (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="80"
                    name="bp_diastolic"
                    value={formData.bp_diastolic}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="72"
                    name="heart_rate"
                    value={formData.heart_rate}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    BMI (kg/m²)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="23.5"
                    name="bmi"
                    value={formData.bmi}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    HbA1c (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="5.5"
                    name="hba1c"
                    value={formData.hba1c}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Glucose (mg/dL)
                  </label>
                  <input
                    type="number"
                    placeholder="95"
                    name="blood_glucose"
                    value={formData.blood_glucose}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Consent Checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: '#f0fdf4', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid #bbf7d0', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="onboarding-consent"
                  name="consent"
                  required
                  checked={formData.consent}
                  onChange={handleChange}
                  style={{ marginTop: 2 }}
                />
                <label htmlFor="onboarding-consent" style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.4, cursor: 'pointer' }}>
                  I confirm that the clinical information provided is accurate and consent to automated protocol matching under institutional HIPAA and IRB privacy guidelines.
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.65rem 1.1rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ← Back to History
                </button>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        background: 'transparent',
                        color: '#64748b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.65rem 1rem',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Remind Me Later
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                      opacity: submitting ? 0.75 : 1
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{submitting ? 'Saving Clinical Profile...' : 'Save & Match Clinical Trials →'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
