# AGENTS.md

Guidance for AI coding agents working in this repo. Humans: see `README.md` for setup and test accounts.

## Project

Senior Citizen Beneficiary Verification System (SCBVS), a school prototype for PC-317 IHCI. It runs on one laptop with a webcam and uses **fake test data only**. It is not for real deployment. The full plan is in `../SCBVS-Prototype-Plan.md` (use cases, phases, the T01-T28 test checklist).

Stack: Next.js 15 (App Router), TypeScript, Tailwind 4, Prisma 6 + SQLite, next-auth (credentials) + bcryptjs, `@vladmandic/human` (in-browser face recognition), react-hook-form + Zod, TanStack Table, papaparse. All code is TypeScript; do not add Python.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run build
npm run lint
npm test             # Vitest unit tests (tests/unit)
npm run e2e          # Playwright (tests/e2e); run `npm run db:seed` first and before each re-run
npm run db:seed      # resets the DB to seed data
npm run db:reset     # drop, migrate, seed
npx prisma migrate dev --name <name>   # after editing prisma/schema.prisma
```

Run E2E against a production build (`npm run build` then `npx next start`). Under `next dev`, on-demand compilation can fail random tests.

Test accounts: `admin / Admin@123` (ADMIN), `staff1` and `staff2 / Staff@123` (STAFF).

## Layout

- `src/app/(app)/` logged-in pages (route group, shared layout). `src/app/api/` route handlers. `src/app/login/` public.
- `src/components/` shared UI. `face/FaceCamera.tsx` is the webcam + Human wrapper. `ui.tsx` holds shared primitives.
- `src/lib/` business logic: `eligibility.ts`, `face.ts` (cosine similarity, threshold), `claims.ts`, `beneficiaries.ts`, `validators.ts` (Zod), `audit.ts`, `session.ts`, `auth.ts`, `db.ts`, `constants.ts`.
- `prisma/` schema, migrations, `seed.ts`. `public/models/` Human model files (served offline).
- `tests/unit/` and `tests/e2e/`.

## Conventions

- Put rules in `src/lib/`, not in components or route handlers, and cover them with a Vitest test.
- Guard pages with `requirePageUser()` and API routes with `requireApiUser()` (`src/lib/session.ts`). Pass `"ADMIN"` for admin-only. Validate request bodies with the Zod schemas in `validators.ts`.
- Every change to a record writes an `AuditLog` row via `writeAudit()` with user, action, entity and reason. Pass the transaction client when inside `db.$transaction`.
- Beneficiaries and users are **deactivated, never deleted**, so past claims stay.
- Store face **embeddings only**, never photos. One `FaceData` per beneficiary, with the consent date.
- Styling follows the Figma file. Staff and Admin use `.theme-staff` / `.theme-admin` CSS variables in `globals.css`. Sizes are in rem. Keep text large and high contrast (older users, 18px minimum).
- Read `node_modules/next` docs or existing code before using Next 15 / React 19 APIs; do not assume older behavior.
- Match existing naming, formatting and comment density. Keep changes small and focused; no new dependencies without a clear need.

## Do not

- Commit or print `.env` values. Edit `.env.example` for new variables.
- Use real personal data anywhere, including seeds and tests.
- Hand-edit `prisma/dev.db`, `.next/`, or generated files. Use migrations and the seed script.
- Change the face threshold (`FACE_MATCH_THRESHOLD`) or liveness limits without saying why; they are tuned by testing.

## Verifying work

- Logic changes: `npm test`. Types and style: `npm run lint` and `npx tsc --noEmit`.
- UI or flow changes: open the page in the browser and exercise it; build success alone is not enough.
- Face flows (checklist T09-T15) need a real webcam. State plainly when you could not test them.

## Prompt template

Use `docs/prompt-template.md` when writing a task for an agent.
