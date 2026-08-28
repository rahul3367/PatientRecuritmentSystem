import { calculateAge } from '../../utils/ageCalculator';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'with', 'for',
  'is', 'are', 'be', 'at', 'by', 'from', 'on', 'as', 'into', 'through',
  'about', 'against', 'between', 'during', 'without', 'before', 'after',
  'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
]);

const STANDARD_ALIASES = {
  age: ['age', 'patient_age', 'years_old'],
  gender: ['gender', 'sex'],
  bp_systolic: ['bp_systolic', 'systolic_blood_pressure', 'systolic', 'bp systolic', 'systolic bp'],
  bp_diastolic: ['bp_diastolic', 'diastolic_blood_pressure', 'diastolic', 'bp diastolic', 'diastolic bp'],
  heart_rate: ['heart_rate', 'resting_heart_rate', 'pulse', 'pulse_rate'],
  blood_glucose: ['blood_glucose', 'fasting_blood_glucose', 'glucose', 'blood sugar', 'fasting blood sugar'],
  bmi: ['bmi', 'body_mass_index', 'body mass index'],
  hba1c: ['hba1c', 'glycated_hemoglobin', 'hemoglobin a1c', 'a1c'],
  conditions: ['conditions', 'condition', 'diagnosis', 'medical_conditions', 'medical_history', 'history'],
  allergies: ['allergies', 'allergy', 'allergens'],
  cholesterol: ['cholesterol', 'total_cholesterol', 'total serum cholesterol', 'serum cholesterol'],
  creatinine: ['creatinine', 'serum_creatinine', 'serum creatinine'],
  alt: ['alt', 'liver_enzyme_alt', 'alanine aminotransferase', 'alanine_aminotransferase'],
  smoking: ['smoking', 'smoking_status', 'smoker', 'non_smoker', 'tobacco'],
  alcohol: ['alcohol', 'alcohol_consumption', 'drinking'],
  blood_group: ['blood_group', 'blood_type'],
  previous_surgery: ['previous_surgery', 'surgery', 'surgical_history']
};

function normalizeStr(s) {
  if (s === null || s === undefined) return '';
  let clean = String(s).trim().toLowerCase();
  clean = clean.replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/–/g, '-').replace(/—/g, '-');
  return clean.replace(/\s+/g, ' ');
}

function tokenize(text) {
  if (!text) return new Set();
  const cleaned = String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(words);
}

function parseFloatVal(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).trim();
  const num = Number(s);
  if (!isNaN(num)) return num;
  const match = s.match(/[-+]?\d*\.?\d+/);
  if (match) {
    const extracted = Number(match[0]);
    if (!isNaN(extracted)) return extracted;
  }
  return null;
}

function parseBool(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (['true', 'yes', '1', 'y', 't', 'pass', 'positive', 'confirmed', 'present', 'active', 'capable', 'able', 'eligible'].includes(s)) return true;
    if (['false', 'no', '0', 'n', 'f', 'fail', 'negative', 'unconfirmed', 'absent', 'none', 'ineligible'].includes(s)) return false;
    if (s.includes('no ') || s.includes('not ') || s.includes('none') || s.includes('denied') || s.includes('unable') || s.includes('ineligible') || s.includes('absent') || s.includes('negative')) {
      return false;
    }
    return true;
  }
  return Boolean(val);
}

function getPatientFieldValue(patientData, field) {
  if (!patientData || !field) return null;

  // 1. Direct match
  if (patientData[field] !== undefined && patientData[field] !== null && patientData[field] !== '') {
    return patientData[field];
  }

  const fieldClean = normalizeStr(field);
  const fieldSlug = fieldClean.replace(/\s+/g, '_');

  // 2. Case and space normalized search across patientData keys
  for (const [k, v] of Object.entries(patientData)) {
    if (v !== undefined && v !== null && v !== '') {
      const kClean = normalizeStr(k);
      const kSlug = kClean.replace(/\s+/g, '_');
      if (kClean === fieldClean || kSlug === fieldSlug) {
        return v;
      }
    }
  }

  // 3. Alias mapping lookup
  for (const [stdKey, aliases] of Object.entries(STANDARD_ALIASES)) {
    if (aliases.some(a => fieldClean === a || fieldSlug === a.replace(/\s+/g, '_'))) {
      for (const a of aliases) {
        for (const [k, v] of Object.entries(patientData)) {
          if (v !== undefined && v !== null && v !== '') {
            const kClean = normalizeStr(k);
            if (kClean === a || kClean.replace(/\s+/g, '_') === a.replace(/\s+/g, '_')) {
              return v;
            }
          }
        }
      }
      if (patientData[stdKey] !== undefined && patientData[stdKey] !== null && patientData[stdKey] !== '') {
        return patientData[stdKey];
      }
    }
  }

  // 4. Partial / containment key lookup
  for (const [k, v] of Object.entries(patientData)) {
    if (v !== undefined && v !== null && v !== '') {
      const kClean = normalizeStr(k);
      if ((kClean.length > 3 && fieldClean.includes(kClean)) || (fieldClean.length > 3 && kClean.includes(fieldClean))) {
        return v;
      }
    }
  }

  // 5. Medical conditions list check
  const conditions = patientData.conditions;
  if (Array.isArray(conditions) && conditions.length > 0) {
    const matched = matchCategorical(conditions, field, 'INCLUDES');
    if (matched.passed) return conditions;
  }

  return null;
}

