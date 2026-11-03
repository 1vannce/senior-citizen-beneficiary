# Prompt template

Copy the block below, fill in the brackets, and delete lines that do not apply.

```
## Task
[One sentence: what to build, fix, or change.]

## Use case / checklist
[Use case number and name, e.g. 5.0 Record Assistance. Related test IDs, e.g. T16, T19.]

## Current behavior
[What happens now. Include the page/route, error text, or steps to reproduce.]

## Expected behavior
[What should happen. Include rules, messages, and alternate courses.]

## Where to look
[Files or folders, e.g. src/lib/eligibility.ts, src/app/api/assistance/route.ts.]

## Constraints
- No real personal data in code, seeds or tests; face embeddings only, no photos.
- Keep the change small; no new dependencies unless needed.
- [Anything else: role (STAFF/ADMIN), audit log, UI size/contrast.]

## Done when
- [Observable result, e.g. "Claim within 90 days shows 'Ineligible'".]
- Tests: [unit test added/updated, or "manual webcam check"].
- `npm test` and `npm run lint` pass.

## Report back
Summarize what changed, what you verified, and anything you could not test.
```

## Example

```
## Task
Show the next eligible date when a beneficiary is ineligible because of the restricted period.

## Use case / checklist
4.0 Check Eligibility, T16.

## Current behavior
The eligibility screen only says "Ineligible".

## Expected behavior
Say "Ineligible until <date>" using the last claim date plus the program's restrictedPeriodDays.

## Where to look
src/lib/eligibility.ts, src/components/EligibilityChecks.tsx, tests/unit/eligibility.test.ts

## Constraints
- Keep the change small; no new dependencies.

## Done when
- T16 shows the date.
- Unit test covers the date calculation.
- `npm test` and `npm run lint` pass.

## Report back
Summarize changes and checks run.
```
