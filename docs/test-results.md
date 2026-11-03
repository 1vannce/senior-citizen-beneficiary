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
