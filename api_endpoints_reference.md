# AegisTrial — Complete API Endpoint Reference

**Base URL:** `http://127.0.0.1:8000`
**Interactive Docs:** `http://127.0.0.1:8000/docs`

---

## 🏥 Patients (`/patients`)

| # | Method | Endpoint | Functionality | Request | Returns | Status Codes |
|---|--------|----------|---------------|---------|---------|--------------|
| 1 | `GET` | `/patients/` | **List all patients** with pagination. Returns patient demographics, vitals, conditions, allergies, and active trial status. | Query: `skip=0`, `limit=100` | `List[PatientResponse]` — Array of patient objects with nested vitals, conditions, and allergies | `200` |
| 2 | `POST` | `/patients/` | **Register a new patient.** Validates consent (mandatory), runs RapidFuzz duplicate detection (name >85% + exact DOB + last-4 phone digits). Generates sequential ID like `P000001`. Creates patient along with optional vitals, conditions, and allergies in one transaction. | Body: `PatientCreate` { name, gender, dob, location, phone, blood_group, previous_surgery, smoking, alcohol, consent, vitals?, conditions[], allergies[] }. Query: `force=false` (skip duplicate check if true) | `PatientResponse` — The created patient with generated `patient_id`, timestamps, and nested clinical data | `200`, `409` (duplicate found), `422` (validation error) |
| 3 | `GET` | `/patients/{patient_id}` | **Get a single patient** by ID. Returns full profile with vitals history, conditions, and allergies. | Path: `patient_id` (e.g. `P000001`) | `PatientResponse` — Single patient with all nested clinical data | `200`, `404` (not found) |
| 4 | `PUT` | `/patients/{patient_id}` | **Update patient demographics.** Only updates fields that are explicitly sent. Strips `active_trial_id` to prevent manual override (enrollment routes manage this). Creates an audit log entry for every changed field. | Path: `patient_id`. Body: `PatientUpdate` { name?, gender?, dob?, location?, phone?, blood_group?, previous_surgery?, smoking?, alcohol?, consent? }. Query: `user_id="SYSTEM"` | `PatientResponse` — Updated patient object | `200`, `404` |
| 5 | `POST` | `/patients/batch-upload` | **Bulk upload patients from Excel.** Parses `.xlsx` file, normalizes column headers, validates consent per row, checks duplicates, generates IDs. Uses PostgreSQL savepoints so one bad row doesn't abort the batch. | Multipart: `file` (`.xls` or `.xlsx`) | `BatchUploadResponse` { total_rows, inserted, duplicates_flagged, errors[] } | `200`, `400` (invalid file type) |
| 6 | `POST` | `/patients/generate-virtual` | **Placeholder for virtual patient generation.** Not yet implemented. | None | `{"message": "Virtual patient generation endpoint (To be implemented)."}` | `200` |

### PatientResponse Shape
```json
{
  "patient_id": "P000001",
  "name": "Rahul Sharma",
  "gender": "Male",
  "dob": "1984-03-15",
  "location": "Mumbai",
  "phone": "9876543210",
  "blood_group": "O+",
  "previous_surgery": "Appendectomy",
  "smoking": false,
  "alcohol": false,
  "consent": true,
  "active_trial_id": null,
  "created_at": "2026-08-16T10:30:00Z",
  "updated_at": "2026-08-16T10:30:00Z",
  "vitals": [
    {
      "vitals_id": 1,
      "patient_id": "P000001",
      "recorded_at": "2026-08-16T10:30:00Z",
      "bp_systolic": 120, "bp_diastolic": 80,
      "heart_rate": 72, "hba1c": 6.2, "bmi": 24.5,
      "cholesterol": 190.0, "alt": 28.0, "creatinine": 0.9, "blood_glucose": 95.0
    }
  ],
  "conditions": [
    { "condition_id": 1, "patient_id": "P000001", "condition_name": "Hypertension", "diagnosed_at": "2021-06-01" }
  ],
  "allergies": [
    { "allergy_id": 1, "patient_id": "P000001", "allergen": "Penicillin" }
  ]
}
```

