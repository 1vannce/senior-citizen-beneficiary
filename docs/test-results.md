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

## 5. Register Senior Citizen (1.0)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| T05 a missing required field is highlighted and the step does not advance | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T06 a birth date that makes the applicant 59 is blocked | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| T07 declining consent saves the record without face data and flags it for manual verification | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T08 the same OSCA ID twice is blocked and the existing record is shown | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| Every registration field is saved and shown on the record page | Auto (T07) + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| Consent notice checked against RA 10173 principles | Review + Hand | Updated | 11/03 | Claude Code (for Tagalicud) |

Notes:
- Decision: the extra registration fields are now saved (migration `save_registration_details`, new empty columns only). The registration API checks them with the same rules as the form, including a valid email address and real ID dates. See `README.md`.
- Consent notice: it already stated the purpose, who can access the data and that no photo is kept. It now also says consent is voluntary, that declining still gets the senior registered and served through manual ID, and names the RA 10173 rights to see, correct or withdraw.
- Gap: there is no action in the app to remove a senior's face data when they withdraw consent. Editing the new fields from Manage Records is also not built yet (Module 9).

## 6. Capture Facial Data (2.0)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| T09 no face in view shows "No face found. Please reposition and face the camera." | Auto (fake camera, real face models) + Hand (screenshot) | Pass | 11/03 | Claude Code (for Tagalicud) |
| T09 with a real person stepping out of view | Hand (webcam) | Not run yet | | |
| T10 a printed photo or a phone screen fails liveness | Hand (webcam) | Not run yet | | |
| T11 3 failed tries, then manual verification, flags the record and saves no face data | Auto (fake camera) | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| T12 (logic) a second capture of a registered face, under a new OSCA ID, is blocked and the existing record is returned; a different face is not blocked | Auto (API, made-up face vectors) | Pass | 11/03 | Claude Code (for Tagalicud) |
| T12 the same person registering twice in front of the webcam | Hand (webcam) | Not run yet | | |
| No photo is saved: database | Auto (scan of the test database after the full suite) | Pass | 11/03 | Claude Code (for Tagalicud) |
| No photo is saved: project folder | Hand (file search after the full suite) | Pass | 11/03 | Claude Code (for Tagalicud) |
| No photo is saved: request sent to the server | Code review + Auto (T11, no-consent request) | Pass | 11/03 | Claude Code (for Tagalicud) |
| Register all five group members | Hand (webcam) | Not run yet | | |

Notes:
- Bug fixed: the Capture button was enabled as soon as the camera started, before the first frame had been checked. A click in that moment was rejected with "Starting camera..." and used up one of the 3 tries. `FaceCamera` now enables the button, and shows "Camera ready", only after the first frame has been checked. The T11 test failed before the fix and passes after it.
- The fake camera shows a test pattern with no face, so T09 and T11 run on screen with the real face models. A face cannot be captured this way, so T12 was checked through the registration API with made-up face vectors, and the "already registered" message on screen was not reached.
- No photo, database: no table has a binary column, no stored text contains image data, and every `FaceData.embedding` is a list of numbers. Project folder: the only image files are the two UI images in `public/images/`. Request: `FaceCamera` only passes `face.embedding`, which the face library returns as a plain list of 1024 numbers (`Array.from` in its `faceres` code); no code turns a video frame into an image. The request with a real captured face was not inspected; check it in the browser's Network tab when registering the group members.
- In T11 the use case's "Cancel" is the "No, continue with manual verification" choice. After 3 failed tries the camera closes and only manual verification can continue.
- Tests ran against a separate database; the real `dev.db` was not touched (still 3 users, 4 programs, 0 seniors).

## 7. Check Eligibility (4.0)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| T16 a second Pension claim inside 90 days is ineligible (Maria Santos Reyes), with the date she is eligible again | Auto (eligibility screen and assistance journey) + unit + Hand (screenshot) | Pass | 11/03 | Claude Code (for Tagalicud) |
| T17 a deactivated beneficiary is ineligible | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| T18 the inactive Burial program makes no check and shows "No eligibility check was made" | Auto + unit + Hand (screenshot) | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| Boundary: a claim on 1 Aug with a 90-day period is ineligible until the end of 29 Oct and eligible from the start of 30 Oct, at any time of day | Unit | Pass after fix | 11/03 | Claude Code (for Tagalicud) |