/**
 * Calculates Gaussian affinity score for continuous numeric preferences
 * Formula: weight * exp(-((value - ideal)^2) / (2 * sigma^2)) where sigma = tolerance / 2.0
 */
export function calculateGaussianScore(value, ideal, tolerance, weight = 1.0) {
  if (value === null || value === undefined || ideal === null || tolerance === null || tolerance <= 0) {
    return 0.0;
  }
  const diff = Number(value) - Number(ideal);
  const sigma = Number(tolerance) / 2.0;
  const exponent = -Math.pow(diff, 2) / (2 * Math.pow(sigma, 2));
  const score = weight * Math.exp(exponent);
  return Math.max(0.0, Math.min(weight, score));
}

/**
 * Flattens structured patient record into key-value map for matching rules.
 */
export function flattenPatientData(patient) {
  const data = {
    age: patient.dob ? calculateAge(patient.dob) : null,
    gender: patient.gender,
    blood_group: patient.blood_group,
    smoking: patient.smoking,
    alcohol: patient.alcohol,
    previous_surgery: patient.previous_surgery,
  };

  let vitalsId = null;

  if (patient.vitals && patient.vitals.length > 0) {
    const sortedVitals = [...patient.vitals].sort(
      (a, b) => new Date(b.recorded_at) - new Date(a.recorded_at)
    );
    const latest = sortedVitals[0];
    vitalsId = latest.vitals_id;
    data.bp_systolic = latest.bp_systolic;
    data.bp_diastolic = latest.bp_diastolic;
    data.heart_rate = latest.heart_rate;
    data.hba1c = latest.hba1c;
    data.bmi = latest.bmi;
    data.cholesterol = latest.cholesterol;
    data.alt = latest.alt;
    data.creatinine = latest.creatinine;
    data.blood_glucose = latest.blood_glucose;
  }

  data.conditions = patient.conditions ? patient.conditions.map(c => c.condition_name) : [];
  data.allergies = patient.allergies ? patient.allergies.map(a => a.allergen) : [];

  return { patientData: data, vitalsId };
}

/**
 * Evaluates categorical matching with robust case-insensitivity, normalization,
 * substring tolerance, and word-token semantic overlap.
 */
function matchCategorical(val, ideal, operator = 'EQUALS') {
  if (!ideal) return { passed: true, reason: '' };
  const idealClean = normalizeStr(ideal);
  const op = String(operator || 'EQUALS').toUpperCase();
  const isExclusionOp = ['EXCLUDES', 'NOT_IN', 'DOES_NOT_INCLUDE', 'NOT_EQUALS', '!='].includes(op);
  const idealTokens = tokenize(idealClean);

  const checkSingleMatch = (item) => {
    if (item === null || item === undefined || item === '') return false;
    if (typeof item === 'boolean') return item === true;

    const itemClean = normalizeStr(item);
    if (itemClean === idealClean) return true;
    if (idealClean.includes(itemClean) || itemClean.includes(idealClean)) return true;

    const itemTokens = tokenize(itemClean);
    if (idealTokens.size > 0 && itemTokens.size > 0) {
      let isSubset = true;
      for (const t of idealTokens) {
        if (!itemTokens.has(t)) { isSubset = false; break; }
      }
      if (isSubset) return true;

      let isReverseSubset = true;
      for (const t of itemTokens) {
        if (!idealTokens.has(t)) { isReverseSubset = false; break; }
      }
      if (isReverseSubset) return true;

      let intersectionCount = 0;
      for (const t of idealTokens) {
        if (itemTokens.has(t)) intersectionCount++;
      }
      const minSize = Math.min(idealTokens.size, itemTokens.size);
      if (intersectionCount >= minSize * 0.5) return true;
    }
    return false;
  };

  const hasMatch = Array.isArray(val)
    ? val.some(x => checkSingleMatch(x))
    : checkSingleMatch(val);

  if (isExclusionOp) {
    if (hasMatch) return { passed: false, reason: `Exclusion criterion met: '${val}' matches excluded '${ideal}'` };
    return { passed: true, reason: '' };
  } else {
    if (!hasMatch) return { passed: false, reason: `Required condition/value '${ideal}' not matched in '${val}'` };
    return { passed: true, reason: '' };
  }
}