---

## 🔬 Trials (`/trials`)

| # | Method | Endpoint | Functionality | Request | Returns | Status Codes |
|---|--------|----------|---------------|---------|---------|--------------|
| 7 | `GET` | `/trials/` | **List all clinical trials** with pagination. Each trial includes its attached criteria array. | Query: `skip=0`, `limit=100` | `List[TrialResponse]` — Array of trials with nested criteria | `200` |
| 8 | `POST` | `/trials/` | **Create a trial with confirmed criteria.** Generates sequential trial ID (e.g. `T001`). Locks the trials table for concurrent ID safety. Saves trial metadata + all criteria rows. Sets status to `OPEN`. | Body: `TrialCreate` { trial_name, description?, source_type?, target_recruitment?, original_text? } + `List[CriterionCreate]` | `TrialResponse` — Created trial with `trial_id`, status `OPEN`, and nested criteria | `200`, `422` |
| 9 | `POST` | `/trials/draft` | **AI criteria extraction (does NOT save to DB).** Accepts either a PDF file or raw text. Extracts text from PDF via PyPDF2, sends it to Groq LLM, parses returned JSON into validated Pydantic criteria objects. Auto-retries once on parse failure. | Multipart: `file` (PDF) OR Form: `text` (raw protocol string) | `List[CriterionCreate]` — Array of extracted criteria (in-memory only, not persisted) | `200`, `400` (no input), `500` (LLM failure) |
| 10 | `POST` | `/trials/{trial_id}/confirm-criteria` | **Confirm and persist criteria for an existing trial draft.** Uses the provided `trial_id` instead of generating a new one. Saves trial metadata and all criteria rows to DB. | Path: `trial_id`. Body: `TrialCreate` + `List[CriterionCreate]` | `TrialResponse` — Confirmed trial with criteria | `200`, `422` |
| 11 | `GET` | `/trials/{trial_id}` | **Get a single trial** with all its criteria. | Path: `trial_id` (e.g. `T001`) | `TrialResponse` — Trial with nested criteria array | `200`, `404` |
| 12 | `PUT` | `/trials/{trial_id}` | **Update trial metadata** (name, description, status, target). Creates audit log entries for each changed field. | Path: `trial_id`. Body: `TrialUpdate` { trial_name?, description?, source_type?, status?, target_recruitment?, original_text? }. Query: `user_id="SYSTEM"` | `TrialResponse` — Updated trial | `200`, `404` |

### TrialResponse Shape
```json
{
  "trial_id": "T001",
  "trial_name": "Phase III Diabetes Management Study",
  "description": "Multi-center study evaluating...",
  "source_type": "PDF_UPLOAD",
  "target_recruitment": 150,
  "original_text": "Full protocol text...",
  "status": "OPEN",
  "created_at": "2026-08-16T09:00:00Z",
  "updated_at": "2026-08-16T09:00:00Z",
  "criteria": [
    {
      "criterion_id": 1,
      "trial_id": "T001",
      "field": "age",
      "data_type": "NUMERIC",
      "classification": "HARD",
      "operator": "BETWEEN",
      "numeric_min": 18.0,
      "numeric_max": 65.0,
      "numeric_ideal": null,
      "numeric_tolerance": null,
      "categorical_ideal": null,
      "boolean_ideal": null,
      "weight": null,
      "importance": null
    },
    {
      "criterion_id": 2,
      "trial_id": "T001",
      "field": "bmi",
      "data_type": "NUMERIC",
      "classification": "SOFT",
      "operator": "NEAR",
      "numeric_min": null,
      "numeric_max": null,
      "numeric_ideal": 24.0,
      "numeric_tolerance": 4.0,
      "categorical_ideal": null,
      "boolean_ideal": null,
      "weight": 1.5,
      "importance": null
    }
  ]
}
```