Notes:
- Bug fixed (boundary): the rule added exactly 90 × 24 hours to the time of the last claim. A claim at 3 PM on 1 Aug was still blocked at 9 AM on 30 Oct, while the message said "Eligible again on 10/30/2026". The date was also shown in the server's time zone. The period now counts calendar days in Manila time, so the senior can claim from the start of the date in the message. The message now reads like "Eligible again on Friday, 30 Oct 2026" (`eligibleAgainOn` in `src/lib/eligibility.ts`, unit tests in `tests/unit/eligibility.test.ts`). The same rule is used when recording assistance.
- Bug fixed (T18 screen): for an inactive program the result said "No eligibility check was made" but still ticked "Active beneficiary record" and "Barangay coverage" as passed. Those checks now show "Not checked."
- T17 deactivates a new made-up record through the admin API, so the seeded records are not changed.
- Finding: "Barangay coverage" always passes. There is no barangay rule in the data model, so the check only shows the senior's barangay.
- Tests ran against a separate database; the real `dev.db` was not touched.

## 8. Record Assistance (5.0)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| T19 failed verification blocks saving: on screen identity cannot be confirmed without the ID check; through the API, a missing ID check, a missing face, an unknown face or another person's face is refused (403) and nothing is saved | Auto (screen + API, made-up face vectors) | Pass | 11/03 | Claude Code (for Tagalicud) |
| T20 a representative claim skips the face step, needs the representative's name and the ID and authorization check, and is saved as "Representative" | Auto + Hand (screenshot) | Pass | 11/03 | Claude Code (for Tagalicud) |
| Saving is refused when eligibility fails: the screen does not open the release form, and calling `/api/assistance` directly is refused (409) for a repeat claim, an inactive program and a deactivated record | Auto (screen + API) | Pass | 11/03 | Claude Code (for Tagalicud) |
| The same claim saved several times at once is recorded only once | Auto (4 requests at the same moment) | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| The new claim shows in the beneficiary's history (module 2) with the representative's name, and in the claims report (module 10) | Auto (T20 + assistance journey) | Pass | 11/03 | Claude Code (for Tagalicud) |

Notes:
- Bug fixed: the eligibility check ran before the save, outside the database transaction. Four Save requests sent together (a double click on a slow laptop, or two counters) were all accepted. That recorded 4 Grocery claims for one senior inside the 30-day period. The check now runs inside the same transaction as the save (`evaluateEligibility` in `src/lib/claims.ts` takes the transaction client). Now 1 request is saved and the other 3 get "not eligible" (409). This was checked 3 times by hand and is covered by a new Playwright test.
- A real face-match claim (verification method FACE) was checked through the API with made-up face vectors, not with the webcam.
- The "Continue to record assistance" button on the Check Eligibility screen does not carry the selected senior into Record Assistance. This is intended: identity must be verified again at the release counter.
- Finding for module 10: the claims report shows `releasedAt` as a UTC date, so a claim released before 8 AM Manila time is listed under the day before. The From and To filters use the server's local time.
- Tests ran against a separate database; the real `dev.db` was not touched.

## 9. Manage Senior Citizen Records (7.0)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| T23 deactivating right after a claim is blocked with the "transaction from the last 10 minutes" message; the record stays active and no log row is written | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| T24 an edit, a deactivation and a reactivation each write a change-log row with the user, date and time, action and reason; an edit also names the fields it changed | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| Saving an edit with no change is refused ("No changes to save."), so no empty log row is written | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| A deactivated record leaves the masterlist and the Active filter, appears in the inactive report, and keeps its past claims in history and in the claims report | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| Staff cannot open the record page (sent to the dashboard), and the edit, status and face-removal APIs refuse a Staff session (403) | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| Decision: reactivate | Hand + Auto (T24) | Kept | 11/03 | Claude Code (for Tagalicud) |
| Every registration field can be edited from Manage Records with the registration rules | Auto + unit + Hand (screenshot) | Pass (new) | 11/03 | Claude Code (for Tagalicud) |
| Remove face data on withdrawal of consent: needs a reason, deletes the face template, flags the record for manual ID, keeps the record and logs the change | Auto + Hand (screenshot) | Pass (new) | 11/03 | Claude Code (for Tagalicud) |

