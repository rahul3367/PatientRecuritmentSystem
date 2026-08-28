# Clinical Trial Recruitment Platform — API Documentation

**Base URL (local dev):** `http://127.0.0.1:8000`
**Interactive Swagger docs:** `http://127.0.0.1:8000/docs`
**Stack:** FastAPI · PostgreSQL · SQLAlchemy · Groq (`llama-3.3-70b-versatile`)

> This document reflects the actual current backend code, not a plan. Every endpoint, field name, and status value below was read directly from the routes, services, schemas, and models in the codebase.

---

## Table of Contents

1. [Architectural Overview & Core Workflows](#1-architectural-overview--core-workflows)
2. [Conventions](#2-conventions)
3. [Endpoint Reference](#3-endpoint-reference)
   - [Patients](#patients--patients)
   - [Trials](#trials--trials)
   - [Matching](#matching--matching)
   - [Enrollment](#enrollment--trialstrial_id)
   - [Verification](#verification--verification)
   - [Dashboard](#dashboard--dashboard)
   - [Notifications](#notifications--notifications)
   - [Exports](#exports--export)

---

## 1. Architectural Overview & Core Workflows

### 1.1 The AI Trial Builder Flow

A researcher can build a trial's eligibility criteria two ways: type them in manually, or hand the system a PDF/plain-text protocol and let the LLM extract them. Either way, **nothing touches the database until a human confirms it.**

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────────┐
│  PDF or Text  │ ──▶ │  POST /trials/draft │ ──▶ │  Draft criteria (JSON) │
└──────────────┘     │  (Groq LLM, in-mem) │     │  shown to researcher  │
                      └───────────────────┘     │  for review/edit      │
                                                  └──────────┬───────────┘
                                                             │ human edits, confirms
                                                             ▼
                                          ┌──────────────────────────────────┐
                                          │ POST /trials/{trial_id}/confirm-  │
                                          │ criteria  → writes Trial +        │
                                          │ TrialCriterion rows to Postgres   │
                                          └──────────────────────────────────┘
```

- The LLM (`llama-3.3-70b-versatile`, temperature `0.0`, strict JSON mode) is prompted to output only `{"criteria": [...]}`. If Groq's response fails Pydantic validation on the first attempt, the backend **automatically retries once** with the validation error fed back into the prompt before giving up.
- `POST /trials/draft` is a pure LLM call — it does not require or use a `trial_id`, and produces no database row.
- `POST /trials/{trial_id}/confirm-criteria` is the commit step. It correctly attaches the confirmed criteria to the **specific trial ID in the URL** (not a newly minted one) — build your "review & confirm" screen around editing the draft array and submitting it back to this exact endpoint.
- `POST /trials/` (no draft) is the manual-entry shortcut for a researcher who wants to skip the AI step entirely and type criteria straight into a form.

### 1.2 The Triage & Matching Flow — In-Memory GET vs. Persisted POST

This is the single most important distinction in the API. There are **two ways to score a patient against a trial**, and they exist for different UI moments:

| | In-memory (`GET`) | Persisted (`POST /matching/screen/`) |
|---|---|---|
| **Writes to DB?** | No | Yes — creates a `ScreeningResult` row |
| **Produces a `screening_id`?** | No (`null`) | Yes |
| **Can be verified/overridden by a doctor?** | No | Yes |
| **Safe to call repeatedly / poll?** | Yes | No — creates a new row every call |
| **Use for** | Live search-as-you-type, "preview my match", dashboards of candidates | The moment a clinician officially screens a patient for enrollment consideration |

Use the `GET` endpoints for anything exploratory or read-heavy (a researcher browsing candidates, a patient checking eligibility). Only call `POST /matching/screen/` when the action is deliberate — e.g. a "Screen This Patient" button a clinician clicks, which then produces the `screening_id` needed for the verification step below.

**Soft-score behavior (important for verdict logic):** A patient who fails any `HARD` criterion is immediately `REJECTED` with `eligible: false` — no further scoring happens. But a patient who **passes every `HARD` criterion** and merely scores poorly on `SOFT` (preference) criteria is **never auto-rejected**. They land in `NEEDS_REVIEW` with `eligible: true`, because soft criteria are preferences, not exclusion rules — a clinician should still be able to see and consider them. Only `match_percentage ≥ 90` on a hard-passing patient earns a clean `APPROVED`.

```
Hard criteria failed?  ──Yes──▶  REJECTED, eligible: false  (short-circuit, no soft scoring)
        │ No
        ▼
Soft score ≥ 90%?  ──Yes──▶  APPROVED, eligible: true
        │ No
        ▼
   NEEDS_REVIEW, eligible: true
```

A patient already actively enrolled in a *different* trial (`active_trial_id` set and ≠ the trial being scored) is short-circuited straight to `REJECTED` regardless of criteria — see §1.4.

### 1.3 The Human-in-the-Loop (FDA-Compliant) Flow

Once a screening is persisted (has a `screening_id`), a clinician can review and, if needed, override the AI's verdict — with a mandatory paper trail.

```
POST /matching/screen/  →  screening_id: 42, verdict: "NEEDS_REVIEW"
            │
            ▼
   Clinician reviews the criteria_snapshot + explanations
            │
   ┌────────┴─────────┐
   ▼                   ▼
Agree, just        Disagree, override
sign off            the verdict
   │                   │
   ▼                   ▼
POST /verification/  POST /verification/
{screening_id}/verify {screening_id}/override
(remarks optional)    (remarks MANDATORY,
                       override_verdict required)
```

- **`/verify`** — clinician confirms they reviewed it; verdict unchanged.
- **`/override`** — clinician changes the verdict. The backend **rejects the request if `remarks` is missing** — you cannot override without a documented reason. This is the auditability guarantee the whole verification system exists for: every AI decision that's overturned has a human name and a written reason attached, permanently, via the `audit_log` table.
- Overriding a verdict also updates `eligible` to stay consistent (`APPROVED`/`NEEDS_REVIEW` → `true`, `REJECTED` → `false`) — so a clinician rejecting a previously-approved patient correctly removes them from candidate lists everywhere (dashboard, exports) without any extra step.

### 1.4 The Strict Enrollment State Machine

```
        ┌─────────┐
   ┌───▶│ INVITED │───────┐
   │    └────┬────┘       │
   │         │             ▼
(new)        ▼        ┌──────────┐
   │    ┌──────────┐  │ DECLINED │ (terminal)
   │    │ ACCEPTED │  └──────────┘
   │    └────┬─────┘
   │         │
   └─────────┼──────────────┐
             ▼               │
        ┌──────────┐         │ (direct enroll,
        │ ENROLLED │◀────────┘  e.g. waitlist promotion)
        └────┬─────┘
             ▼
        ┌──────────┐
        │ DROPPED  │ (terminal — may auto-promote next WAITING patient)
        └──────────┘
```

- Every transition is validated against an explicit allow-list server-side — e.g. you cannot call `enroll` on a patient who was never invited or accepted, **except** the system's own waitlist auto-promotion, which enrolls directly (bypassing invite/accept) since a waitlisted patient may never have gone through that flow.
- **Active-trial conflict lock:** a patient can only be `ENROLLED` in one trial at a time. Attempting to enroll a patient who's already actively enrolled elsewhere returns `400` — the frontend should proactively check `patient.active_trial_id` before showing an "Enroll" button as available, but must also handle the `400` gracefully as the source of truth.
- **Auto-promotion:** dropping an enrolled patient automatically finds the top-ranked `WAITING` patient on that trial's waitlist and enrolls them in the same transaction. If your enrollment UI is polling or showing waitlist state, refresh both the enrollment list *and* the waitlist after any `drop` action — both can change from one call.
- Every transition writes an audit log entry (`user_id`, old/new status, optional `reason`) before committing — pass a real `user_id` (not the `"SYSTEM"` default) whenever a logged-in clinician performs the action, since this is what makes the audit trail meaningful.

---

## 2. Conventions

- **IDs:** `patient_id` and `trial_id` are strings (e.g. `T001`), not integers. `screening_id`, `notification_id`, `enrollment_id`, `verification_id`, `criterion_id` are integers.
- **Errors:** Standard FastAPI `HTTPException` shape: `{"detail": "..."}` for most errors, except patient registration duplicates, which return a structured object (see §3.1).
- **Timestamps:** ISO 8601 UTC datetimes (e.g. `"2026-08-16T09:00:00Z"`).
- **Dates:** For fields like `dob`, plain ISO date strings (`"1990-05-12"`).
- **Auth:** No auth/role middleware is currently implemented. `user_id` / `verified_by` are passed as plain query params — the frontend is responsible for supplying the logged-in user's identifier; the backend does not verify it.
- **CORS:** Currently allows `http://localhost:3000` and `http://localhost:5173` explicitly with credentials enabled. If your dev server runs on a different port, it will be blocked — check with backend to add it.

---

## 3. Endpoint Reference

### Patients — `/patients`

#### `POST /patients/`

> **Business purpose:** Register a new patient into the system — the entry point for both manual intake and the "generate virtual patient" demo path. Enforces mandatory consent and runs fuzzy duplicate detection (name similarity >85%, matching DOB, matching last-4 phone digits) before ever writing to the database.

**Frontend guide:** This is a two-step UX. Submit normally first; if you get a `409`, show the duplicate match details to the user (name, similarity score, existing `patient_id`) and offer a "Register anyway" button that resubmits with `?force=true`.

**Query params:** `force: bool = false`

**Request body:**
```json
{
  "name": "Jane Doe",
  "gender": "F",
  "dob": "1990-05-12",
  "location": "Austin, TX",
  "phone": "555-0192",
  "blood_group": "O+",
  "previous_surgery": "Appendectomy 2015",
  "smoking": false,
  "alcohol": false,
  "consent": true,
  "vitals": { "bp_systolic": 118, "bp_diastolic": 76, "hba1c": 5.4, "bmi": 22.1 },
  "conditions": [{ "condition_name": "Type 2 Diabetes", "diagnosed_at": "2020-01-01" }],
  "allergies": [{ "allergen": "Penicillin" }]
}
```

**Responses:**
| Status | Meaning |
|---|---|
| `200` | Full `PatientResponse` (includes generated `patient_id`, nested `vitals`/`conditions`/`allergies`) |
| `409` | `{"detail": {"message": "Duplicate found", "details": {"duplicate": true, "patient_id": "P004", "similarity": 91.3}}}` |

> `consent: false` (or omitted) is rejected server-side regardless of `force` — this is a hard legal gate, not a duplicate-style soft warning.

---

#### `PUT /patients/{patient_id}`

> **Business purpose:** Edit a patient's demographic/lifestyle info after intake (address changed, new phone number, updated smoking status, etc.).

**Frontend guide:** Partial updates only — send just the fields the user actually changed (`exclude_unset` semantics; omitted fields are left alone, not nulled). Pass `?user_id=<clinician_id>` so the change is attributed correctly; every changed field writes its own audit log entry server-side automatically. Note: `active_trial_id` cannot be set through this endpoint even if included in the payload — it's silently dropped. Enrollment state must go through the `/trials/{trial_id}/enroll/{patient_id}` flow instead.

**Request body (partial):**
```json
{ "phone": "555-0199", "smoking": true }
```

**Responses:** `200` → `PatientResponse`, `404` if patient doesn't exist.

---

#### `GET /patients/{patient_id}`

> **Business purpose:** Fetch a full patient profile, including vitals history, conditions, and allergies — the data source for a patient detail screen.

**Frontend guide:** `vitals` is a **list**, not a single object — a patient can have multiple recorded vitals snapshots over time (each screening references whichever was most recent at scoring time). Sort/display by `recorded_at` if showing history.

**Responses:** `200` → `PatientResponse`, `404` if not found.

---

#### `POST /patients/batch-upload`

> **Business purpose:** Bulk-import patients from a researcher's existing Excel spreadsheet (e.g. from a partner clinic) instead of manual one-by-one entry. Each row is processed in its own isolated database transaction (`SAVEPOINT`), so one malformed row never fails the whole batch.

**Frontend guide:** Standard file-upload widget, `multipart/form-data`, field name `file`, accepts `.xls`/`.xlsx` only (validated by filename extension before processing). Show the returned `errors` array as a per-row report — don't treat a non-empty `errors` list as a total failure; check `inserted` vs `total_rows` to show a "N of M imported" summary.

**Response:** `200` →
```json
{ "total_rows": 50, "inserted": 46, "duplicates_flagged": 3, "errors": ["Row 12 (John Roe): Duplicate flagged (Matches P002).", "Row 30 (Ana Lee): Missing/False consent. Skipped."] }
```

---

#### `POST /patients/generate-virtual`

> **Not yet implemented.** Currently returns a static placeholder message. Don't build against this yet.

---

### Trials — `/trials`

#### `POST /trials/draft`

> **Business purpose:** The AI entry point of the trial builder — turns an uploaded protocol PDF or pasted text into structured, reviewable eligibility criteria without committing anything.

**Frontend guide:** `multipart/form-data` — send either `file` (PDF) or `text` (plain form field), not both required but at least one is mandatory. Response is a **raw array**, not wrapped — render it as an editable table (field / data type / classification / operator / thresholds) so the researcher can tweak before confirming. This endpoint has no `trial_id` in its path — it produces a floating draft, not a saved trial.

**Response:** `200` → array of criteria:
```json
[
  { "field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": ">=", "numeric_min": 18, "numeric_max": 45 },
  { "field": "hba1c", "data_type": "NUMERIC", "classification": "SOFT", "operator": "~", "numeric_ideal": 6.5, "numeric_tolerance": 1.0 },
  { "field": "gender", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "==", "categorical_ideal": "F" }
]
```
`400` if neither `file` nor `text` is provided.

> Field rules enforced by the backend (validation errors will name the field): `HARD`+`NUMERIC` needs `numeric_min`/`numeric_max`; `SOFT`+`NUMERIC` needs `numeric_ideal`/`numeric_tolerance` (and *cannot* have min/max); `CATEGORICAL` needs `categorical_ideal`; `BOOLEAN` needs `boolean_ideal`.

---

#### `POST /trials/`

> **Business purpose:** Create a trial directly, bypassing the AI draft step entirely — for a researcher who already knows exactly what criteria they want.

**Request body:**
```json
{
  "trial_data": { "trial_name": "Type 2 Diabetes Study", "description": "...", "target_recruitment": 100 },
  "criteria": [ /* same shape as the draft array above */ ]
}
```
**Response:** `200` → `TrialResponse` (with a freshly generated `trial_id`, e.g. `T007`).

---

#### `POST /trials/{trial_id}/confirm-criteria`

> **Business purpose:** The commit step of the AI flow — takes the (possibly human-edited) draft criteria and saves them permanently against the **specific trial ID already referenced in the URL.**

**Frontend guide:** Call this with the same `trial_id` your UI has been tracking through the draft-review screen. The returned `trial_id` will match what you sent — safe to rely on for redirecting to the trial detail page afterward.

**Request/Response:** identical shape to `POST /trials/`.

---

#### `PUT /trials/{trial_id}`

> **Business purpose:** Edit trial metadata post-creation — status changes (`OPEN` → `CLOSED`), target recruitment adjustments, description edits.

**Frontend guide:** Partial update, same pattern as patient update. Pass `?user_id=<researcher_id>` — every changed field is audit-logged automatically.

**Responses:** `200` → `TrialResponse`, `404` if not found.

---

#### `GET /trials/{trial_id}`

> **Business purpose:** Trial detail view — includes the full nested `criteria` array.

**Responses:** `200` → `TrialResponse`, `404` if not found.

---

### Matching — `/matching`

> Read §1.2 above before building against this section — the GET vs. POST distinction is load-bearing, not incidental.

#### `GET /matching/patient/{patient_id}/trial/{trial_id}`

> **Business purpose:** "How well would this patient match this trial, right now?" — an on-demand, no-side-effects lookup.

**Frontend guide:** Safe to call on every keystroke of a live comparison tool, or when a researcher clicks into a candidate row for a quick preview. `screening_id` and `screened_at` will be `null` in the response — use their presence/absence as your UI's signal for "has this been officially screened yet."

**Response:** `200` →
```json
{
  "data": {
    "screening_id": null,
    "patient_id": "P014",
    "trial_id": "T007",
    "vitals_id": 55,
    "match_percentage": 87.3,
    "verdict": "NEEDS_REVIEW",
    "eligible": true,
    "criteria_snapshot": {
      "criteria_used": [ /* full criteria list as scored */ ],
      "explanations": [
        { "field": "hba1c", "type": "SOFT", "passed": true, "score": 8.7, "max_score": 10.0, "message": "HbA1c 6.8 vs ideal 6.5 (tolerance 1.0)" }
      ]
    },
    "screened_at": null
  }
}
```
`404` if patient or trial doesn't exist.

---

#### `POST /matching/screen/`

> **Business purpose:** The "official" screening action — permanently records this specific match evaluation and produces the `screening_id` a clinician needs to later verify or override the verdict. This is the FDA-compliance anchor point: everything downstream (dashboard counts, verification, exports) reads from rows created here.

**Frontend guide:** Trigger this from a deliberate user action — a "Screen Patient" or "Add to Trial Review Queue" button — never from a passive page load or polling loop, since every call creates a new permanent row (even for the same patient/trial pair, e.g. after new vitals come in).

**Request body:**
```json
{ "patient_id": "P014", "trial_id": "T007" }
```
**Response:** `200` → same shape as above, but `screening_id` and `screened_at` are populated. `404` if patient or trial doesn't exist.

---

#### `GET /matching/patient/{patient_id}/trials`

> **Business purpose:** "Which open trials is this patient currently eligible for?" — powers a patient-facing or care-coordinator "recommended trials" list.

**Frontend guide:** Non-persisting. Returns only trials where `eligible: true` (i.e. excludes hard-REJECTED trials), sorted by `match_percentage` descending. `gaps` lists specific soft-criteria shortfalls worth surfacing to a coordinator (e.g. "HbA1c slightly above ideal range") — good candidates for tooltip text on a lower-scoring result.

**Response:** `200` → array:
```json
[
  { "trial_id": "T007", "trial_name": "Type 2 Diabetes Study", "match_percentage": 87.3, "verdict": "NEEDS_REVIEW", "gaps": ["HbA1c 6.8 vs ideal 6.5"] }
]
```
`404` if patient doesn't exist.

---

#### `GET /matching/trial/{trial_id}/patients`

> **Business purpose:** "Which of my registered patients qualify for this trial?" — the researcher's core candidate-discovery screen; ranks the entire patient pool against one trial.

**Frontend guide:** Can be slow on a large patient database (scores every patient in memory — there's no pre-filtering at the DB level yet). Show a loading state; consider debouncing repeated calls. Non-persisting, sorted by `match_percentage` descending.

**Response:** `200` → array:
```json
[
  { "patient_id": "P014", "patient_name": "Jane Doe", "match_percentage": 87.3, "verdict": "NEEDS_REVIEW", "gaps": ["HbA1c 6.8 vs ideal 6.5"] }
]
```
`404` if trial doesn't exist.

---

### Enrollment — `/trials/{trial_id}/...`

> Read §1.4 above for the full state machine and the active-trial conflict rule before building the enrollment UI.

All five action endpoints below share this request/response shape:

**Query params:** `user_id: str = "SYSTEM"` (pass the real clinician ID), `reason: Optional[str]` (recommended for anything beyond routine invites — mandatory in spirit, not enforced server-side except on override).

**Response:** `200` → `EnrollmentResponse`:
```json
{ "enrollment_id": 12, "trial_id": "T007", "patient_id": "P014", "status": "ENROLLED", "invited_at": "...", "accepted_at": "...", "declined_at": null, "enrolled_at": "2026-08-16T09:00:00Z", "dropped_at": null }
```
`400` on an invalid state transition (message names the attempted old→new move) or the active-trial conflict.

| Endpoint | Business purpose | Frontend trigger |
|---|---|---|
| `POST .../invite/{patient_id}` | Coordinator formally invites a matched candidate | "Invite to Trial" button on a candidate row |
| `POST .../accept/{patient_id}` | Records the patient's agreement to join | Patient-facing accept flow, or coordinator logging a verbal/phone acceptance |
| `POST .../decline/{patient_id}` | Records refusal — terminal state | Patient declines, or coordinator marks unreachable/refused |
| `POST .../enroll/{patient_id}` | Finalizes enrollment — locks `active_trial_id` | "Confirm Enrollment" after acceptance and any final screening |
| `POST .../drop/{patient_id}` | Patient exits an active trial — may silently auto-promote the next waitlisted patient | "Withdraw Patient" action |

> **Frontend must-do after any `drop` call:** re-fetch both the enrollment list *and* `GET .../waitlist` — a drop can auto-enroll a waitlisted patient in the same request, so both views can change together.

---

#### `GET /trials/{trial_id}/waitlist`

> **Business purpose:** Shows the ordered backup queue for a full/competitive trial.

**Frontend guide:** No formal response schema — returns raw ORM fields. Expect: `waitlist_id`, `trial_id`, `patient_id`, `rank`, `match_percentage`, `status` (`WAITING`/`PROMOTED`/`REMOVED`), `created_at`. Sorted by `rank` ascending already — don't re-sort client-side unless you want a different order.

---

### Verification — `/verification`

> Read §1.3 above — this section only makes sense in the context of a `screening_id` produced by `POST /matching/screen/`.

#### `POST /verification/{screening_id}/verify`

> **Business purpose:** Clinician sign-off that they reviewed an AI verdict and agree with it — no change to the verdict itself, just a documented review.

**Frontend guide:** The "Approve as reviewed" button on a screening detail view. `remarks` is optional here — encourage but don't require it in your UI copy.

**Query params:** `verified_by: str` (required)
**Body:** `{ "remarks": "Looks correct, no concerns." }`
**Response:** `200` → `Verification` record. `400` if `screening_id` doesn't exist.

---

#### `POST /verification/{screening_id}/override`

> **Business purpose:** Clinician disagrees with the AI verdict and manually changes it — the core FDA-compliance action. Every override is permanently tied to a specific `screening_id`, a named clinician, and a mandatory written reason.

**Frontend guide:** `remarks` must be a **required, non-empty text field** in your form — the backend rejects the request without it (`400`). `override_verdict` should be a locked dropdown of exactly `APPROVED` / `NEEDS_REVIEW` / `REJECTED` (the backend validates against this exact set and rejects anything else with a clear message — but validate client-side too so the user gets instant feedback, not a round trip).

**Query params:** `verified_by: str` (required)
**Body:**
```json
{ "override_verdict": "APPROVED", "remarks": "Clinician confirmed eligibility despite borderline HbA1c; patient meets clinical judgment threshold." }
```
**Response:** `200` → `Verification` record. `400` if verdict invalid, remarks missing, or `screening_id` not found.

---

### Dashboard — `/dashboard`

#### `GET /dashboard/trials/{trial_id}`

> **Business purpose:** The single aggregate view of a trial's recruitment funnel — powers the researcher's main dashboard screen.

**Frontend guide:** Safe to poll — fully read-only. Stats are automatically deduplicated to each patient's **most recent** screening only, so re-screening the same patient multiple times never inflates the counts. `progress` is `enrolled / target * 100`, already rounded to 2 decimals; a `target` of `0` correctly shows `progress: 0.0` rather than a divide-by-zero or a misleading masked value.

**Response:** `200` →
```json
{
  "target": 100,
  "screened": 340,
  "approved": 58,
  "needs_review": 12,
  "rejected": 270,
  "enrolled": 41,
  "progress": 41.0,
  "top_exclusion_reasons": [ { "reason": "hba1c", "count": 89 } ],
  "top_candidates": [ { "patient_id": "P014", "score": 94.2 } ]
}
```
`404` if trial doesn't exist.

---

### Notifications — `/notifications`

> `delivery_status` (`SENT`/`FAILED`/`PENDING`) and `response` (`ACCEPTED`/`DECLINED`/`NONE`) are two independent fields — never conflate "was it delivered" with "how did the patient reply" in the UI.

#### `POST /notifications/send`

> **Business purpose:** Send an invite/reminder/update to a patient about a trial (simulated dispatch in the current build — no real SMS/email provider wired up yet).

**Request body:**
```json
{ "patient_id": "P014", "trial_id": "T007", "message": "You may be eligible for our Type 2 Diabetes study...", "channel": "SMS" }
```
**Response:** `200` → `NotificationResponse`. `400` if `patient_id`/`trial_id` doesn't exist (validated explicitly server-side, not just a raw DB error).

---

#### `GET /notifications/{patient_id}`

> **Business purpose:** Full notification history for one patient — a communication log.

**Frontend guide:** Returns `[]` for a patient with no notifications *or* a nonexistent patient — this endpoint does not distinguish the two with a `404`. If you need to confirm the patient exists, call `GET /patients/{patient_id}` separately.

**Response:** `200` → array of `NotificationResponse`.

---

#### `POST /notifications/{notification_id}/respond`

> **Business purpose:** Records the patient's reply to a notification (e.g. they tapped "Accept" in a text message link, or a coordinator logged a phone response).

**Frontend guide:** `response` is a locked enum client-side too — only `ACCEPTED` / `DECLINED` / `NONE` are accepted (server-side `Literal` type, invalid values are rejected with a validation error before reaching the database).

**Request body:** `{ "response": "ACCEPTED" }`
**Response:** `200` → `NotificationResponse`. `404` if `notification_id` doesn't exist.

---

### Exports — `/export`

Both endpoints return raw file bytes with `Content-Disposition: attachment` — **do not** call these with a JSON `fetch()`. Trigger them as direct browser downloads:

```js
// Simplest approach — works for both:
window.location.href = `${API_BASE}/export/trials/${trialId}/candidates.csv`;
// or, for more control (loading state, auth headers):
const res = await fetch(`${API_BASE}/export/trials/${trialId}/report.pdf`);
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = `report_${trialId}.pdf`; a.click();
```

#### `GET /export/trials/{trial_id}/candidates.csv`

> **Business purpose:** Spreadsheet handoff — the researcher needs to share a candidate list with a colleague, IRB, or CRO who doesn't use the platform.

**Contents:** One row per patient (deduplicated to their latest screening), columns: `Patient ID`, `Patient Name`, `Contact Phone`, `Match Percentage`, `Verdict`, `Eligible`, `Screened At`. Correctly returns a valid CSV with header row even for a trial with zero screenings (not a blank file).

**Response:** `200` → `text/csv` file. `500` with a generic message on failure (no internal error detail is leaked to the client).

---

#### `GET /export/trials/{trial_id}/report.pdf`

> **Business purpose:** A shareable, printable one-pager for stakeholder updates — funnel counts, progress percentage, top exclusion reasons.

**Response:** `200` → `application/pdf` file. `500` with a generic message on failure.

---

## Appendix: Enum Reference

| Field | Valid values |
|---|---|
| `TrialCriterion.classification` | `HARD`, `SOFT` |
| `TrialCriterion.data_type` | `NUMERIC`, `CATEGORICAL`, `BOOLEAN` |
| `ScreeningResult.verdict` | `APPROVED`, `NEEDS_REVIEW`, `REJECTED` |
| `Enrollment.status` | `INVITED`, `ACCEPTED`, `DECLINED`, `ENROLLED`, `DROPPED` |
| `Waitlist.status` | `WAITING`, `PROMOTED`, `REMOVED` |
| `Notification.delivery_status` | `SENT`, `FAILED`, `PENDING` |
| `Notification.response` | `ACCEPTED`, `DECLINED`, `NONE` |
