import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  Loader2,
  Check,
  Bot,
  X,
  FileCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CriteriaBadge } from '../../components/common/CriteriaBadge';
import { Modal } from '../../components/common/Modal';
import { trialsApi } from '../../services/api';

export function AITrialBuilderPage({ setActiveTab }) {
  const { createTrial, showToast } = useApp();

  // Wizard Steps: 1: Info, 2: AI Extract, 3: Review/Edit Criteria, 4: Confirm
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 Form Data
  const [trialName, setTrialName] = useState('');
  const [targetRecruitment, setTargetRecruitment] = useState(100);
  const [sourceType, setSourceType] = useState('PDF'); // 'PDF' | 'TEXT'

  // Step 2 Protocol Text / File
  const [protocolText, setProtocolText] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatusText, setExtractionStatusText] = useState('');

  // Step 3 Criteria List (AI-extracted or researcher-customized)
  const [criteriaList, setCriteriaList] = useState([]);

  // Step 4 Saving State
  const [isSaving, setIsSaving] = useState(false);

  // Criterion Add/Edit Modal
  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState(false);
  const [editingCriterionIndex, setEditingCriterionIndex] = useState(null);
  
  // Criterion Form State
  const [field, setField] = useState('age');
  const [customFieldName, setCustomFieldName] = useState('');
  const [dataType, setDataType] = useState('NUMERIC');
  const [classification, setClassification] = useState('HARD');
  const [operator, setOperator] = useState('BETWEEN');
  const [numericMin, setNumericMin] = useState(18);
  const [numericMax, setNumericMax] = useState(75);
  const [numericIdeal, setNumericIdeal] = useState(6.5);
  const [numericTolerance, setNumericTolerance] = useState(1.0);
  const [categoricalIdeal, setCategoricalIdeal] = useState('');
  const [booleanIdeal, setBooleanIdeal] = useState(false);
  const [weight, setWeight] = useState(1.0);

  // File Upload Handlers for Step 2 PDF
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Invalid File Format', 'Please upload a PDF document (.pdf).', 'danger');
        return;
      }
      setPdfFile(file);
    }
  };

  const handleRemoveFile = () => {
    setPdfFile(null);
  };

  // Step 2: Extract Criteria with Backend AI & PDF Services
  const handleExtractWithAI = async () => {
    if (sourceType === 'TEXT' && !protocolText.trim()) {
      showToast('Input Required', 'Please enter or paste the clinical trial protocol text.', 'danger');
      return;
    }
    if (sourceType === 'PDF' && !pdfFile) {
      showToast('File Required', 'Please upload a PDF protocol document.', 'danger');
      return;
    }

    setIsExtracting(true);

    try {
      let rawText = protocolText;

      // 1. If PDF: Extract protocol text using existing backend PDF extraction service
      if (sourceType === 'PDF') {
        setExtractionStatusText('Extracting protocol text from PDF document...');
        const pdfResult = await trialsApi.extractPdfText(pdfFile);
        if (!pdfResult || !pdfResult.text || !pdfResult.text.trim()) {
          throw new Error('Could not extract readable text from the uploaded PDF.');
        }
        rawText = pdfResult.text;
        setProtocolText(rawText);
      }

      // 2. Send protocol text to existing backend LLM service
      setExtractionStatusText('Analyzing protocol & generating eligibility criteria via AI...');
      const extractedCriteria = await trialsApi.createDraft({ text: rawText });

      if (!Array.isArray(extractedCriteria) || extractedCriteria.length === 0) {
        throw new Error('The AI engine did not identify any eligibility criteria from the provided protocol.');
      }

      // Format extracted criteria to ensure consistent fields
      const formatted = extractedCriteria.map((item, idx) => ({
        field: item.field || `criterion_${idx + 1}`,
        data_type: item.data_type || 'NUMERIC',
        classification: item.classification || 'HARD',
        operator: item.operator || (item.data_type === 'NUMERIC' ? (item.classification === 'HARD' ? 'BETWEEN' : 'GAUSSIAN') : 'EQUALS'),
        numeric_min: item.numeric_min !== undefined ? item.numeric_min : null,
        numeric_max: item.numeric_max !== undefined ? item.numeric_max : null,
        numeric_ideal: item.numeric_ideal !== undefined ? item.numeric_ideal : null,
        numeric_tolerance: item.numeric_tolerance !== undefined ? item.numeric_tolerance : null,
        categorical_ideal: item.categorical_ideal || null,
        boolean_ideal: item.boolean_ideal !== undefined ? item.boolean_ideal : null,
        weight: item.weight !== undefined ? item.weight : 1.0,
        importance: item.importance || 1
      }));

      setCriteriaList(formatted);
      setIsExtracting(false);
      setExtractionStatusText('');
      setCurrentStep(3);
      showToast('Criteria Extracted', `Successfully generated ${formatted.length} criteria from protocol.`, 'success');
    } catch (err) {
      console.error('Extraction error:', err);
      setIsExtracting(false);
      setExtractionStatusText('');
      showToast('Extraction Failed', err.message || 'Failed to extract criteria from protocol.', 'danger');
    }
  };

  // Step 3: Add / Edit Criterion Handlers
  const handleOpenAddCriterion = () => {
    setEditingCriterionIndex(null);
    setField('age');
    setCustomFieldName('');
    setDataType('NUMERIC');
    setClassification('HARD');
    setOperator('BETWEEN');
    setNumericMin(18);
    setNumericMax(75);
    setNumericIdeal(6.5);
    setNumericTolerance(1.0);
    setCategoricalIdeal('');
    setBooleanIdeal(false);
    setWeight(1.0);
    setIsCriterionModalOpen(true);
  };

  const handleOpenEditCriterion = (crit, index) => {
    setEditingCriterionIndex(index);
    const standardFields = ['age', 'gender', 'conditions', 'hba1c', 'blood_glucose', 'bmi', 'bp_systolic', 'bp_diastolic', 'cholesterol', 'creatinine', 'alt', 'smoking', 'alcohol'];
    if (standardFields.includes(crit.field)) {
      setField(crit.field);
      setCustomFieldName('');
    } else {
      setField('custom');
      setCustomFieldName(crit.field);
    }
    setDataType(crit.data_type || 'NUMERIC');
    setClassification(crit.classification || 'HARD');
    setOperator(crit.operator || 'BETWEEN');
    setNumericMin(crit.numeric_min ?? 0);
    setNumericMax(crit.numeric_max ?? 100);
    setNumericIdeal(crit.numeric_ideal ?? 0);
    setNumericTolerance(crit.numeric_tolerance ?? 1);
    setCategoricalIdeal(crit.categorical_ideal || '');
    setBooleanIdeal(Boolean(crit.boolean_ideal));
    setWeight(crit.weight ?? 1.0);
    setIsCriterionModalOpen(true);
  };

  const handleSaveCriterion = (e) => {
    e.preventDefault();
    const effectiveField = field === 'custom' ? (customFieldName.trim() || 'custom_field') : field;

    const newCrit = {
      field: effectiveField,
      data_type: dataType,
      classification,
      operator,
      weight: classification === 'SOFT' ? (Number(weight) || 1.0) : null,
      importance: 1,
      numeric_min: (dataType === 'NUMERIC' && classification === 'HARD') ? Number(numericMin) : null,
      numeric_max: (dataType === 'NUMERIC' && classification === 'HARD') ? Number(numericMax) : null,
      numeric_ideal: (dataType === 'NUMERIC' && classification === 'SOFT') ? Number(numericIdeal) : null,
      numeric_tolerance: (dataType === 'NUMERIC' && classification === 'SOFT') ? Number(numericTolerance) : null,
      categorical_ideal: dataType === 'CATEGORICAL' ? String(categoricalIdeal).trim() : null,
      boolean_ideal: dataType === 'BOOLEAN' ? Boolean(booleanIdeal) : null
    };

    if (editingCriterionIndex !== null) {
      setCriteriaList(prev => prev.map((c, i) => i === editingCriterionIndex ? newCrit : c));
    } else {
      setCriteriaList(prev => [...prev, newCrit]);
    }
    setIsCriterionModalOpen(false);
  };

  const handleDeleteCriterion = (index) => {
    setCriteriaList(prev => prev.filter((_, i) => i !== index));
  };

  // Step 4: Confirm and Commit Trial to Database
  const handleConfirmAndLaunch = async () => {
    if (!trialName.trim()) {
      showToast('Validation Error', 'Trial name is required.', 'danger');
      return;
    }
    if (criteriaList.length === 0) {
      showToast('Validation Error', 'Please define at least one eligibility criterion before launching.', 'danger');
      return;
    }

    setIsSaving(true);
    try {
      const trialData = {
        trial_name: trialName.trim(),
        description: `${sourceType === 'PDF' ? 'PDF Protocol' : 'Text Protocol'}: ${trialName.trim()}`,
        target_recruitment: Number(targetRecruitment) || 100,
        source_type: sourceType,
        original_text: protocolText || ''
      };

      const created = await createTrial(trialData, criteriaList);

      if (created && created.trial_id) {
        setActiveTab('trial-detail', { trialId: created.trial_id });
      } else {
        setActiveTab('trial-detail');
      }
    } catch (err) {
      console.error('Failed to create trial:', err);
      showToast('Save Failed', err.message || 'Failed to save trial to database.', 'danger');
      setIsSaving(false);
    }
  };

  // Counts for Step 4
  const hardCriteriaCount = criteriaList.filter(c => c.classification === 'HARD').length;
  const softCriteriaCount = criteriaList.filter(c => c.classification === 'SOFT').length;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Wizard Header & Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7', fontWeight: 700, fontSize: '0.84rem' }}>
            <Bot size={18} />
            <span>CLINICAL TRIAL CREATION FLOW</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--slate-900)', marginTop: 2 }}>
            Create Clinical Trial Study
          </h2>
        </div>

        {/* Stepper Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {[
            { num: 1, label: 'Study Info' },
            { num: 2, label: 'AI Extract' },
            { num: 3, label: 'Review Criteria' },
            { num: 4, label: 'Confirm' }
          ].map((s, idx) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: currentStep === s.num ? '#0284c7' : currentStep > s.num ? '#ecfdf5' : 'var(--bg-subtle)',
                  color: currentStep === s.num ? '#ffffff' : currentStep > s.num ? '#065f46' : 'var(--slate-500)',
                  border: `1px solid ${currentStep === s.num ? '#0284c7' : currentStep > s.num ? '#a7f3d0' : 'var(--border-subtle)'}`,
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}
              >
                {currentStep > s.num ? <Check size={12} /> : <span>{s.num}</span>}
                <span>{s.label}</span>
              </div>
              {idx < 3 && <div style={{ width: 12, height: 1, background: 'var(--slate-300)' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Trial Information */}
      {currentStep === 1 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--slate-900)' }}>
                Step 1: Trial Information
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                Specify the protocol metadata and choose your source ingestion method.
              </p>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label form-label-req">Study / Protocol Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Type 2 Diabetes Glycemic Control Study (GLYCO-NEXT)"
                value={trialName}
                onChange={(e) => setTrialName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label form-label-req">Recruitment Target (Patients)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="10000"
                  value={targetRecruitment}
                  onChange={(e) => setTargetRecruitment(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-req">Source Ingestion Type</label>
                <select
                  className="form-select"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                >
                  <option value="PDF">PDF Protocol Document</option>
                  <option value="TEXT">Clinical Trial Text Extract</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!trialName.trim()) {
                  showToast('Required Field', 'Please provide a study/protocol name.', 'danger');
                  return;
                }
                if (!targetRecruitment || Number(targetRecruitment) < 1) {
                  showToast('Required Field', 'Please provide a valid recruitment target.', 'danger');
                  return;
                }
                setCurrentStep(2);
              }}
            >
              <span>Continue to AI Protocol Ingestion</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: AI Protocol Extraction */}
      {currentStep === 2 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--slate-900)' }}>
                Step 2: AI Protocol Extraction
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                {sourceType === 'PDF'
                  ? 'Upload the clinical trial PDF document to extract protocol text and generate eligibility criteria.'
                  : 'Paste the clinical trial protocol text to generate eligibility criteria rules.'}
              </p>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Input Based on Step 1 Selection */}
            {sourceType === 'TEXT' ? (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="form-label form-label-req" style={{ marginBottom: 0 }}>
                    Clinical Trial Protocol Text
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                    {protocolText.length} characters
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  rows={10}
                  placeholder="Paste trial inclusion and exclusion criteria paragraphs here (e.g. Patient age, conditions, HbA1c thresholds, laboratory limits)..."
                  value={protocolText}
                  onChange={(e) => setProtocolText(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem', lineHeight: 1.55 }}
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label form-label-req">PDF Protocol Document</label>
                
                {!pdfFile ? (
                  <label
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '2.5rem 1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      background: 'var(--bg-subtle)',
                      transition: 'border-color 0.2s ease'
                    }}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                      <Upload size={24} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.92rem' }}>
                        Click to upload or drag & drop protocol PDF
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 2 }}>
                        PDF format only (Max 25MB)
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  <div
                    style={{
                      border: '1px solid #bae6fd',
                      background: '#f0f9ff',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--slate-900)' }}>
                          {pdfFile.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                          {(pdfFile.size / 1024).toFixed(1)} KB • PDF Protocol Document
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={handleRemoveFile}
                      style={{ color: 'var(--danger-solid)' }}
                      title="Remove PDF"
                    >
                      <X size={16} />
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AI Extraction State Indicator */}
            {isExtracting && (
              <div
                style={{
                  background: 'var(--primary-50)',
                  border: '1px solid var(--primary-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Loader2 size={22} color="#0284c7" className="animate-pulse" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0369a1' }}>
                      AI Criteria Extraction Engine Active
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>
                      {extractionStatusText || 'Extracting and parsing protocol criteria...'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentStep(1)} disabled={isExtracting}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={handleExtractWithAI}
              disabled={isExtracting || (sourceType === 'TEXT' ? !protocolText.trim() : !pdfFile)}
            >
              {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{isExtracting ? 'Extracting Criteria...' : 'Generate Criteria with AI'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Edit Criteria */}
      {currentStep === 3 && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--slate-900)' }}>
                Step 3: Review & Edit Criteria
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                {criteriaList.length} criteria defined. You are the final authority: adjust values, classifications, or add custom rules.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleOpenAddCriterion}>
              <Plus size={14} />
              <span>Add Custom Criterion</span>
            </button>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {criteriaList.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--slate-500)'
                }}
              >
                <ShieldAlert size={28} style={{ margin: '0 auto 0.5rem', color: 'var(--slate-400)' }} />
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--slate-700)' }}>No Criteria Extracted</div>
                <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
                  Go back to Step 2 to generate criteria from your protocol or click "Add Custom Criterion" above.
                </div>
              </div>
            ) : (
              criteriaList.map((crit, idx) => (
                <CriteriaBadge
                  key={idx}
                  criterion={crit}
                  editable={true}
                  onEdit={() => handleOpenEditCriterion(crit, idx)}
                  onDelete={() => handleDeleteCriterion(idx)}
                />
              ))
            )}
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
              <ArrowLeft size={16} />
              <span>Back to Protocol Input</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (criteriaList.length === 0) {
                  showToast('Validation Error', 'Please define at least one criterion before proceeding.', 'danger');
                  return;
                }
                setCurrentStep(4);
              }}
              disabled={criteriaList.length === 0}
            >
              <span>Review Summary & Confirm</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review Summary & Confirm */}
      {currentStep === 4 && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--slate-900)' }}>
                Step 4: Review Summary & Confirm
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                Review final study details and edited criteria before committing to live database.
              </p>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Metadata Summary Card */}
            <div style={{ background: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)' }}>{trialName}</h4>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', background: '#e0f2fe', color: '#0369a1' }}>
                  {sourceType === 'PDF' ? 'PDF Protocol Document' : 'Clinical Trial Text Extract'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2rem', marginTop: '1rem', fontSize: '0.84rem', color: 'var(--slate-700)' }}>
                <div>Recruitment Target: <strong>{targetRecruitment} patients</strong></div>
                <div>Configured Criteria: <strong>{criteriaList.length} total</strong> ({hardCriteriaCount} HARD gate, {softCriteriaCount} SOFT preference)</div>
                <div>Initial Status: <strong>OPEN</strong></div>
              </div>
            </div>

            {/* Criteria Review */}
            <div>
              <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.75rem' }}>
                Final Edited Eligibility Criteria ({criteriaList.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {criteriaList.map((crit, idx) => (
                  <CriteriaBadge key={idx} criterion={crit} editable={false} />
                ))}
              </div>
            </div>
          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentStep(3)} disabled={isSaving}>
              <ArrowLeft size={16} />
              <span>Back to Edit</span>
            </button>
            <button className="btn btn-success btn-lg" onClick={handleConfirmAndLaunch} disabled={isSaving || criteriaList.length === 0}>
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              <span>{isSaving ? 'Saving Trial to Database...' : 'Confirm Criteria & Launch Study'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Criterion Modal */}
      {isCriterionModalOpen && (
        <Modal
          isOpen={isCriterionModalOpen}
          onClose={() => setIsCriterionModalOpen(false)}
          title={editingCriterionIndex !== null ? 'Edit Criterion' : 'Add New Eligibility Criterion'}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
              <button className="btn btn-secondary" onClick={() => setIsCriterionModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveCriterion}>
                Save Criterion
              </button>
            </div>
          }
        >
          <form onSubmit={handleSaveCriterion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label form-label-req">Field</label>
                <select
                  className="form-select"
                  value={field}
                  onChange={(e) => {
                    setField(e.target.value);
                    if (e.target.value === 'gender' || e.target.value === 'conditions') {
                      setDataType('CATEGORICAL');
                    } else if (e.target.value === 'smoking' || e.target.value === 'alcohol') {
                      setDataType('BOOLEAN');
                    } else if (e.target.value !== 'custom') {
                      setDataType('NUMERIC');
                    }
                  }}
                >
                  <option value="age">Age</option>
                  <option value="gender">Gender</option>
                  <option value="conditions">Conditions / Diagnosis</option>
                  <option value="hba1c">HbA1c</option>
                  <option value="blood_glucose">Fasting Blood Glucose</option>
                  <option value="bmi">Body Mass Index (BMI)</option>
                  <option value="bp_systolic">BP Systolic</option>
                  <option value="bp_diastolic">BP Diastolic</option>
                  <option value="cholesterol">Total Cholesterol</option>
                  <option value="creatinine">Serum Creatinine</option>
                  <option value="alt">ALT Liver Enzyme</option>
                  <option value="smoking">Smoking Status</option>
                  <option value="alcohol">Alcohol Consumption</option>
                  <option value="custom">Custom Field Name...</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label form-label-req">Data Type</label>
                <select className="form-select" value={dataType} onChange={(e) => setDataType(e.target.value)}>
                  <option value="NUMERIC">NUMERIC</option>
                  <option value="CATEGORICAL">CATEGORICAL</option>
                  <option value="BOOLEAN">BOOLEAN</option>
                </select>
              </div>
            </div>

            {field === 'custom' && (
              <div className="form-group">
                <label className="form-label form-label-req">Custom Field Identifier</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. egfr, platelet_count, oxygen_saturation"
                  value={customFieldName}
                  onChange={(e) => setCustomFieldName(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label form-label-req">Classification</label>
                <select className="form-select" value={classification} onChange={(e) => setClassification(e.target.value)}>
                  <option value="HARD">HARD (Mandatory Gate)</option>
                  <option value="SOFT">SOFT (Scoring Preference)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label form-label-req">Operator</label>
                <select className="form-select" value={operator} onChange={(e) => setOperator(e.target.value)}>
                  {dataType === 'NUMERIC' && classification === 'HARD' && (
                    <>
                      <option value="BETWEEN">BETWEEN (Min - Max)</option>
                      <option value="<=">&lt;= (Less than or equal)</option>
                      <option value=">=">&gt;= (Greater than or equal)</option>
                    </>
                  )}
                  {dataType === 'NUMERIC' && classification === 'SOFT' && (
                    <>
                      <option value="GAUSSIAN">GAUSSIAN (Ideal ± Tolerance)</option>
                    </>
                  )}
                  {dataType === 'CATEGORICAL' && (
                    <>
                      <option value="EQUALS">EQUALS (Exact match)</option>
                      <option value="INCLUDES">INCLUDES (Subset match)</option>
                      <option value="NOT_EQUALS">NOT_EQUALS (Exclusion)</option>
                    </>
                  )}
                  {dataType === 'BOOLEAN' && (
                    <>
                      <option value="EQUALS">EQUALS (Match boolean)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* NUMERIC HARD bounds */}
            {dataType === 'NUMERIC' && classification === 'HARD' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label form-label-req">Numeric Min</label>
                  <input type="number" step="any" className="form-input" value={numericMin} onChange={(e) => setNumericMin(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-req">Numeric Max</label>
                  <input type="number" step="any" className="form-input" value={numericMax} onChange={(e) => setNumericMax(e.target.value)} required />
                </div>
              </div>
            )}

            {/* NUMERIC SOFT Gaussian bounds */}
            {dataType === 'NUMERIC' && classification === 'SOFT' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label form-label-req">Numeric Ideal</label>
                  <input type="number" step="any" className="form-input" value={numericIdeal} onChange={(e) => setNumericIdeal(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-req">Numeric Tolerance</label>
                  <input type="number" step="any" className="form-input" value={numericTolerance} onChange={(e) => setNumericTolerance(e.target.value)} required />
                </div>
              </div>
            )}

            {/* CATEGORICAL Value */}
            {dataType === 'CATEGORICAL' && (
              <div className="form-group">
                <label className="form-label form-label-req">Categorical Value / Required Match</label>
                <input type="text" className="form-input" value={categoricalIdeal} onChange={(e) => setCategoricalIdeal(e.target.value)} placeholder="e.g. Type 2 Diabetes" required />
              </div>
            )}

            {/* BOOLEAN Value */}
            {dataType === 'BOOLEAN' && (
              <div className="form-group">
                <label className="form-label form-label-req">Boolean Value</label>
                <select className="form-select" value={booleanIdeal ? 'true' : 'false'} onChange={(e) => setBooleanIdeal(e.target.value === 'true')}>
                  <option value="false">False / No</option>
                  <option value="true">True / Yes</option>
                </select>
              </div>
            )}

            {/* Weight */}
            {classification === 'SOFT' && (
              <div className="form-group">
                <label className="form-label">Scoring Weight (0.1 - 5.0)</label>
                <input type="number" step="0.1" min="0.1" max="5.0" className="form-input" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
