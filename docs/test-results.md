# Test Results

Results for the T01-T28 checklist (plan, Section 8) and the module checks in `SCBVS-Module-Todo.md`.
"Auto" means a Playwright or Vitest test; "Hand" means checked in the browser.
All runs use the test data (`npm run db:seed:test`) and a production build (`npm run build`, `npx next start`).

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

## 2. View Assistance History (6.0)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| T21 a name that does not exist shows "No record found." | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T22 a beneficiary with no claims shows "No assistance history for this beneficiary." | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| A claim recorded in Record Assistance appears in history right away | Auto (assistance journey test) | Pass | 11/03 | Claude Code (for Tagalicud) |
| Search works with partial names, any letter case and full names | Auto + Hand | Pass after fix | 11/03 | Claude Code (for Tagalicud) |

Notes:
- Bug fixed: searching a full name such as "Maria Reyes" returned "No record found." because the whole text was compared with each name field. The search now matches each word separately (`searchWhere` in `src/lib/beneficiaries.ts`, unit test in `tests/unit/beneficiaries.test.ts`). This also fixes the Manual ID search on the Verify and Record Assistance screens, which use the same API.
- Letter case is ignored for A-Z only. SQLite treats "Ñ" and "ñ" as different, so a search for "peña" will not find "PEÑA".

## 3. Manage User Accounts (9.0)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| T25 a duplicate username shows "That username is already taken." | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T26 Admin cannot deactivate their own account; it stays Active | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| Staff cannot open `/admin/users` (sent to the dashboard) | Auto (T04) | Pass | 11/03 | Claude Code (for Tagalicud) |
| A Staff session calling `POST /api/users` or `PATCH /api/users/[id]` is refused (403) | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| A new account can sign in; a deactivated one cannot | Auto (new test + T03) | Pass | 11/03 | Claude Code (for Tagalicud) |
| Password must be at least 8 characters, on create and on edit | Auto + Hand | Pass after fix | 11/03 | Claude Code (for Tagalicud) |

Notes:
- Bug fixed: on Edit account, a new password under 8 characters showed "Please fix the highlighted fields." but no field was highlighted. The password and full name fields now show their error message.

## 4. Verify Senior Citizen Identity (3.0)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| T13 a registered member faces the camera and the match is confirmed | Hand (webcam) | Not run yet | | |
| T14 an unregistered person gets "no match" and manual ID is offered | Hand (webcam) | Not run yet | | |
| Match logic: a near-identical face vector matches the right record; an unrelated one gets no match | Auto (API, made-up face vectors) | Pass | 11/03 | Claude Code (for Tagalicud) |
| T15 face models fail to load, so manual ID is offered | Auto (model files blocked in the browser) | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| A record with no face data is flagged and verified through manual ID | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| Ambiguous match: a face close to two records returns both and asks for extra verification | Auto (API) | Pass | 11/03 | Claude Code (for Tagalicud) |

Notes:
- Bug fixed: when the model files could not be loaded, the face library only logged the errors, so the screen stayed on "Starting camera and loading face models..." and never offered manual ID. `FaceCamera` now checks that every model loaded and switches to manual ID if not. With the models present, loading still works.
- The automated face checks use made-up number vectors instead of a camera, so they test the matching and the screens around it, not the face reading itself. T13 and T14 still need a person in front of the webcam.
- The ambiguous screen (the warning and the two records) is only reached through the camera, so it was checked through the API, not on screen.
- Tests ran against a separate database (`DATABASE_URL` pointing to a scratch file); the real `dev.db` was not touched.
