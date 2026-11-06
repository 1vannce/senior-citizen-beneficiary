# Project Structure Guide

This guide explains what each folder in the repository is for and how the parts connect. It is written for anyone browsing the code for the first time, including our instructor.

## The big picture

SCBVS (Senior Citizen Beneficiary Verification System) helps OSCA staff confirm a senior citizen's identity with **face recognition** before releasing assistance.

It is one **Next.js** app. The pages and the server code (API routes) live in the same project, and the data is kept in a local **SQLite** database through **Prisma**.

```text
 Browser                                    Next.js server                     Database
 ───────                                    ──────────────                     ────────
 Page (React)  ──fetch /api/...──>  API route  ──>  src/lib helpers  ──>  Prisma  ──>  SQLite (prisma/dev.db)
 Webcam + face models (public/models)
   └─ turns a face into a list of numbers (embedding) inside the browser. No photo is uploaded or saved.
```

| Part | Technology | Job |
| --- | --- | --- |
| Pages and UI | Next.js 15 App Router, React, Tailwind | Screens for Staff and Admin |
| Server | Next.js API routes (`src/app/api/`) | Business rules, permission checks, saving data |
| Login | next-auth (username and password) | Sessions and roles (STAFF, ADMIN) |
| Database | Prisma + SQLite | Users, beneficiaries, face data, programs, claims, audit log |
| Face recognition | `@vladmandic/human`, runs in the browser | Face detection, liveness check, face embedding |
| Tests | Vitest (unit), Playwright (end to end) | Automated checks |

## Folder map

```text
senior-citizen-beneficiary-system/
├── .github/workflows/ci.yml   # GitHub Actions: install, set up the database, lint, type check, unit tests, build
├── docs/
│   ├── ActivityDiagram/       # One activity diagram (SVG) per use case, named <Member>-<Use-Case>.svg
│   ├── test-results.md        # Test cases T01 to T28 and their results
│   ├── prompt-template.md     # Template for asking AI assistants for scoped changes
│   └── PROJECT_STRUCTURE.md   # This guide
├── prisma/                    # DATABASE (see "Database" below)
├── public/
│   ├── models/                # Face recognition model files, served locally so the app works offline
│   └── images/osca-seal.png   # OSCA seal used in the UI
├── src/                       # All application code (see below)
├── tests/
│   ├── unit/                  # Vitest tests for the logic in src/lib (eligibility, face matching, validators, reports)
│   └── e2e/                   # Playwright tests that click through the real app (login, register, verify, assistance...)
├── .env.example               # Required settings with no real values. Copy to .env.
├── next.config.ts             # Next.js settings
├── playwright.config.ts       # End-to-end test settings
├── prisma.config.ts           # Prisma settings (schema path, migrations folder, database URL)
├── vitest.config.ts           # Unit test settings
├── AGENTS.md, CLAUDE.md       # Rules for AI coding assistants used on this project
└── README.md                  # How to run, accounts, commands, and design decisions
```

## Inside `src/`

```text
src/
├── app/                           # PAGES AND API. Each folder is a URL.
│   ├── layout.tsx                 # The outer frame of every page (fonts, global styles)
│   ├── page.tsx                   # "/" simply redirects to /dashboard
│   ├── globals.css                # Tailwind plus the separate Staff and Admin color themes
│   ├── login/page.tsx             # Login screen (public)
│   │
│   ├── (app)/                     # Logged-in pages. "(app)" is a group name, so it does not appear in the URL.
│   │   ├── layout.tsx             # Checks the user is logged in, then adds the sidebar (AppShell) and the 15-minute idle timer
│   │   ├── dashboard/             # Home page after login
│   │   ├── beneficiaries/         # List of senior citizens (search, filter)
│   │   │   ├── register/          # Registration wizard, including consent and face capture
│   │   │   └── [id]/              # One senior's record: view, edit, deactivate, face data. [id] is the record ID in the URL.
│   │   │       └── history/       # That senior's past assistance claims
│   │   ├── verify/                # Verify identity by face, or by ID if face fails
│   │   ├── eligibility/           # Check if a senior can claim a program today
│   │   ├── assistance/new/        # Release assistance: verify, check eligibility, then record the claim
│   │   ├── history/               # Search assistance history across all seniors
│   │   ├── reports/               # Masterlist and claim reports, export to CSV
│   │   └── admin/users/           # Manage staff accounts (Admin only)
│   │
│   └── api/                       # SERVER ENDPOINTS called by the pages
│       ├── auth/[...nextauth]/    # Login and logout (handled by next-auth)
│       ├── beneficiaries/         # GET search, POST register
│       │   └── [id]/              # PATCH edit record
│       │       ├── status/        # POST deactivate or reactivate (records are never deleted)
│       │       └── face/          # POST capture or DELETE remove face data
│       ├── face/match/            # POST a face embedding, get back the best matching senior and score
│       ├── eligibility/           # POST check eligibility for a program
│       ├── assistance/            # POST record a claim (only if identity and eligibility both pass)
│       ├── reports/               # GET report data
│       └── users/                 # POST create user; [id]/ PATCH edit, deactivate, or unlock a user
│
├── components/                    # Reusable UI pieces
│   ├── AppShell.tsx               # Sidebar and top bar around every logged-in page
│   ├── face/FaceCamera.tsx        # Opens the webcam, checks liveness, and produces the face embedding
│   ├── VerifyIdentity.tsx         # The face-or-ID verification step reused by several pages
│   ├── EligibilityChecks.tsx      # Shows each eligibility check as passed or failed
│   ├── DataTable.tsx              # Searchable table used by lists and reports
│   ├── IdleTimer.tsx              # Signs the user out after 15 idle minutes
│   ├── SignOutButton.tsx          # Logout button
│   └── ui.tsx                     # Small shared pieces: PageHeader, Stepper, StatusBadge
│
├── lib/                           # BUSINESS LOGIC used by the API routes. Most unit tests target this folder.
│   ├── db.ts                      # The one Prisma database client
│   ├── auth.ts                    # next-auth setup: password check, failed-login lockout, session settings
│   ├── session.ts                 # getCurrentUser(), requirePageUser(), requireApiUser(): who is logged in and their role
│   ├── face.ts                    # Face matching math: cosine similarity, threshold (0.55), ambiguous-match margin
│   ├── beneficiaries.ts           # Search, face match against all records, name helpers
│   ├── eligibility.ts             # Eligibility rules: program is active, record is not deactivated, waiting period has passed
│   ├── claims.ts                  # Runs the eligibility check against the database before a claim is saved
│   ├── reports.ts                 # Report date ranges and CSV export
│   ├── validators.ts              # Zod rules for every form (registration, edits, users)
│   ├── audit.ts                   # writeAudit(): records who did what, for the audit log
│   ├── constants.ts               # Fixed values: roles, verification methods, statuses
│   ├── format.ts                  # Date and name display helpers
│   └── types.ts                   # Data shapes shared by API routes and pages
│
└── types/next-auth.d.ts           # Adds role and user ID to the next-auth session type
```

