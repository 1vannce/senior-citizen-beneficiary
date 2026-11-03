# Test Results

Results for the T01-T28 checklist (plan, Section 8) and the module checks in `SCBVS-Module-Todo.md`.
"Auto" means a Playwright or Vitest test; "Hand" means checked in the browser.
All runs use the seed data (`npm run db:seed`) and a production build (`npm run build`, `npx next start`).

## 1. Login (10.0)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| T01 wrong password shows an error and allows a retry | Auto + Hand | Pass | 11/03 | Claude Code (for Tagalicud) |
| T02 5 wrong passwords lock the account, "contact the Administrator" message | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T03 deactivated account is denied | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T04 Staff does not see User Accounts, Beneficiary Records or Reports, and is sent to the dashboard when typing those addresses | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| Idle timeout: still signed in at 14 minutes, signed out after 15 | Auto (fake browser clock, limit left at 15) | Pass | 11/03 | Claude Code (for Tagalicud) |
| Admin unlocks the locked account from Admin > Users, then the user can sign in | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |

Notes:
- The idle test moves the browser clock forward instead of waiting 15 real minutes. The server session also expires after 15 minutes (`maxAge` in `src/lib/auth.ts`).
- Usability finding for section 11: login text is 14px and the error message is 13px at 1024px wide, below the 18px minimum in `AGENTS.md`. The root font is `clamp(14px, 0.8333vw, 16px)` in `globals.css`, so this affects every screen.