/**
 * Evaluates strictly required (HARD) criteria.
 */
export function evaluateHardCriteria(patientData, hardCriteria) {
  const failures = [];

  for (const crit of hardCriteria) {
    const val = getPatientFieldValue(patientData, crit.field);

    if (val === null || val === undefined || val === '') {
      failures.push({
        field: crit.field,
        reason: `Missing required patient data for '${crit.field}'`
      });
      continue;
    }

    if (crit.data_type === 'NUMERIC') {
      const numVal = parseFloatVal(val);
      if (numVal === null || isNaN(numVal)) {
        failures.push({
          field: crit.field,
          reason: `Invalid numeric value '${val}' for '${crit.field}'`
        });
      } else {
        const minVal = crit.numeric_min !== null && crit.numeric_min !== undefined ? crit.numeric_min : -Infinity;
        const maxVal = crit.numeric_max !== null && crit.numeric_max !== undefined ? crit.numeric_max : Infinity;
        if (numVal < minVal || numVal > maxVal) {
          failures.push({
            field: crit.field,
            reason: `Value ${val} is outside strictly required range [${crit.numeric_min} - ${crit.numeric_max}]`
          });
        }
      }
    } else if (crit.data_type === 'CATEGORICAL') {
      const { passed, reason } = matchCategorical(val, crit.categorical_ideal, crit.operator);
      if (!passed) {
        failures.push({
          field: crit.field,
          reason
        });
      }
    } else if (crit.data_type === 'BOOLEAN') {
      const boolVal = parseBool(val);
      if (boolVal === null) {
        failures.push({
          field: crit.field,
          reason: `Invalid boolean response '${val}' for '${crit.field}'`
        });
      } else {
        const op = String(crit.operator || 'EQUALS').toUpperCase();
        if (['NOT_EQUALS', '!='].includes(op)) {
          if (boolVal === crit.boolean_ideal) {
            failures.push({
              field: crit.field,
              reason: `Exclusion met: patient has ${val}`
            });
          }
        } else {
          if (boolVal !== crit.boolean_ideal) {
            failures.push({
              field: crit.field,
              reason: `Required ${crit.boolean_ideal ? 'Yes' : 'No'}, but patient has ${boolVal ? 'Yes' : 'No'}`
            });
          }
        }
      }
    }
  }

  return {
    hardPassed: failures.length === 0,
    failures
  };
}

/**
 * Evaluates preferential (SOFT) criteria.
 */
export function evaluateSoftCriteria(patientData, softCriteria) {
  const contributions = [];

  for (const crit of softCriteria) {
    const val = getPatientFieldValue(patientData, crit.field);
    const weight = crit.weight !== null && crit.weight !== undefined ? crit.weight : 1.0;
    let contribution = 0.0;

    if (val !== null && val !== undefined && val !== '') {
      if (crit.data_type === 'NUMERIC') {
        const numVal = parseFloatVal(val);
        if (numVal !== null && !isNaN(numVal)) {
          contribution = calculateGaussianScore(
            numVal,
            crit.numeric_ideal,
            crit.numeric_tolerance,
            weight
          );
        }
      } else if (crit.data_type === 'CATEGORICAL') {
        const { passed } = matchCategorical(val, crit.categorical_ideal, crit.operator);
        if (passed) {
          contribution = weight;
        }
      } else if (crit.data_type === 'BOOLEAN') {
        const boolVal = parseBool(val);
        if (boolVal !== null) {
          const op = String(crit.operator || 'EQUALS').toUpperCase();
          if (['NOT_EQUALS', '!='].includes(op)) {
            if (boolVal !== crit.boolean_ideal) {
              contribution = weight;
            }
          } else {
            if (boolVal === crit.boolean_ideal) {
              contribution = weight;
            }
          }
        }
      }
    }

    contributions.push({
      field: crit.field,
      contribution: Math.round(contribution * 100) / 100,
      max_possible: weight
    });
  }

  return contributions;
}

