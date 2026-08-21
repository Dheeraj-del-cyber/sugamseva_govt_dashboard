# Sugam Seva — Digital Citizen Assistant

**Sugam Seva** ("easy service") is a Government of India platform for multilingual
access to government services and schemes. This repo contains the **Government
Official Dashboard** (the 9 screens you specified: Sign In, Sign Up, Dashboard,
Add User, List of Users, User Profile, Vote of Problems, Problem Details, and
Schemes), backed by a full FastAPI + PostgreSQL backend.

## What's in this repo

```
sugam-seva/
├── backend/          FastAPI + SQLAlchemy + PostgreSQL API
│   ├── app/
│   │   ├── routers/       auth, officials, users, problems, schemes, dashboard, biometric
│   │   ├── services/      biometric, ocr, ai (Claude), notify (FCM)
│   │   ├── models.py      SQLAlchemy ORM models
│   │   ├── schemas.py     Pydantic request/response schemas
│   │   ├── security.py    JWT auth + password hashing
│   │   ├── config.py      Settings / env vars
│   │   └── main.py        FastAPI app entrypoint
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/          React + TypeScript + Vite + Tailwind (Government Dashboard)
│   ├── src/
│   │   ├── pages/          SignIn, SignUp, Dashboard, AddUser, ListOfUsers,
│   │   │                   UserProfile, VoteOfProblems, ProblemDetails,
│   │   │                   Schemes, SchemeDetail, OfficialProfile
│   │   ├── components/     Sidebar, Header, Footer, Layout, UI primitives
│   │   ├── context/        AuthContext (JWT session)
│   │   └── api/client.ts   Axios client
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml
└── README.md (this file)
```

The **citizen-facing mobile app** (React Native + Expo, per the tech-stack image)
is a separate client that talks to the same backend API — the backend here is
already shaped for it (all endpoints are plain JSON over REST), but building
out the actual Expo app is a good next milestone once the dashboard/backend
are validated. See "What's simulated vs. real" below for why it isn't included
in this drop.

## Quick start (local, no Docker)

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
cp .env.example .env       # defaults already run in DEMO_MODE
uvicorn app.main:app --reload --port 8000   # creates an empty sugamseva.db on first run
```

API docs: http://localhost:8000/docs
No officials exist until you register one — use the Sign Up screen (or `POST /auth/register`) to create the first official account.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # points VITE_API_BASE_URL at localhost:8000
npm run dev
```

Open http://localhost:5173 and sign up to create your first official account.

## Quick start (Docker Compose)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000/docs
- PostgreSQL: localhost:5432 (user/pass/db: `sugamseva`)

## Tech stack (matches your brief)

| Layer | Choice |
|---|---|
| Citizen app frontend | React Native + Expo *(not built out in this drop — see below)* |
| Dashboard frontend | React + TypeScript + Vite, Tailwind CSS, React Router, Recharts, Axios |
| Backend | Python + FastAPI |
| Database | PostgreSQL (SQLite by default for zero-config local dev) |
| AI | Claude LLM API (scheme summaries + suggestions) |
| Document verification | PaddleOCR (mocked) |
| Biometric | Fingerprint capture/verification (mocked, swappable for a certified RD-service device) |
| Notifications | Firebase FCM (mocked) |
| Deployment | Docker, docker-compose (Kubernetes/NIC MeghRaj manifests can be layered on top) |

## What's simulated vs. real — and why

Several of the integrations you listed **require credentials and partnerships
that only your organisation can obtain** — they can't be fabricated or reverse
engineered:

- **Biometric hardware** — a real Aadhaar-grade fingerprint match needs an
  STQC-certified RD-service device driver; this can't be simulated in software.
- **Firebase** — needs your own Firebase project server key.
- **Claude LLM API** — needs an `ANTHROPIC_API_KEY`; without one the AI
  scheme-summary and suggestion endpoints fall back to a clear templated
  response so the UI still works end-to-end.

Every one of these lives behind a small service module in `backend/app/services/`
with a `DEMO_MODE` flag. In demo mode, each module returns a realistic simulated
response so **the entire product — sign up, biometric capture, document
verification, voting, scheme matching, AI suggestions — works and can be
demoed today**, with the codebase already shaped for you to drop real
credentials into `.env` and flip `DEMO_MODE=false` once you're onboarded.

## Security notes implemented per your brief

- A citizen's vote, once cast, cannot be reverted (`problems.py` enforces a
  unique constraint + explicit check).
- A problem, once added, cannot be deleted (no delete endpoint exists).
- Scanned documents are never returned in list/profile views — only the
  document type and a `verified` boolean. Viewing the underlying (encrypted)
  scan reference requires a **fresh** fingerprint verification token
  (`/users/{id}/documents/{doc_id}/reveal`).
- Marking a citizen's reported problem "solved" requires **the citizen's own**
  fingerprint verification, so an official can't do it unilaterally or by
  mistake.
- A scheme can only be used once per citizen per calendar year
  (`SchemeUsage` has a unique constraint on `scheme_id + citizen_id + year`).


## Next steps to take this to production

1. Get Firebase credentials and drop them into
   `backend/.env`, then set `DEMO_MODE=false`.
2. Swap SQLite for PostgreSQL (already the default in `docker-compose.yml`)
   and run Alembic migrations instead of `Base.metadata.create_all`.
3. Put Keycloak in front of `/auth` for proper SSO/RBAC across officials.
4. Build the citizen-facing React Native + Expo app against the same API.
5. Move file/document storage to an encrypted object store (S3-compatible +
   KMS) instead of the placeholder `vault://` references used here.
6. Containerize and deploy to NIC MeghRaj / your government cloud tenancy,
   fronted by TLS and a WAF.