Notes:
- Decision (with Tagalicud): keep the Reactivate action. It was already built: Admin only, needs a reason, and is written to the change log as "Reactivated beneficiary".
- Decision (with Tagalicud): the details saved since Module 5 can now be edited too (suffix, birthplace, civil status, email, emergency contact and ID details). The edit uses the same rules as registration. The address is edited as one field because city and province were saved inside it.
- Decision (with Tagalicud): new "Remove face data" action on the record page, for a senior who withdraws consent under RA 10173. There is no way yet to capture a face again for an existing record if the senior consents later.
- Bug fixed: the change log's column was labelled "Field" but showed codes such as "UPDATE". It is now "Action" with readable labels ("Updated beneficiary"). The reason of an edit now ends with the fields that changed, for example "Corrected contact details (changed: Civil status, Email address)". The labels are shared with the dashboard's activity list (`ACTION_LABELS` in `src/lib/constants.ts`).
- The ongoing-transaction rule is now a separate function (`isOngoingTransaction` in `src/lib/beneficiaries.ts`) with unit tests, as `AGENTS.md` asks. A claim exactly 10 minutes old still blocks deactivation, as before.
- Deactivating with the reason "Other" saves only the word "Other". There is no box to describe it.
- Correction (section 11): the sidebar stays in place while the page scrolls. It only looked cut off in full-page screenshots, which do not scroll.
- Tests ran against a separate database; the real `dev.db` was not touched.

## 10. Generate Reports (8.0)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| T27 a filter with no results shows "No matching records." and no export buttons | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T28 the exported CSV has the same headers, rows and values as the masterlist on screen | Auto (download compared with the table) | Pass | 11/03 | Claude Code (for Tagalicud) |
| T28 the exported CSV has the same headers, rows and values as the claims report on screen | Auto (download compared with the table) | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| Deactivated beneficiaries are not in the masterlist and are in the inactive report | Auto (screen + API, also module 9) | Pass | 11/03 | Claude Code (for Tagalicud) |
| The CSV opens in Excel with ñ, names with commas ("Señora Ñora dela Cruz Peña, Jr.") and "PHP 1,500" each in one cell | Hand (Excel 16 on this laptop, made-up record) + unit | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| Claim dates and the From/To filter follow Manila time | Unit | Pass after fix | 11/03 | Claude Code (for Tagalicud) |

