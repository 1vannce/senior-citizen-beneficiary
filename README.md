# SCBVS

Senior Citizen Beneficiary Verification System, the PC-317 IHCI final project.

**Privacy:** real senior citizen records are entered through the app and stay in the local database (`prisma/dev.db`, not committed). Never put real personal data in this repository; it is public.

Next.js 15, TypeScript, Tailwind, Prisma + SQLite, next-auth (credentials), `@vladmandic/human` (in-browser face recognition).

## Run

Needs Node.js 20+, a webcam, and Chrome or Edge.

```bash
npm install
cp .env.example .env        # then fill in NEXTAUTH_SECRET and the three SEED_*_PASSWORD values
npx prisma migrate dev      # creates prisma/dev.db and runs the seed
npm run db:seed             # starting accounts and programs; safe to run again
npm run dev                 # http://localhost:3000
```

Allow camera access when the browser asks. `localhost` works without HTTPS.

## Accounts

`npm run db:seed` creates these accounts with the starting passwords from `.env` (`SEED_ADMIN_PASSWORD`, `SEED_STAFF1_PASSWORD`, `SEED_STAFF2_PASSWORD`). Admin can change any password in Admin > Users.

| Username | Name | Role |
|---|---|---|
| admin | OSCA Administrator | ADMIN |
| staff1 | OSCA Releasing Staff | STAFF |
| staff2 | OSCA Registration Staff | STAFF |

It also adds the programs Pension (90-day restricted period), Medical (90), Grocery (30) and Burial (365). It starts with no beneficiaries; register them in the app.

## Test data

`npm run db:seed:test` **erases the database** and loads made-up data for the automated tests. Use it only on a development copy, never on the real records. It sets the passwords `Admin@123` (admin) and `Staff@123` (staff1, staff2), makes Burial inactive (T18) and adds 10 made-up beneficiaries. "Maria Santos Reyes" already has a recent Pension claim, so she is ineligible for Pension (T16). Test beneficiaries have no face data.

To keep the real records, run the automated tests against a separate database file. Stop the normal server first, then in Git Bash:

```bash
export DATABASE_URL="file:./e2e.db"   # prisma/e2e.db, ignored by git
npx prisma migrate deploy
npm run db:seed:test
npm run build && npx next start      # in this terminal; run `npm run e2e` in another
```

Settings already in your shell win over `.env`, so this server and seed use `e2e.db` and leave `dev.db` alone. Close the terminal afterwards so the normal server uses `dev.db` again.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Vitest unit tests: eligibility, face matching, validators, beneficiary search |
| `npm run e2e` | Playwright: T01 to T04, idle sign-out, user accounts (T25, T26), verify (face match logic, flagged record, T15), assistance journey, T16, T21, T22. Run `npm run db:seed:test` first and again before re-running, on a separate database (see Test data) |
| `npm run db:seed` | Add the starting accounts and programs; existing records are kept |
| `npm run db:seed:test` | **Erase** the database and load the test data |
| `npm run db:reset` | **Erase** the database, migrate and seed the starting accounts |

Face tests (T09 to T15) are manual with a webcam.

Run the E2E tests against a production build (`npm run build`, then `npx next start`). Under `npm run dev`, on-demand compilation can show a "Runtime SyntaxError" overlay that blocks the page and fails random tests.

## Face matching

- Only the face embedding is stored, never a photo. It is a list of numbers saved as plain text in the local SQLite file, not encrypted (the narrative says "encrypt"). Protect the laptop with a Windows password and BitLocker drive encryption, and keep backups of `prisma/dev.db` just as safe.
- Cosine similarity, threshold `FACE_MATCH_THRESHOLD` in `.env`. It is still the starting value 0.55: the webcam accuracy test (to-do section 12) has not been run yet. After the test, put the chosen value and the reason here, in `.env` and in `.env.example`, then restart the server.
- Two records within 0.03 of the best score are treated as ambiguous and the staff is sent to ID verification.
- Liveness uses Human's antispoof and liveness models (score of at least 0.5 each). Adjust `LIVENESS_MIN` in `src/components/face/FaceCamera.tsx` if real faces are rejected or photos pass.
- Model files are served from `public/models` so the app works offline.

## Notes and design decisions

- **Ongoing transaction (T23):** there is no in-progress claim state in the data model, so a claim released in the last 10 minutes counts as ongoing and blocks deactivation (`ONGOING_TRANSACTION_MINUTES` in `src/lib/beneficiaries.ts`).
- **Session timeout:** 15 minutes idle. `IdleTimer` signs out and refreshes the session cookie while the user is active.
- **Locked accounts:** Admin unlocks them from Admin > Users.
- **Styling:** follows the Figma file. Staff and Admin have separate visual languages, set by `.theme-staff` and `.theme-admin` in `src/app/globals.css`; the shared classes read those variables. Sizes are in rem and 1rem is 18px, the smallest text size for older users, so text is larger than in the Figma frames (16px). Layouts were adjusted to fit a 1280px-wide browser, which is a 1920 x 1080 laptop at 150% scaling. Icons are `lucide-react`.
- **Registration fields (decided 11/03):** every field the wizard asks for is saved: suffix, birthplace, civil status, email, emergency contact and the ID details (type, place of issue, issue and expiry dates). The registration API checks them with the same rules as the form (`registerSchema`). City and province are saved inside the address, and the voucher number inside the claim remarks. Records saved before this change show "Not recorded" for these fields. Since module 9 they can also be edited from Manage Records, with the same rules.
- **Privacy notice:** the consent step says the facial data is used only for identity checks, stores no photo, is voluntary (declining means manual ID, not refusal of service), and names the RA 10173 rights to see, correct or withdraw.
- **Manage Records (decided 11/03):** the Reactivate action is kept (Admin only, reason required, logged). An edit lists the changed fields in the change log, and a save with no change is refused. Deactivating for "Other" needs a description.
- **Face data after registration (decided 11/03):** on the record page an Administrator can **Remove face data** when a senior withdraws consent (the template is deleted and the record goes back to manual ID) and **Capture face data** for a record that has none, after the senior consents. Capture uses the same camera and duplicate-face check as registration. Both are logged.
- **Text size and contrast (decided 11/03):** text is at least 18px on every screen and grey text has at least 4.5:1 contrast. See Styling above.
- **Login page:** shows no photo of people. The earlier photo of real seniors was removed from the app (it remains in old commits).
- **Login role buttons:** visual only. The role comes from the account.
- Pages live in the `src/app/(app)/` route group so they share the logged-in layout. URLs are unchanged.
