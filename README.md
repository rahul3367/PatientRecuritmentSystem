# AegisTrial

AegisTrial is a clinical trial recruitment platform that connects patients with trials they're eligible for and gives researchers an AI-assisted way to build eligibility criteria, screen candidates, and keep a human-in-the-loop audit trail on every decision.

**Stack:** FastAPI · PostgreSQL · SQLAlchemy · React (Vite) · Groq (`llama-3.3-70b-versatile`)

---

## What it does

- **AI Trial Builder** — Researchers upload a protocol (PDF or plain text) and an LLM drafts structured eligibility criteria. Nothing is written to the database until a human reviews and confirms the draft.
- **Patient–trial matching engine** — Scores a patient against a trial's hard (exclusionary) and soft (preference) criteria, with a lightweight in-memory `GET` for live/exploratory checks and a persisted `POST` that creates an auditable `ScreeningResult` when a clinician deliberately screens a patient.
- **Human-in-the-loop verification** — Every AI verdict (`APPROVED` / `NEEDS_REVIEW` / `REJECTED`) can be signed off or overridden by a clinician. Overrides require mandatory remarks and are logged to an audit trail — built for FDA-style traceability.
- **Doctor license verification** — CSV-based license lookup for verifying researcher/doctor credentials without extra database tables.
- **Enrollment & notifications** — Patient invitations, enrollment tracking, and email notifications (OTP verification, new-trial alerts) via a templated email service.
- **Dashboards & exports** — Researcher-facing dashboards, screening logs, audit trail views, and data export endpoints.

## Project structure

```
AegisTrial/
├── backend/            FastAPI application
│   ├── api/             Route handlers (auth, trials, matching, enrollment, verification, ...)
│   ├── database/        Engine/session setup, schema upgrade, seed data
│   ├── matching/         Hard/soft criteria evaluation, scoring, verdicts, explainability
│   ├── models/           SQLAlchemy models
│   ├── schemas/          Pydantic request/response schemas
│   ├── services/         Business logic (auth, matching, verification, email, PDF export, ...)
│   ├── templates/        HTML email templates
│   ├── tests/            Pytest test suite
│   └── main.py           App entrypoint
├── frontend/            React + Vite client
│   └── src/
│       ├── pages/patient/       Patient-facing pages
│       ├── pages/researcher/    Researcher-facing pages
│       ├── components/          Shared UI components
│       ├── context/             Auth/app React context
│       └── services/api/        API client layer
├── API_DOCUMENTATION.md   Full endpoint reference and workflow diagrams
└── api_endpoints_reference.md
```

## Getting started

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL

### Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL and LLM_API_KEY
uv sync                 # or: pip install -r requirements.txt
uv run uvicorn backend.main:app --reload
```

The API runs at `http://127.0.0.1:8000`, with interactive Swagger docs at `http://127.0.0.1:8000/docs`.

### Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_API_BASE_URL
npm install
npm run dev
```

### Running tests

```bash
cd backend
pytest
```

## Environment variables

**`backend/.env`**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `LLM_API_KEY` | API key for the LLM provider (Groq/Anthropic) used by the AI Trial Builder |
| `LLM_MODEL` | Model name (default: `llama-3.3-70b-versatile`) |
| `UPLOAD_DIRECTORY` | Directory for uploaded protocol files |
| `ENVIRONMENT` | `development` / `production` |
| `EMAIL_ENABLED`, `SMTP_*`, `EMAIL_FROM*` | Email/OTP notification settings |

**`frontend/.env`**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API |

## Documentation

See [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) for the full endpoint reference, including the AI trial-builder flow, the in-memory-vs-persisted matching distinction, and the human-in-the-loop verification/override flow.

## License

TBD