Notes:
- Bug fixed (T28): the claims report showed only a summary by program on screen, while the CSV had one row per claim. The screen now also lists every claim under "Claims released", with the same columns as the CSV.
- Bug fixed (Excel): the CSV had no byte order mark, so Excel read it with the Windows code page and showed "ñ" as "Ã±". The export now adds the mark (`toCsv` in `src/lib/reports.ts`). It also stops a value that starts with = + - @ from running as an Excel formula.
- Bug fixed (dates): the claims report showed release dates in UTC and filtered by the server's clock. A claim released before 8 AM Manila time showed under the day before. Dates and the From/To filter now use Manila days (`releasedBetween` in `src/lib/reports.ts`).
- Bug fixed: the "Verified by" column showed codes such as "MANUAL_ID". It now reads "Manual ID", "Face match" or "Representative (name)", the same labels as the assistance history (`verifiedBy` in `src/lib/format.ts`).
- In Excel the date columns show "########" until the column is widened. The values are real dates (shown as 03/11/2026 with this laptop's settings).
- "Export PDF" opens the print window, where the user picks "Save as PDF". There is no separate PDF file.
- Tests ran against a separate database; the real `dev.db` was not touched.

## 11. Whole-System Checks

### T01-T28 summary

Status of every checklist row after modules 1-10. "Auto" rows pass in the Playwright suite on a production build; webcam rows still need a person in front of the camera.

| ID | Test | How | Result | Date | Tester |
|---|---|---|---|---|---|
| T01 | Wrong password | Auto + Hand | Pass | 11/03 | Claude Code (for Tagalicud) |
| T02 | 5 wrong passwords lock the account | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T03 | Deactivated account | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T04 | Staff does not see Admin menus | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T05 | Missing required field | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T06 | Age 59 | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| T07 | No consent | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T08 | Same OSCA ID twice | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T09 | No face in camera | Auto (fake camera) | Pass; webcam check not run | 11/03 | Claude Code (for Tagalicud) |
| T10 | Printed photo held up | Hand (webcam) | Not run yet | | |
| T11 | 3 failed tries, then manual verification | Auto (fake camera) | Pass | 11/03 | Claude Code (for Tagalicud) |
| T12 | Same face registered again | Auto (API, made-up face vectors) | Pass; webcam check not run | 11/03 | Claude Code (for Tagalicud) |
| T13 | Registered member faces camera | Auto (API, made-up face vectors) | Pass; webcam check not run | 11/03 | Claude Code (for Tagalicud) |
| T14 | Unregistered person | Auto (API, made-up face vectors) | Pass; webcam check not run | 11/03 | Claude Code (for Tagalicud) |
| T15 | Face models fail to load | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T16 | Claim again within 90 days | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| T17 | Deactivated beneficiary | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| T18 | Program inactive | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| T19 | Verification failed | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T20 | Representative claim | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T21 | Name not found | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T22 | No claims yet | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T23 | Deactivate with ongoing transaction | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| T24 | Any edit writes an audit row | Auto + unit | Pass | 11/03 | Claude Code (for Tagalicud) |
| T25 | Duplicate username | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T26 | Admin deactivates self | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T27 | Filter with no results | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |
| T28 | Export CSV | Auto + Hand (Excel) | Pass | 11/03 | Claude Code (for Tagalicud) |

### Whole-system checks

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| Text is 18px or larger on every screen (login, 7 Staff screens, 6 Admin screens) at 1280 x 720, 1366 x 768 and 1920 x 1080 | Script (measures every visible text) + Hand (screenshots) | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| Text contrast is at least 4.5:1 | Script + colour check | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| No screen scrolls sideways, and every table fits its box | Script at the same three sizes | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| Every page uses `requirePageUser()`, every API route uses `requireApiUser()`, and Admin-only ones pass `"ADMIN"` | Code check + Auto (every page and API route, signed out and as Staff) | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| No real personal data in the repo | File and history check | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| `.env` is not committed and `.env.example` lists every variable | File and history check | Pass | 11/03 | Claude Code (for Tagalicud) |
| Final checks: `npm test` (43), `npm run lint`, `npx tsc --noEmit`, `npm run build`, Playwright (42) on a production server | Auto | Pass | 11/03 | Claude Code (for Tagalicud) |

Notes:
- Decision (with Tagalicud): text is at least 18px on every screen, as `AGENTS.md` asks. This laptop runs 1920 x 1080 at 150% scaling, so the browser is 1280px wide. At that width the old root size `clamp(14px, 0.8333vw, 16px)` gave 14px, and 66-98% of the text on each screen was under 18px (smallest 9.6px, the Admin table headers). The root size is now 18px, and no text style is smaller than 1rem. Text is larger than in the Figma file.
- To fit the larger text at 1280px:
  - The staff sidebar is narrower.
  - Staff page and card padding is smaller on screens under 1536px.
  - The dashboard number cards show two per row.
  - Table headers can wrap onto two lines.
  - The record list's View, Edit and Deactivate links can wrap; Deactivate used to be hidden past the table's right edge.
  - The back button is bigger.
- Contrast: grey "muted" text was 4.1-4.4:1 on the page and table-header backgrounds. It is now darker (5.4:1 or better). The greyed-out Edit and Deactivate links on inactive records stay light on purpose; WCAG does not require contrast for disabled controls.
- Decision (with Tagalicud): the login page used a real photo of identifiable seniors (`public/images/login-seniors.png`), committed to the public repo. It is removed, and the sign-in form now sits on a plain panel. The photo is still in older commits; removing it from history needs a history rewrite and force push, which was not done.
- Bug fixed: the register page relied only on the shared layout's sign-in check. It now calls `requirePageUser()` like every other page. A new test checks every page and API route signed out (sent to login, or 401) and as Staff (Admin pages and APIs refused).
- The Admin header showed "OSCA Administrator, OSCA Administrator". It now shows the account name once, next to the "System Administrator" badge.
- `.env` and `prisma/dev.db` were never committed. `.env.example` lists every variable the code and seed read. No real emails or phone numbers are in tracked files. Test data uses made-up names only.
- Not done here: T10 and the webcam halves of T09 and T12-T14 still need a person in front of the camera. The dashboard greets "Good evening, OSCA" because it uses the first word of the account name. Search still treats "Ñ" and "ñ" as different letters (module 2). Both are left for section 13.
- Tests ran against a separate database; the real `dev.db` was not touched.

## 13. Documents, Submission and Demo (code and document items)

| Check | How | Result | Date | Tester |
|---|---|---|---|---|
| Search finds a name with Ñ in any letter case ("peña", "PEÑA", "niña peña") | Auto + unit | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| The dashboard greets with the whole account name | Auto | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| Deactivating for "Other" needs a description, which goes into the change log | Auto | Pass after fix | 11/03 | Claude Code (for Tagalicud) |
| Capture face data later: needs consent, blocks a face already on another record, refuses a second capture, clears the manual-ID flag, the face then matches, and the change is logged | Auto (API with made-up face vectors) | Pass (new) | 11/03 | Claude Code (for Tagalicud) |
| Capture face data later: the camera starts only after the consent box is ticked | Auto (fake camera) + Hand (screenshot) | Pass (new) | 11/03 | Claude Code (for Tagalicud) |
| Capture face data later with a real face | Hand (webcam) | Not run yet | | |
| Activity diagrams updated for the final app (UC 7.0 and UC 2.0); the other eight unchanged | Rebuilt + Hand (rendered and checked) | Done | 11/03 | Claude Code (for Tagalicud) |
| Section 11 final checks re-run: `npm test` (44), `npm run lint`, `npx tsc --noEmit`, `npm run build`, Playwright (46) on a production server; all text 18px+ with no sideways scroll at 1280 x 720 and 1920 x 1080 | Auto + script | Pass | 11/03 | Claude Code (for Tagalicud) |

Notes:
- Bug fixed (module 2): SQLite ignores letter case for A-Z only, so "PEÑA" did not find "Peña". A query with only "PEÑA" returned 0 records on the test database before the fix. Each search word with a letter outside A-Z is now also tried in lower and upper case (`searchWhere` in `src/lib/beneficiaries.ts`). Accents are still exact: "Pena" does not find "Peña".
- Bug fixed: the dashboard greeted "Good evening, OSCA" because it used the first word of the account name ("OSCA Releasing Staff"). It now uses the whole name.
- Bug fixed: deactivating for "Other" saved only the word "Other". The dialog now asks for a description and logs "Other: <description>".
- Decision (with Tagalicud): new **Capture face data** action on the record page (Admin only, active records without face data). It needs the consent box ticked and runs the same camera and duplicate-face check as registration. It saves the consent date, clears the manual-ID flag and logs "Captured face data". The panel opens inside the Facial data card instead of a dialog, so at 1280 x 720 the Capture button is reached by scrolling the page.
- Decision (with Tagalicud): the narrative, activity diagrams and prototype were already combined and submitted (`SCBVS-Final.pdf`). Only the activity diagrams in `SCBVS-Deliverables` were updated, and the screen changes are listed in its README. The files before the update are in `Archive/deliverables-before-final-app-2026-11-03/`. The submission zip, the prototype screens and the Word file were not changed.
- Finding: the narrative and the old Capture Facial Data diagram say facial data is encrypted. The app stores the template as plain numbers in the local database, so the diagram now says "numeric face template (no photo)". The README advises a Windows password and BitLocker on the demo laptop.
- `FACE_MATCH_THRESHOLD` is still 0.55. The README says to record the final value after the webcam accuracy test (section 12).
- Not done by Claude Code (need people or the webcam): section 12, the demo video, the rehearsal, the lamp and camera setup, and backing up `prisma/dev.db` before the demo.
- Tests ran against a separate database; the real `dev.db` was not touched.
