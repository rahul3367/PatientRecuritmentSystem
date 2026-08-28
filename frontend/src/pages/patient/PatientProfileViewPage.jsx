import React, { useState, useEffect } from 'react';
import { User, Activity, Heart, Calendar, Phone, MapPin, CheckCircle2, ShieldCheck, Edit3, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { patientsApi } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { PatientOnboardingModal } from '../../components/patient/PatientOnboardingModal';

export function PatientProfileViewPage() {
  const { patients, currentPatientId, setPatients } = useApp();
  const { profile } = useAuth();

  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await patientsApi.getMyPatientProfile();
      if (data && data.patient_id) {
        setPatientData(data);
        setPatients([data]);
      } else {
        const fallback = profile || patients.find(p => p.patient_id === currentPatientId) || patients[0] || null;
        setPatientData(fallback);
      }
    } catch (e) {
      console.warn('Failed to load my patient profile:', e);
      const fallback = profile || patients.find(p => p.patient_id === currentPatientId) || patients[0] || null;
      setPatientData(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [profile, currentPatientId]);

  const handleEditComplete = (updated) => {
    setPatientData(updated);
    setPatients([updated]);
    setIsEditModalOpen(false);
    loadProfile();
  };

  const patient = patientData || profile || patients.find(p => p.patient_id === currentPatientId) || patients[0] || null;

  if (!patient) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
          <User size={36} style={{ margin: '0 auto 1rem', color: 'var(--slate-400)' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--slate-800)', fontWeight: 700 }}>No Patient Profile Found</h3>
          <p style={{ fontSize: '0.86rem', marginTop: 4 }}>Please log in with a valid clinical participant account.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            My Health Profile
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Your clinical health parameters and verified biomarker history stored in PostgreSQL for trial qualification.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsEditModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Edit3 size={16} />
          <span>Edit Health Profile</span>
        </button>
      </div>

      {/* Demographics Card */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.3rem' }}>
            {patient.name?.charAt(0)}
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--slate-900)' }}>{patient.name}</h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginTop: 2 }}>
              Patient ID: <strong>{patient.patient_id}</strong> • DOB: {patient.dob} • Gender: {patient.gender}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>Location</div>
            <div style={{ fontWeight: 600, color: 'var(--slate-800)', marginTop: 2 }}>{patient.location || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>Phone</div>
            <div style={{ fontWeight: 600, color: 'var(--slate-800)', marginTop: 2 }}>{patient.phone || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>Blood Group</div>
            <div style={{ fontWeight: 600, color: 'var(--slate-800)', marginTop: 2 }}>{patient.blood_group || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>Registry Consent</div>
            <div style={{ fontWeight: 600, color: patient.consent ? '#059669' : '#e11d48', marginTop: 2 }}>
              {patient.consent ? '✓ Verified & Signed' : 'Consent Pending'}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Lifestyle & Conditions */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Lifestyle & Clinical History */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--slate-900)' }}>
              Lifestyle & Medical History
            </h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.86rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
              <span style={{ color: 'var(--slate-500)' }}>Smoking Status</span>
              <strong>{patient.smoking ? 'Active Smoker' : 'Non-Smoker'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
              <span style={{ color: 'var(--slate-500)' }}>Alcohol Consumption</span>
              <strong>{patient.alcohol ? 'Yes / Regular' : 'No / Rarely'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
              <span style={{ color: 'var(--slate-500)' }}>Previous Surgeries</span>
              <strong>{patient.previous_surgery || 'None Reported'}</strong>
            </div>
          </div>
        </div>

        {/* Diagnoses & Allergies */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--slate-900)' }}>
              Conditions & Allergies
            </h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.86rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Active Chronic Diagnoses
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {patient.conditions && patient.conditions.length > 0 ? (
                  patient.conditions.map((c, i) => (
                    <span key={i} style={{ background: '#eff6ff', color: '#1e40af', padding: '0.25rem 0.6rem', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem' }}>
                      {c.condition_name}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--slate-400)' }}>No active diagnoses documented</span>
                )}
              </div>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Documented Allergies
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {patient.allergies && patient.allergies.length > 0 ? (
                  patient.allergies.map((a, i) => (
                    <span key={i} style={{ background: '#fff1f2', color: '#9f1239', padding: '0.25rem 0.6rem', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem' }}>
                      {a.allergen}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--slate-400)' }}>No allergies recorded</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vitals History Table */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
            Biomarker & Vitals History
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date Recorded</th>
                <th>Blood Pressure</th>
                <th>Heart Rate</th>
                <th>HbA1c</th>
                <th>BMI</th>
                <th>Fasting Glucose</th>
              </tr>
            </thead>
            <tbody>
              {patient.vitals && patient.vitals.length > 0 ? (
                patient.vitals.map((v) => (
                  <tr key={v.vitals_id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                      {formatDate(v.recorded_at)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{v.bp_systolic}/{v.bp_diastolic} mmHg</td>
                    <td style={{ fontWeight: 600 }}>{v.heart_rate} bpm</td>
                    <td style={{ fontWeight: 600 }}>{v.hba1c}%</td>
                    <td style={{ fontWeight: 600 }}>{v.bmi}</td>
                    <td style={{ fontWeight: 600 }}>{v.blood_glucose || '—'} mg/dL</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-400)' }}>
                    No vitals snapshots recorded yet. Click "Edit Health Profile" to add baseline measurements.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Health Profile Modal */}
      <PatientOnboardingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onComplete={handleEditComplete}
        initialProfile={patient}
      />
    </div>
  );
}

