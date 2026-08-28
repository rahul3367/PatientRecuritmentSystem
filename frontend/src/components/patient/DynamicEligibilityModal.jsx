import React, { useState, useEffect } from 'react';
import { trialsApi, matchingApi, enrollmentsApi, patientsApi } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { calculateAge } from '../../utils/ageCalculator';

export function DynamicEligibilityModal({ trial, isOpen, onClose, onApplied, onNavigateToEnrollment }) {
  if (!isOpen || !trial) return null;

  const { refreshEnrollments } = useApp();
  const [criteria, setCriteria] = useState([]);
  const [patientData, setPatientData] = useState(null);
  const [formInputs, setFormInputs] = useState({});
  const [autoFilledFields, setAutoFilledFields] = useState({});
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Load Criteria and Patient Profile
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      setResult(null);
      setAppliedSuccess(false);

      try {
        const [criteriaList, myProfile] = await Promise.all([
          trialsApi.getTrialCriteria(trial.trial_id),
          patientsApi.getMyPatientProfile()
        ]);

        if (!isMounted) return;

        const effectiveCriteria = (criteriaList && criteriaList.length > 0)
          ? criteriaList
          : (trial.criteria || []);

        setCriteria(effectiveCriteria);
        setPatientData(myProfile);

        // Prepopulate known profile fields
        const initialValues = {};
        const autoFilled = {};

        if (myProfile) {
          const patientAge = myProfile.dob ? calculateAge(myProfile.dob) : null;
          const latestVitals = (myProfile.vitals && myProfile.vitals.length > 0)
            ? myProfile.vitals[myProfile.vitals.length - 1]
            : {};
          const conditionsList = (myProfile.conditions || []).map(c => c.condition_name.toLowerCase());
          const allergiesList = (myProfile.allergies || []).map(a => a.allergen.toLowerCase());

          effectiveCriteria.forEach(crit => {
            const field = crit.field.toLowerCase();

            if (field === 'age' && patientAge !== null) {
              initialValues[crit.field] = patientAge;
              autoFilled[crit.field] = true;
            } else if (field === 'gender' && myProfile.gender) {
              initialValues[crit.field] = myProfile.gender;
              autoFilled[crit.field] = true;
            } else if (field === 'smoking' && myProfile.smoking !== null && myProfile.smoking !== undefined) {
              initialValues[crit.field] = myProfile.smoking;
              autoFilled[crit.field] = true;
            } else if (field === 'alcohol' && myProfile.alcohol !== null && myProfile.alcohol !== undefined) {
              initialValues[crit.field] = myProfile.alcohol;
              autoFilled[crit.field] = true;
            } else if (field === 'blood_group' && myProfile.blood_group) {
              initialValues[crit.field] = myProfile.blood_group;
              autoFilled[crit.field] = true;
            } else if (field === 'previous_surgery' && myProfile.previous_surgery) {
              initialValues[crit.field] = myProfile.previous_surgery;
              autoFilled[crit.field] = true;
            } else if (latestVitals[field] !== undefined && latestVitals[field] !== null) {
              initialValues[crit.field] = latestVitals[field];
              autoFilled[crit.field] = true;
            } else if (field === 'conditions' || field === 'condition') {
              if (crit.categorical_ideal) {
                const hasCond = conditionsList.some(c => c.includes(crit.categorical_ideal.toLowerCase()));
                if (hasCond) {
                  initialValues[crit.field] = crit.categorical_ideal;
                  autoFilled[crit.field] = true;
                }
              }
            } else if (field === 'allergies' || field === 'allergy') {
              if (crit.categorical_ideal) {
                const hasAllergy = allergiesList.some(a => a.includes(crit.categorical_ideal.toLowerCase()));
                if (hasAllergy) {
                  initialValues[crit.field] = crit.categorical_ideal;
                  autoFilled[crit.field] = true;
                }
              }
            }
          });
        }

        setFormInputs(initialValues);
        setAutoFilledFields(autoFilled);
      } catch (err) {
        if (isMounted) setError('Failed to load trial eligibility requirements.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [trial]);

  const handleInputChange = (field, value, type) => {
    let parsedVal = value;
    if (type === 'NUMERIC') {
      parsedVal = value === '' ? '' : Number(value);
    } else if (type === 'BOOLEAN') {
      parsedVal = value === 'true' ? true : (value === 'false' ? false : value);
    }

    setFormInputs(prev => ({
      ...prev,
      [field]: parsedVal
    }));
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate mandatory required/HARD criteria
    for (const crit of criteria) {
      if (crit.classification === 'HARD') {
        const val = formInputs[crit.field];
        if (val === undefined || val === null || val === '') {
          setError(`Please fill in the required field: ${formatFieldName(crit.field)}`);
          return;
        }
      }
    }

    setEvaluating(true);
    try {
      const evalResult = await matchingApi.checkTrialEligibility(trial.trial_id, formInputs);
      setResult(evalResult);
    } catch (err) {
      setError(err.message || 'Error evaluating eligibility. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    try {
      await enrollmentsApi.applyToTrial(trial.trial_id, "Candidate self-applied after passing eligibility check");
      if (refreshEnrollments) {
        await refreshEnrollments();
      }
      setAppliedSuccess(true);
      if (onApplied) onApplied(trial.trial_id);
    } catch (err) {
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const formatFieldName = (field) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}>
      <div className="modal-content" style={{
        background: '#1e293b',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '16px',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: '#f8fafc',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'inline-block', fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Study ID: {trial.trial_id}
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              Check Eligibility: {trial.trial_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '1.25rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{
              width: 32, height: 32,
              border: '3px solid rgba(255,255,255,0.2)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              margin: '0 auto 1rem',
              animation: 'spin 0.8s linear infinite'
            }} />
            Loading trial eligibility requirements & auto-filling profile data...
          </div>
        ) : (
          <div>
            {/* If Evaluation Result is Present */}
            {result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Result Summary Banner */}
                <div style={{
                  background: !result.eligible
                    ? 'rgba(239, 68, 68, 0.12)'
                    : result.verdict === 'APPROVED'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(56, 189, 248, 0.12)',
                  border: `1px solid ${!result.eligible ? '#ef4444' : result.verdict === 'APPROVED' ? '#10b981' : '#38bdf8'}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>
                    {!result.eligible ? '❌' : result.verdict === 'APPROVED' ? '✅' : '🔍'}
                  </div>
                  <h3 style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    margin: '0 0 0.4rem',
                    color: !result.eligible ? '#f87171' : result.verdict === 'APPROVED' ? '#34d399' : '#38bdf8'
                  }}>
                    {!result.eligible
                      ? 'Not Currently Eligible'
                      : result.verdict === 'APPROVED'
                      ? 'Eligible for Study'
                      : 'Conditionally Eligible (Review Required)'}
                  </h3>
                  <div style={{ fontSize: '0.9rem', color: '#e2e8f0', marginBottom: '1rem', maxWidth: '520px', margin: '0 auto 1rem' }}>
                    {result.message}
                  </div>

                  {/* Match Score Bar */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '400px', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>Overall Match Score</span>
                      <span style={{
                        color: result.match_percentage >= 90 ? '#34d399' : result.match_percentage >= 50 ? '#38bdf8' : '#f87171',
                        fontWeight: 700,
                        fontSize: '1.1rem'
                      }}>
                        {result.match_percentage}%
                      </span>
                    </div>
                    {/* Progress Track */}
                    <div style={{ width: '100%', maxWidth: '400px', height: '10px', background: '#334155', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.max(0, Math.min(100, result.match_percentage))}%`,
                        height: '100%',
                        background: result.match_percentage >= 90
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : result.match_percentage >= 50
                          ? 'linear-gradient(90deg, #0284c7, #38bdf8)'
                          : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                        transition: 'width 0.6s ease'
                      }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Eligibility Status: <strong style={{ color: !result.eligible ? '#f87171' : result.verdict === 'APPROVED' ? '#34d399' : '#38bdf8' }}>{result.verdict}</strong> · {
                        result.eligible
                          ? (result.verdict === 'APPROVED' ? 'Meets all mandatory criteria with high preference alignment' : 'Passed mandatory gates; secondary preferences will be reviewed by clinical staff')
                          : 'Failed one or more mandatory HARD eligibility criteria'
                      }
                    </div>
                  </div>
                </div>

                {/* Criteria Assessment Breakdown */}
                {result.criteria_snapshot?.explanations && result.criteria_snapshot.explanations.length > 0 && (
                  <div style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '1rem',
                    maxHeight: '220px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                      Criteria Evaluation Breakdown
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {result.criteria_snapshot.explanations.map((exp, idx) => {
                        const isHard = exp.type === 'HARD';
                        const passed = exp.passed;
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.5rem 0.75rem',
                              background: '#1e293b',
                              borderRadius: '6px',
                              borderLeft: `4px solid ${!passed ? '#ef4444' : isHard ? '#10b981' : '#38bdf8'}`
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                                  {formatFieldName(exp.field)}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '3px',
                                  background: isHard ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                                  color: isHard ? '#fca5a5' : '#7dd3fc'
                                }}>
                                  {isHard ? 'MANDATORY' : 'WEIGHTED'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {exp.message}
                              </div>
                            </div>
                            <div>
                              {isHard ? (
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: passed ? '#34d399' : '#f87171' }}>
                                  {passed ? '✓ PASSED' : '✕ FAILED'}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
                                  {exp.score !== undefined && exp.max_score !== undefined ? `${exp.score}/${exp.max_score} pts` : 'Evaluated'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {appliedSuccess ? (
                  <div style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    textAlign: 'center',
                    color: '#bae6fd'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem', color: '#38bdf8', fontSize: '1.1rem' }}>
                      🎉 Application Submitted Successfully!
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      Your enrollment request has been registered in the study registry. The clinical research team will review your application.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                      <button
                        onClick={() => {
                          onClose();
                          if (onNavigateToEnrollment) onNavigateToEnrollment();
                        }}
                        style={{
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          padding: '0.6rem 1.25rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        View My Enrollments →
                      </button>
                      <button
                        onClick={onClose}
                        style={{
                          background: 'transparent',
                          border: '1px solid #475569',
                          color: '#cbd5e1',
                          padding: '0.6rem 1.25rem',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #475569',
                        color: '#cbd5e1',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      ← Re-enter Information
                    </button>
                    {result.eligible && (
                      <button
                        type="button"
                        onClick={handleApply}
                        disabled={applying}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.65rem 1.5rem',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          cursor: applying ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                        }}
                      >
                        {applying ? 'Submitting Application...' : 'Apply to this Trial Now →'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Dynamic Form Render */
              <form onSubmit={handleEvaluate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  This form is dynamically generated based on <strong>{trial.trial_name}</strong>'s specific criteria. <strong style={{ color: '#ef4444' }}>HARD</strong> parameters are mandatory gates (failing any rejects eligibility), while <strong style={{ color: '#38bdf8' }}>SOFT</strong> parameters determine your match score.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {criteria.length === 0 ? (
                    <div style={{ padding: '1.5rem', background: '#0f172a', borderRadius: '8px', color: '#94a3b8', textAlign: 'center' }}>
                      No specific restrictions configured for this trial. General screening applies.
                    </div>
                  ) : (
                    criteria.map((crit, idx) => {
                      const isAutoFilled = autoFilledFields[crit.field];
                      const isHard = crit.classification === 'HARD';
                      const value = formInputs[crit.field] ?? '';

                      return (
                        <div
                          key={idx}
                          style={{
                            background: '#0f172a',
                            border: `1px solid ${isHard ? '#334155' : 'rgba(56, 189, 248, 0.25)'}`,
                            borderRadius: '10px',
                            padding: '1rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                              {formatFieldName(crit.field)} {isHard ? <span style={{ color: '#ef4444' }}>*</span> : <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>(Preferred)</span>}
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              {isAutoFilled && (
                                <span style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.4)',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px'
                                }}>
                                  ✓ Auto-filled from profile
                                </span>
                              )}
                              <span style={{
                                background: isHard ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                color: isHard ? '#f87171' : '#38bdf8',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                border: `1px solid ${isHard ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                              }}>
                                {isHard ? 'HARD (Mandatory)' : `SOFT (Weight: ${crit.weight || 1.0})`}
                              </span>
                            </div>
                          </div>

                          {/* Render dynamic inputs based on data type */}
                          {crit.data_type === 'BOOLEAN' ? (
                            <div>
                              <select
                                value={String(value)}
                                onChange={(e) => handleInputChange(crit.field, e.target.value, crit.data_type)}
                                required={isHard}
                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, background: '#1e293b', border: '1px solid #475569', color: '#fff' }}
                              >
                                <option value="">Select an option...</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                              {crit.boolean_ideal !== undefined && crit.boolean_ideal !== null && (
                                <div style={{ fontSize: '0.75rem', color: isHard ? '#94a3b8' : '#38bdf8', marginTop: 4 }}>
                                  {isHard ? 'Strict Requirement:' : 'Preferred Target:'} <strong>{crit.boolean_ideal ? 'Yes' : 'No'}</strong>
                                </div>
                              )}
                            </div>
                          ) : crit.data_type === 'NUMERIC' ? (
                            <div>
                              <input
                                type="number"
                                step="any"
                                value={value}
                                onChange={(e) => handleInputChange(crit.field, e.target.value, crit.data_type)}
                                placeholder={
                                  isHard
                                    ? (crit.numeric_min !== null && crit.numeric_max !== null
                                        ? `Required range: ${crit.numeric_min} - ${crit.numeric_max}`
                                        : `Enter ${formatFieldName(crit.field)}`)
                                    : (crit.numeric_ideal !== null
                                        ? `Target Ideal: ${crit.numeric_ideal} (Tolerance: ±${crit.numeric_tolerance || 0})`
                                        : `Enter ${formatFieldName(crit.field)}`)
                                }
                                required={isHard}
                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, background: '#1e293b', border: '1px solid #475569', color: '#fff' }}
                              />
                              {isHard && crit.numeric_min !== null && crit.numeric_max !== null && (
                                <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: 4 }}>
                                  Strict required range: <strong>{crit.numeric_min}</strong> to <strong>{crit.numeric_max}</strong>
                                </div>
                              )}
                              {!isHard && crit.numeric_ideal !== null && (
                                <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: 4 }}>
                                  Optimal target: <strong>{crit.numeric_ideal}</strong> (Tolerance: ±{crit.numeric_tolerance || 0}) · Gaussian affinity scoring
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => handleInputChange(crit.field, e.target.value, crit.data_type)}
                                placeholder={crit.categorical_ideal ? `e.g. ${crit.categorical_ideal}` : `Enter ${formatFieldName(crit.field)}`}
                                required={isHard}
                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, background: '#1e293b', border: '1px solid #475569', color: '#fff' }}
                              />
                              {crit.categorical_ideal && (
                                <div style={{ fontSize: '0.75rem', color: isHard ? '#94a3b8' : '#38bdf8', marginTop: 4 }}>
                                  {isHard ? 'Required value:' : 'Preferred value:'} <strong>{crit.categorical_ideal}</strong>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: 'transparent',
                      border: '1px solid #475569',
                      color: '#cbd5e1',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={evaluating}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.65rem 1.5rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: evaluating ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
                    }}
                  >
                    {evaluating ? 'Evaluating Match...' : 'Submit & Check Eligibility →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
