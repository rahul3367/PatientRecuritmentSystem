// Sample clinical protocol texts for AI extraction demonstrations

export const SAMPLE_PROTOCOLS = [
  {
    id: "diabetes-study",
    title: "Phase III Glycemic Control in Adults with Type 2 Diabetes",
    text: `PROTOCOL TITLE: A 24-Week Randomized Double-Blind Study of Oral Incretin-Enhancer in Adult Patients with Inadequately Controlled Type 2 Diabetes Mellitus.

ELIGIBILITY CRITERIA:

Inclusion Criteria:
1. Adult male or female patients aged 18 to 75 years at the time of screening. (HARD, NUMERIC, age: 18 - 75)
2. Documented diagnosis of Type 2 Diabetes Mellitus for at least 6 months. (HARD, CATEGORICAL, conditions: Type 2 Diabetes)
3. Baseline HbA1c between 6.0% and 9.5%, with an ideal target of 6.5% (+/- 1.0% tolerance). (SOFT, NUMERIC, hba1c: ideal 6.5, tolerance 1.0, weight 1.5)
4. Fasting blood glucose target around 120.0 mg/dL (+/- 25 mg/dL tolerance). (SOFT, NUMERIC, blood_glucose: ideal 120.0, tolerance 25.0, weight 1.0)
5. Body Mass Index (BMI) target around 27.5 kg/m² (+/- 4.0 tolerance). (SOFT, NUMERIC, bmi: ideal 27.5, tolerance 4.0, weight 1.0)
6. Non-smoker status preferred. (SOFT, BOOLEAN, smoking: false, weight 0.8)
7. Systolic Blood Pressure strictly between 90 and 160 mmHg. (HARD, NUMERIC, bp_systolic: 90 - 160)`
  },
  {
    id: "hypertension-renal",
    title: "Phase II Renal Biomarkers & Hypertension Protocol",
    text: `PROTOCOL TITLE: Multi-center Evaluation of Novel ACE-Inhibitor Titration on Renal Glomerular Filtration and Serum Biomarkers.

ELIGIBILITY CRITERIA:

Inclusion & Exclusion Criteria:
1. Patients aged between 25 and 80 years old. (HARD, NUMERIC, age: 25 - 80)
2. Active clinical diagnosis of Primary Hypertension. (HARD, CATEGORICAL, conditions: Hypertension)
3. Serum Creatinine ideal level around 1.0 mg/dL (+/- 0.3 mg/dL tolerance). (SOFT, NUMERIC, creatinine: ideal 1.0, tolerance 0.3, weight 1.5)
4. Liver function enzyme ALT strictly within normal clinical limits (7.0 to 56.0 U/L). (HARD, NUMERIC, alt: 7.0 - 56.0)
5. Systolic blood pressure optimal target around 130 mmHg (+/- 15 mmHg). (SOFT, NUMERIC, bp_systolic: ideal 130.0, tolerance 15.0, weight 1.2)`
  },
  {
    id: "cardiovascular-lipid",
    title: "Cardiovascular Lipid Management & PCSK9 Trial",
    text: `PROTOCOL TITLE: Cardiovascular Risk Reduction via Novel Monoclonal Antibody Therapy in High-Risk Dyslipidemia Patients.

ELIGIBILITY CRITERIA:
1. Male or female patients aged 40 to 85 years old. (HARD, NUMERIC, age: 40 - 85)
2. Total Serum Cholesterol ideal around 190 mg/dL (+/- 30 mg/dL tolerance). (SOFT, NUMERIC, cholesterol: ideal 190.0, tolerance 30.0, weight 1.5)
3. Resting Heart Rate strictly between 50 and 100 bpm. (HARD, NUMERIC, heart_rate: 50 - 100)
4. Strict non-smoking requirement. (HARD, BOOLEAN, smoking: false)`
  }
];
