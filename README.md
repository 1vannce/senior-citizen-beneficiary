# SCBVS Prototype

Senior Citizen Beneficiary Verification System. Working prototype for PC-317 IHCI. **Fake test data only.**

Next.js 15, TypeScript, Tailwind, Prisma + SQLite, next-auth (credentials), `@vladmandic/human` (in-browser face recognition).

## Run

Needs Node.js 20+, a webcam, and Chrome or Edge.

```bash
npm install
cp .env.example .env        # already present if you cloned this folder as-is
npx prisma migrate dev      # creates prisma/dev.db
npm run db:seed             # test users, programs, 10 fake beneficiaries (resets the data)
npm run dev                 # http://localhost:3000
```

Allow camera access when the browser asks. `localhost` works without HTTPS.

## Test accounts

| Username | Password | Role |
|---|---|---|
| admin | Admin@123 | ADMIN |
| staff1 | Staff@123 | STAFF |
| staff2 | Staff@123 | STAFF |

Seed data: programs Pension (90 days), Medical (90), Grocery (30) and Burial (inactive, for T18). Beneficiary "Maria Santos Reyes" already has a recent Pension claim, so she is ineligible for Pension (T16). Seeded beneficiaries have no face data; register new people (for example the group members) to test face matching.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Vitest unit tests: eligibility, face matching, validators |
| `npm run e2e` | Playwright: T01 to T04, assistance journey, T16. Run `npm run db:seed` first and again before re-running |
| `npm run db:seed` | Reset the database to the seed data |
| `npm run db:reset` | Drop, migrate and seed from scratch |

Face tests (T09 to T15) are manual with a webcam.

Run the E2E tests against a production build (`npm run build`, then `npx next start`). Under `npm run dev`, on-demand compilation can show a "Runtime SyntaxError" overlay that blocks the page and fails random tests.

## Face matching

- Only the face embedding is stored, never a photo.
- Cosine similarity, threshold `FACE_MATCH_THRESHOLD` in `.env` (starts at 0.55). Tune it using the Phase 6 accuracy test, then restart the dev server.
- Two records within 0.03 of the best score are treated as ambiguous and the staff is sent to ID verification.
- Liveness uses Human's antispoof and liveness models (score of at least 0.5 each). Adjust `LIVENESS_MIN` in `src/components/face/FaceCamera.tsx` if real faces are rejected or photos pass.
- Model files are served from `public/models` so the app works offline.

## Notes and prototype decisions

- **Ongoing transaction (T23):** there is no in-progress claim state in the data model, so a claim released in the last 10 minutes counts as ongoing and blocks deactivation (`ONGOING_TRANSACTION_MINUTES` in `src/lib/beneficiaries.ts`).
- **Session timeout:** 15 minutes idle. `IdleTimer` signs out and refreshes the session cookie while the user is active.
- **Locked accounts:** Admin unlocks them from Admin > Users.
- **Styling:** follows the Figma file. Staff and Admin have separate visual languages, set by `.theme-staff` and `.theme-admin` in `src/app/globals.css`; the shared classes read those variables. Sizes are in rem and the root font scales with the screen width, so the 1920 x 1080 frames fit a laptop. Icons are `lucide-react`.
- **Registration fields:** the wizard asks for more than the data model stores. Suffix, birthplace, civil status, email, emergency contact and the ID details are validated and shown on the review step but not saved yet. City and province are saved inside the address, and the voucher number inside the claim remarks.
- **Login role buttons:** visual only. The role comes from the account.
- Pages live in the `src/app/(app)/` route group so they share the logged-in layout. URLs are unchanged.