/**
 * Computes non-disqualifying gaps from criteria explanations.
 */
export function computeGaps(criteriaSnapshot) {
  const explanations = criteriaSnapshot?.explanations || [];
  return explanations
    .filter(exp => exp.type === 'SOFT' && exp.score < exp.max_score)
    .map(exp => exp.message);
}

/**
 * Core Matching Engine Orchestrator
 * Returns exact schema shape expected by the frontend and backend.
 */
export function runMatchingEngine(patient, trial, overrides = null) {
  // 1. Active trial conflict
  if (patient.active_trial_id && patient.active_trial_id !== trial.trial_id) {
    return {
      patient_id: patient.patient_id,
      trial_id: trial.trial_id,
      match_percentage: 0.0,
      verdict: 'REJECTED',
      eligible: false,
      vitals_id: null,
      criteria_snapshot: {
        reason: 'Patient is actively enrolled in another trial.',
        explanations: [
          {
            field: 'active_trial_id',
            type: 'HARD',
            passed: false,
            message: `Patient is actively enrolled in trial ${patient.active_trial_id}.`
          }
        ]
      }
    };
  }

  const criteria = trial.criteria || [];
  const hardCriteria = criteria.filter(c => c.classification === 'HARD');
  const softCriteria = criteria.filter(c => c.classification === 'SOFT');

  // 2. Flatten patient data
  const { patientData, vitalsId } = flattenPatientData(patient);

  // Merge overrides if provided
  if (overrides && typeof overrides === 'object') {
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== null && v !== undefined) {
        if (k === 'conditions' && Array.isArray(v)) {
          const existingConds = new Set(patientData.conditions || []);
          v.forEach(c => existingConds.add(c));
          patientData.conditions = Array.from(existingConds);
        } else if (k === 'allergies' && Array.isArray(v)) {
          const existingAllergies = new Set(patientData.allergies || []);
          v.forEach(a => existingAllergies.add(a));
          patientData.allergies = Array.from(existingAllergies);
        } else {
          patientData[k] = v;
        }
      }
    }
  }

  // 3. Evaluate Hard Criteria
  const { hardPassed, failures } = evaluateHardCriteria(patientData, hardCriteria);
  const failedFields = new Set(failures.map(f => f.field));
  const passedHardCriteria = hardCriteria.filter(h => !failedFields.has(h.field));

  // 4. Evaluate Soft Criteria & Scoring (Separated from Hard Gate)
  const softContributions = evaluateSoftCriteria(patientData, softCriteria);
  
  let matchPercentage = 100.0;
  if (softCriteria.length > 0) {
    const totalScore = softContributions.reduce((acc, curr) => acc + curr.contribution, 0);
    const maxScore = softContributions.reduce((acc, curr) => acc + curr.max_possible, 0);
    matchPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 100.0;
  }

  // 5. Determine Verdict
  const verdict = !hardPassed ? 'REJECTED' : (matchPercentage >= 90.0 ? 'APPROVED' : 'NEEDS_REVIEW');
  const eligible = hardPassed && (verdict === 'APPROVED' || verdict === 'NEEDS_REVIEW');

  // 6. Generate Complete Explanations Breakdown (Failed Hard, Passed Hard, Soft)
  const explanations = [
    ...failures.map(f => ({
      field: f.field,
      type: 'HARD',
      passed: false,
      message: f.reason
    })),
    ...passedHardCriteria.map(h => ({
      field: h.field,
      type: 'HARD',
      passed: true,
      message: `Passed hard criterion for ${h.field}.`
    })),
    ...softContributions.map(s => ({
      field: s.field,
      type: 'SOFT',
      passed: true,
      score: s.contribution,
      max_score: s.max_possible,
      message: `Contributed ${s.contribution}/${s.max_possible} to overall score.`
    }))
  ];

  return {
    patient_id: patient.patient_id,
    trial_id: trial.trial_id,
    match_percentage: matchPercentage,
    verdict,
    eligible,
    vitals_id: vitalsId,
    criteria_snapshot: {
      criteria_used: criteria,
      explanations
    }
  };
}
