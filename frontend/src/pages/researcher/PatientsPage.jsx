import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Upload,
  Heart,
  Activity,
  Calendar,
  Phone,
  MapPin,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';
import { patientsApi } from '../../services/api';

export function PatientsPage({ onSelectPatient }) {
  const { patients, setPatients, registerPatient, showToast, refreshPatients } = useApp();

  useEffect(() => {
    if (refreshPatients) {
      refreshPatients();
    }
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // New Patient Form
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Female');
  const [dob, setDob] = useState('1992-05-14');
  const [location, setLocation] = useState('Boston, MA');
  const [phone, setPhone] = useState('+1 (555) 000-0000');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [conditionInput, setConditionInput] = useState('Type 2 Diabetes');
  const [allergyInput, setAllergyInput] = useState('');
  const [previousSurgery, setPreviousSurgery] = useState('');
  const [smoking, setSmoking] = useState(false);
  const [alcohol, setAlcohol] = useState(false);
  const [consent, setConsent] = useState(true);

  // Initial Vitals Form
  const [bpSystolic, setBpSystolic] = useState(120);
  const [bpDiastolic, setBpDiastolic] = useState(80);
  const [heartRate, setHeartRate] = useState(72);
  const [hba1c, setHba1c] = useState(6.5);
  const [bmi, setBmi] = useState(26.0);
  const [bloodGlucose, setBloodGlucose] = useState(120);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Validation Error', 'Patient name is mandatory.', 'danger');
      return;
    }
    if (!consent) {
      showToast('Mandatory Consent', 'Patient consent is strictly required for clinical registry.', 'danger');
      return;
    }

    const newPat = await registerPatient({
      name,
      gender,
      dob,
      location,
      phone,
      blood_group: bloodGroup,
      previous_surgery: previousSurgery || null,
      smoking,
      alcohol,
      consent,
      conditions: conditionInput.trim() ? conditionInput.split(',').map(c => c.trim()) : [],
      allergies: allergyInput.trim() ? allergyInput.split(',').map(a => a.trim()) : [],
      vitals: {
        bp_systolic: Number(bpSystolic),
        bp_diastolic: Number(bpDiastolic),
        heart_rate: Number(heartRate),
        hba1c: Number(hba1c),
        bmi: Number(bmi),
        blood_glucose: Number(bloodGlucose)
      }
    });

    setIsRegisterOpen(false);
    if (newPat && onSelectPatient) {
      onSelectPatient(newPat.patient_id);
    }
  };

  const handleBatchUpload = async () => {
    if (!selectedFile) {
      showToast('No File Selected', 'Please select an Excel or CSV dataset file (.xlsx, .csv).', 'warning');
      return;
    }
    setIsUploading(true);
    try {
      const res = await patientsApi.batchUpload(selectedFile);
      if (res) {
        showToast('Batch Upload Success', `Ingestion complete: ${res.inserted || 0} inserted, ${res.duplicates_flagged || 0} duplicates flagged.`, 'success');
        const fresh = await patientsApi.getPatients();
        if (Array.isArray(fresh)) setPatients(fresh);
        setIsBatchOpen(false);
        setSelectedFile(null);
      }
    } catch (e) {
      showToast('Batch Upload Note', e.message || 'Batch upload processed.', 'info');
      setIsBatchOpen(false);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            Patient Clinical Registry
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)' }}>
            Institutional repository of {patients.length} consented participants and longitudinal biomarker snapshots.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setIsBatchOpen(true)}>
            <Upload size={16} />
            <span>Batch Excel Ingest</span>
          </button>
          <button className="btn btn-primary" onClick={() => setIsRegisterOpen(true)}>
            <UserPlus size={16} />
            <span>Register New Patient</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <Search size={18} color="var(--slate-400)" />
        <input
          type="text"
          placeholder="Search by patient name, ID, or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.88rem' }}
        />
      </div>

      {/* Patients Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {filteredPatients.map((p) => {
          const latestVitals = p.vitals && p.vitals.length > 0 ? p.vitals[0] : null;

          return (
            <div
              key={p.patient_id}
              className="card card-hoverable"
              onClick={() => onSelectPatient && onSelectPatient(p.patient_id)}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#0284c7' }}>
                      {p.patient_id}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                      {p.name}
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 4,
                      background: p.consent ? '#ecfdf5' : '#fff1f2',
                      color: p.consent ? '#065f46' : '#9f1239'
                    }}
                  >
                    {p.consent ? 'Consented' : 'No Consent'}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div>Gender: <strong>{p.gender}</strong> • Blood: <strong>{p.blood_group}</strong></div>
                  <div>DOB: {p.dob} • Location: {p.location}</div>
                  {p.active_trial_id && (
                    <div style={{ color: '#0284c7', fontWeight: 600 }}>
                      Enrolled in Trial: {p.active_trial_id}
                    </div>
                  )}
                </div>

                {/* Vitals Snapshot */}
                {latestVitals && (
                  <div style={{ background: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.75rem', textAlign: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--slate-500)' }}>BP</div>
                      <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{latestVitals.bp_systolic}/{latestVitals.bp_diastolic}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--slate-500)' }}>HbA1c</div>
                      <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{latestVitals.hba1c || 'N/A'}%</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--slate-500)' }}>BMI</div>
                      <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{latestVitals.bmi || 'N/A'}</div>
                    </div>
                  </div>
                )}

                {/* Conditions Tags */}
                {p.conditions && p.conditions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {p.conditions.map((c, i) => (
                      <span key={i} style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1e40af', padding: '0.1rem 0.45rem', borderRadius: 4, fontWeight: 600 }}>
                        {c.condition_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  Registered {formatDate(p.created_at)}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  View Profile <ArrowRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Register Patient Modal */}
      {isRegisterOpen && (
        <Modal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          size="lg"
          title="Register New Patient in Clinical Registry"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
              <button className="btn btn-secondary" onClick={() => setIsRegisterOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRegister}>Register Patient</button>
            </div>
          }
        >
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label form-label-req">Full Name</label>
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-select" value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label form-label-req">Date of Birth</label>
                <input type="date" className="form-input" value={dob} onChange={e => setDob(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Location / City</label>
                <input type="text" className="form-input" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input type="text" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-select" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Diagnosed Conditions (comma separated)</label>
                <input type="text" className="form-input" placeholder="e.g. Type 2 Diabetes, Hypertension" value={conditionInput} onChange={e => setConditionInput(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Known Allergies (comma separated)</label>
                <input type="text" className="form-input" placeholder="e.g. Penicillin, Latex" value={allergyInput} onChange={e => setAllergyInput(e.target.value)} />
              </div>
            </div>

            {/* Baseline Vitals */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--slate-800)', marginBottom: '0.75rem' }}>
                Baseline Clinical Vitals Snapshot
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">BP Systolic</label>
                  <input type="number" className="form-input" value={bpSystolic} onChange={e => setBpSystolic(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">BP Diastolic</label>
                  <input type="number" className="form-input" value={bpDiastolic} onChange={e => setBpDiastolic(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Heart Rate (bpm)</label>
                  <input type="number" className="form-input" value={heartRate} onChange={e => setHeartRate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">HbA1c (%)</label>
                  <input type="number" step="0.1" className="form-input" value={hba1c} onChange={e => setHba1c(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">BMI</label>
                  <input type="number" step="0.1" className="form-input" value={bmi} onChange={e => setBmi(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Blood Glucose (mg/dL)</label>
                  <input type="number" className="form-input" value={bloodGlucose} onChange={e => setBloodGlucose(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Mandatory Consent Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input type="checkbox" id="consentCheck" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ width: 16, height: 16 }} />
              <label htmlFor="consentCheck" style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                Patient has provided signed clinical trial registry consent (Mandatory).
              </label>
            </div>
          </form>
        </Modal>
      )}

      {/* Batch Upload Modal */}
      {isBatchOpen && (
        <Modal
          isOpen={isBatchOpen}
          onClose={() => setIsBatchOpen(false)}
          title="Batch Patient Ingestion (Excel / CSV)"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
              <button className="btn btn-secondary" onClick={() => setIsBatchOpen(false)} disabled={isUploading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBatchUpload} disabled={isUploading || !selectedFile}>
                {isUploading ? 'Ingesting Dataset...' : 'Ingest Dataset'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label
              htmlFor="batchFileInput"
              style={{
                border: '2px dashed var(--slate-300)',
                padding: '2.5rem 1rem',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                background: selectedFile ? '#f0f9ff' : '#ffffff'
              }}
            >
              <FileSpreadsheet size={36} color="#0284c7" />
              <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
                {selectedFile ? selectedFile.name : 'Select or Drop Patient Roster (.xlsx, .xls, .csv)'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB — Ready to Ingest` : 'Supports automatic duplicate detection and vitals snapshot parsing.'}
              </div>
              <input
                id="batchFileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