### CriterionCreate Shape (Used for Draft & Confirm)
```json
{
  "field": "smoking",
  "data_type": "BOOLEAN",
  "classification": "HARD",
  "operator": "EQUALS",
  "boolean_ideal": false
}
```

---

## 🎯 Matching (`/matching`)

| # | Method | Endpoint | Functionality | Request | Returns | Status Codes |
|---|--------|----------|---------------|---------|---------|--------------|
| 13 | `GET` | `/matching/patient/{patient_id}/trial/{trial_id}` | **On-demand match preview (NO database write).** Evaluates one patient against one trial's criteria in memory. Returns match score, verdict, and explainability snapshot. `screening_id` and `screened_at` will be `null`. Safe for repeated polling. | Path: `patient_id`, `trial_id` | `MatchResponse` { data: `ScreeningResultResponse` } — With `screening_id: null`, `screened_at: null` | `200`, `404` |
| 14 | `POST` | `/matching/screen/` | **Official persisted screening.** Runs the same matching engine but **saves the result** to `screening_results` table. Generates a permanent `screening_id` for verification workflows. Creates an immutable JSON `criteria_snapshot`. | Body: `ScreenRequest` { patient_id, trial_id } | `MatchResponse` { data: `ScreeningResultResponse` } — With real `screening_id` (e.g. `142`) and `screened_at` timestamp | `200`, `404` |
| 15 | `GET` | `/matching/patient/{patient_id}/trials` | **Find all eligible trials for a patient.** Evaluates the patient against every `OPEN` trial. Returns only trials where the patient is eligible, ranked by match score (highest first). Does NOT persist results. | Path: `patient_id` | `List[TrialCandidateResult]` — Array of { trial_id, trial_name, match_percentage, verdict, gaps[] } | `200`, `404` |
| 16 | `GET` | `/matching/trial/{trial_id}/patients` | **Find all eligible patients for a trial.** Evaluates every patient in the registry against one trial's criteria. Returns only eligible candidates, ranked by match score (highest first). Does NOT persist results. | Path: `trial_id` | `List[CandidateResult]` — Array of { patient_id, patient_name, match_percentage, verdict, gaps[] } | `200`, `404` |

### ScreeningResultResponse Shape (Inside MatchResponse.data)
```json
{
  "screening_id": 142,
  "patient_id": "P000001",
  "trial_id": "T001",
  "vitals_id": 5,
  "match_percentage": 94.5,
  "verdict": "APPROVED",
  "eligible": true,
  "criteria_snapshot": {
    "criteria_used": [ ... ],
    "explanations": [
      {
        "field": "age",
        "type": "HARD",
        "passed": true,
        "message": "Value 42 is within required range 18-65"
      },
      {
        "field": "bmi",
        "type": "SOFT",
        "passed": true,
        "score": 1.45,
        "max_score": 1.5,
        "message": "Contributed 1.45/1.5 to overall score."
      }
    ]
  },
  "screened_at": "2026-08-16T11:00:00Z"
}
```