## Database

```text
prisma/
├── schema.prisma          # The data model: User, Beneficiary, FaceData, Program, AssistanceClaim, AuditLog
├── migrations/            # SQL history of database changes (applied with npx prisma migrate)
├── seed.ts                # Starting accounts (admin, staff1, staff2) and programs (Pension, Medical, Grocery, Burial)
└── seed-test.ts           # ERASES the database and loads made-up test data. Only for automated tests.
```

The real database file `prisma/dev.db` is **not** in the repository, because it would hold real senior citizen data.

| Table | What it stores |
| --- | --- |
| `User` | Staff and Admin accounts |
| `Beneficiary` | Senior citizen records |
| `FaceData` | The face embedding (numbers only, no photo) linked to a beneficiary |
| `Program` | Assistance programs and their waiting period in days |
| `AssistanceClaim` | Each release of assistance and how identity was verified |
| `AuditLog` | Who did what and when |

## Use cases and where they live

Each team member owns two use cases. This table shows where each one is in the code.

| Use case | Owner | Page | API |
| --- | --- | --- | --- |
| Login | Miparanum | `app/login/` | `api/auth/` |
| View Assistance History | Miparanum | `app/(app)/history/`, `beneficiaries/[id]/history/` | `api/beneficiaries/` |
| Register Senior Citizen | Tagalicud | `app/(app)/beneficiaries/register/` | `POST api/beneficiaries/` |
| Capture Facial Data | Tagalicud | `components/face/FaceCamera.tsx` | `api/beneficiaries/[id]/face/` |
| Manage User Accounts | Destriza | `app/(app)/admin/users/` | `api/users/` |
| Verify Senior Citizen Identity | Destriza | `app/(app)/verify/` | `api/face/match/` |
| Manage Senior Citizen Records | Gonzaga | `app/(app)/beneficiaries/[id]/` | `api/beneficiaries/[id]/` |
| Generate Reports | Gonzaga | `app/(app)/reports/` | `api/reports/` |
| Check Eligibility | Amores | `app/(app)/eligibility/` | `api/eligibility/` |
| Record Assistance | Amores | `app/(app)/assistance/new/` | `api/assistance/` |

The activity diagram for each use case is in `docs/ActivityDiagram/`.

## Follow one action: verifying a senior by face

1. Staff opens **Verify** (`src/app/(app)/verify/`).
2. `components/face/FaceCamera.tsx` opens the webcam and loads the models from `public/models/`.
3. In the browser, the models check that the face is live (not a printed photo) and turn it into an embedding, a list of numbers.
4. The page sends only that embedding to `POST /api/face/match`.
5. The API route checks the user is logged in (`lib/session.ts`) and validates the input (`lib/validators.ts`).
6. `lib/beneficiaries.ts` compares the embedding with every saved face using `lib/face.ts`. A score of 0.55 or higher is a match. If two records score almost the same, the result is "ambiguous" and staff must verify by ID instead.
7. The route returns the best match and its score. Staff confirms the identity on screen.

## Where to find things

| I want to see... | Look in |
| --- | --- |
| The data model | `prisma/schema.prisma` |
| A screen | `src/app/(app)/<page>/` |
| The server side of a screen | `src/app/api/<area>/route.ts` |
| Business rules (eligibility, face matching) | `src/lib/` |
| Login and permissions | `src/lib/auth.ts` and `src/lib/session.ts` |
| Form validation rules | `src/lib/validators.ts` |
| Activity diagrams | `docs/ActivityDiagram/` |
| Test results | `docs/test-results.md` and `tests/` |
| Automated checks on GitHub | `.github/workflows/ci.yml` |