> **Key Distinction:** `screening_id` is `null` for preview endpoints (#13, #15, #16) and a real integer for the persisted endpoint (#14).

### Verdict Logic
| Condition | `match_percentage` | `verdict` | `eligible` |
|---|---|---|---|
| Failed any HARD criterion | `0.0` | `REJECTED` | `false` |
| Active in another trial | `0.0` | `REJECTED` | `false` |
| Passed all HARD + soft score ≥ 90% | `90.0 – 100.0` | `APPROVED` | `true` |
| Passed all HARD + soft score < 90% | `0.1 – 89.9` | `NEEDS_REVIEW` | `true` |

---

## ✅ Verification (`/verification`)

| # | Method | Endpoint | Functionality | Request | Returns | Status Codes |
|---|--------|----------|---------------|---------|---------|--------------|
| 17 | `POST` | `/verification/{screening_id}/verify` | **Clinician sign-off on a screening result.** Creates a `Verification` record linking the specific screening snapshot to the clinician who reviewed it. Does NOT change the verdict. | Path: `screening_id`. Query: `verified_by` (required, e.g. `"Dr. Sarah"`). Body: `remarks` (optional text) | `Verification` object { verification_id, patient_id, trial_id, screening_id, verified: true, verified_by, verified_at, remarks } | `200`, `400` |
| 18 | `POST` | `/verification/{screening_id}/override` | **Clinician overrides the AI verdict.** Changes the screening's verdict (e.g. `NEEDS_REVIEW` → `APPROVED`). Remarks are **mandatory** when overriding. Updates `screening_results.eligible` to stay in sync. Creates an immutable `AuditLog` entry. | Path: `screening_id`. Query: `verified_by` (required). Body: `override_verdict` (required, one of `APPROVED`/`NEEDS_REVIEW`/`REJECTED`), `remarks` (required) | `Verification` object (same shape as above) | `200`, `400` (invalid verdict or missing remarks) |

### Verification Response Shape
```json
{
  "verification_id": 7,
  "patient_id": "P000001",
  "trial_id": "T001",
  "screening_id": 142,
  "verified": true,
  "verified_by": "Dr. Sarah",
  "verified_at": "2026-08-16T12:00:00Z",
  "remarks": "Patient HbA1c is clinically acceptable given age."
}
```

---

## 📋 Enrollment (`/trials`)

| # | Method | Endpoint | Functionality | Request | Returns | Status Codes |
|---|--------|----------|---------------|---------|---------|--------------|
| 19 | `POST` | `/trials/{trial_id}/invite/{patient_id}` | **Invite a patient to a trial.** Creates an `Enrollment` record with status `INVITED` and stamps `invited_at`. Writes audit log. | Path: `trial_id`, `patient_id`. Query: `user_id="SYSTEM"`, `reason?` | `EnrollmentResponse` { enrollment_id, trial_id, patient_id, status: "INVITED", invited_at, ... } | `200`, `400` (invalid transition) |
| 20 | `POST` | `/trials/{trial_id}/accept/{patient_id}` | **Patient accepts the invitation.** Transitions status from `INVITED` → `ACCEPTED`. Stamps `accepted_at`. | Path: `trial_id`, `patient_id`. Query: `user_id`, `reason?` | `EnrollmentResponse` { status: "ACCEPTED", accepted_at, ... } | `200`, `400` |
| 21 | `POST` | `/trials/{trial_id}/decline/{patient_id}` | **Patient declines the invitation.** Terminal state. Transitions to `DECLINED`. Stamps `declined_at`. | Path: `trial_id`, `patient_id`. Query: `user_id`, `reason?` | `EnrollmentResponse` { status: "DECLINED", declined_at, ... } | `200`, `400` |
| 22 | `POST` | `/trials/{trial_id}/enroll/{patient_id}` | **Officially enroll the patient.** Checks that the patient isn't already enrolled in a different trial. Sets status to `ENROLLED`, stamps `enrolled_at`, and **locks** `patient.active_trial_id = trial_id`. | Path: `trial_id`, `patient_id`. Query: `user_id`, `reason?` | `EnrollmentResponse` { status: "ENROLLED", enrolled_at, ... } | `200`, `400` (active trial conflict or invalid transition) |
| 23 | `POST` | `/trials/{trial_id}/drop/{patient_id}` | **Drop an enrolled participant.** Sets status to `DROPPED`, stamps `dropped_at`, clears `patient.active_trial_id` to `null`. **Auto-promotes** the highest-ranked `WAITING` waitlist candidate to `ENROLLED` in the same transaction. | Path: `trial_id`, `patient_id`. Query: `user_id`, `reason?` | `EnrollmentResponse` { status: "DROPPED", dropped_at, ... } | `200`, `400` |
| 24 | `GET` | `/trials/{trial_id}/waitlist` | **View the ranked waitlist** for a trial. Returns candidates ordered by rank (ascending). | Path: `trial_id` | Array of `Waitlist` objects { waitlist_id, trial_id, patient_id, rank, match_percentage, status, created_at } | `200` |

### EnrollmentResponse Shape
```json
{
  "enrollment_id": 15,
  "trial_id": "T001",
  "patient_id": "P000001",
  "status": "ENROLLED",
  "invited_at": "2026-08-16T12:00:00Z",
  "accepted_at": "2026-08-16T13:00:00Z",
  "declined_at": null,
  "enrolled_at": "2026-08-16T14:00:00Z",
  "dropped_at": null
}
```

### Valid State Transitions
```
None ──→ INVITED
None ──→ ENROLLED (direct fast-track or auto-promotion)
INVITED ──→ ACCEPTED
INVITED ──→ DECLINED (terminal)
INVITED ──→ ENROLLED
ACCEPTED ──→ ENROLLED
ACCEPTED ──→ DECLINED (terminal)
ENROLLED ──→ DROPPED (terminal, triggers waitlist promotion)
```

---

## 🔔 Notifications (`/notifications`)

| # | Method | Endpoint | Functionality | Request | Returns | Status Codes |
|---|--------|----------|---------------|---------|---------|--------------|
| 25 | `POST` | `/notifications/send` | **Send a notification to a patient.** Validates that both the patient and trial exist. Creates a notification record, simulates dispatch, sets `delivery_status` to `SENT` and stamps `sent_at`. | Body: `NotificationSend` { patient_id, trial_id, message, channel } (channel: `EMAIL`, `SMS`, `IN_APP`) | `NotificationResponse` { notification_id, patient_id, trial_id, message, channel, delivery_status: "SENT", response: "NONE" } | `200`, `400` (patient or trial not found) |
| 26 | `GET` | `/notifications/{patient_id}` | **Get all notifications for a patient.** Returns every notification record for the given patient ID. | Path: `patient_id` | `List[NotificationResponse]` — Array of notification objects | `200` |
| 27 | `POST` | `/notifications/{notification_id}/respond` | **Record a patient's response** to a notification. Strictly validates the response is one of `ACCEPTED`, `DECLINED`, or `NONE` using a Pydantic `Literal` type. | Path: `notification_id`. Body: `NotificationRespond` { response: "ACCEPTED" \| "DECLINED" \| "NONE" } | `NotificationResponse` — Updated notification with new `response` value | `200`, `404` (notification not found) |

### NotificationResponse Shape
```json
{
  "notification_id": 3,
  "patient_id": "P000001",
  "trial_id": "T001",
  "message": "You have been invited to join Phase III Diabetes Study.",
  "channel": "EMAIL",
  "delivery_status": "SENT",
  "response": "ACCEPTED"
}
```

---

## 📊 Dashboard (`/dashboard`)

| # | Method | Endpoint | Functionality | Request | Returns | Status Codes |
|---|--------|----------|---------------|---------|---------|--------------|
| 28 | `GET` | `/dashboard/trials/{trial_id}` | **Get recruitment statistics for a trial.** Deduplicates multiple screening runs per patient (uses latest only). Computes recruitment progress, verdict breakdowns, top 10 eligible candidates, and top 5 disqualification reasons extracted from screening JSON snapshots. | Path: `trial_id` | `DashboardStatsResponse` — See shape below | `200`, `404` (trial not found) |

### DashboardStatsResponse Shape
```json
{
  "target": 150,
  "screened": 87,
  "approved": 42,
  "needs_review": 28,
  "rejected": 17,
  "enrolled": 45,
  "progress": 30.0,
  "top_exclusion_reasons": [
    { "reason": "hba1c", "count": 8 },
    { "reason": "age", "count": 5 },
    { "reason": "smoking", "count": 3 }
  ],
  "top_candidates": [
    { "patient_id": "P000012", "score": 97.5 },
    { "patient_id": "P000001", "score": 94.5 }
  ]
}
```

---

## 📤 Exports (`/export`)

| # | Method | Endpoint | Functionality | Request | Returns | Status Codes |
|---|--------|----------|---------------|---------|---------|--------------|
| 29 | `GET` | `/export/trials/{trial_id}/candidates.csv` | **Download CSV of screened candidates.** Uses pandas DataFrame on deduplicated latest screenings. Includes Patient ID, Name, Phone, Match %, Verdict, Eligible, Screened At. Returns proper headers for browser download. | Path: `trial_id` | `text/csv` file download — `candidates_{trial_id}.csv` | `200`, `500` (generation error) |
| 30 | `GET` | `/export/trials/{trial_id}/report.pdf` | **Download PDF executive report.** Uses ReportLab to generate a vector PDF with trial recruitment stats: target, enrolled count, progress %, screened breakdown, and top exclusion reasons. | Path: `trial_id` | `application/pdf` file download — `report_{trial_id}.pdf` | `200`, `500` (generation error) |

---

## ❤️ Health Check

| # | Method | Endpoint | Functionality | Request | Returns | Status Codes |
|---|--------|----------|---------------|---------|---------|--------------|
| 31 | `GET` | `/` | **Basic health check.** Confirms the API is running, routers are registered, and tables are built. | None | `{"status": "API is running, routers registered, CORS is secure, and tables are built!"}` | `200` |

---

## Summary: All 31 Endpoints at a Glance

| # | Method | Endpoint | One-Line Purpose |
|:--|:-------|:---------|:-----------------|
| 1 | `GET` | `/patients/` | List patients (paginated) |
| 2 | `POST` | `/patients/` | Register patient (consent + dedup check) |
| 3 | `GET` | `/patients/{id}` | Get single patient profile |
| 4 | `PUT` | `/patients/{id}` | Update patient demographics |
| 5 | `POST` | `/patients/batch-upload` | Bulk Excel upload with savepoints |
| 6 | `POST` | `/patients/generate-virtual` | Placeholder (not implemented) |
| 7 | `GET` | `/trials/` | List all trials with criteria |
| 8 | `POST` | `/trials/` | Create trial + criteria (persisted) |
| 9 | `POST` | `/trials/draft` | AI criteria extraction from PDF/text (not persisted) |
| 10 | `POST` | `/trials/{id}/confirm-criteria` | Confirm criteria for existing trial |
| 11 | `GET` | `/trials/{id}` | Get single trial with criteria |
| 12 | `PUT` | `/trials/{id}` | Update trial metadata |
| 13 | `GET` | `/matching/patient/{p}/trial/{t}` | Preview match — single patient vs single trial (no DB write) |
| 14 | `POST` | `/matching/screen/` | Official screening (persisted with screening_id) |
| 15 | `GET` | `/matching/patient/{p}/trials` | Find all eligible trials for a patient |
| 16 | `GET` | `/matching/trial/{t}/patients` | Find all eligible patients for a trial |
| 17 | `POST` | `/verification/{id}/verify` | Clinician sign-off on screening |
| 18 | `POST` | `/verification/{id}/override` | Override AI verdict (mandatory remarks) |
| 19 | `POST` | `/trials/{t}/invite/{p}` | Invite patient to trial |
| 20 | `POST` | `/trials/{t}/accept/{p}` | Patient accepts invitation |
| 21 | `POST` | `/trials/{t}/decline/{p}` | Patient declines invitation |
| 22 | `POST` | `/trials/{t}/enroll/{p}` | Enroll patient (locks active_trial_id) |
| 23 | `POST` | `/trials/{t}/drop/{p}` | Drop patient (auto-promotes from waitlist) |
| 24 | `GET` | `/trials/{t}/waitlist` | View ranked waitlist |
| 25 | `POST` | `/notifications/send` | Send notification to patient |
| 26 | `GET` | `/notifications/{patient_id}` | Get patient's notifications |
| 27 | `POST` | `/notifications/{id}/respond` | Record patient response |
| 28 | `GET` | `/dashboard/trials/{t}` | Trial recruitment statistics |
| 29 | `GET` | `/export/trials/{t}/candidates.csv` | Download candidate CSV roster |
| 30 | `GET` | `/export/trials/{t}/report.pdf` | Download PDF executive report |
| 31 | `GET` | `/` | Health check |
