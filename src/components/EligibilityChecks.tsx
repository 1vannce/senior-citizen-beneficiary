import { Check, CircleCheck, CircleX, Minus, X } from "lucide-react";

export type Eligibility = { eligible: boolean; message?: string; code?: string };

type Props = { result: Eligibility; beneficiaryStatus: string; barangay: string };

type Check = { title: string; state: "pass" | "fail" | "skipped"; text: string };

// checkEligibility stops at the first failure, so later checks were not evaluated.
function checksFor({ result, beneficiaryStatus, barangay }: Props): Check[] {
  const programOk = result.code !== "PROGRAM_INACTIVE";
  const activeOk = beneficiaryStatus === "ACTIVE";
  const claimState = result.code === "WITHIN_RESTRICTED_PERIOD" ? "fail" : programOk && activeOk ? "pass" : "skipped";
  return [
    { title: "Active beneficiary record", state: activeOk ? "pass" : "fail", text: activeOk ? "Record is active." : "This beneficiary record is deactivated." },
    { title: "Program is configured", state: programOk ? "pass" : "fail", text: programOk ? "Program rules are available." : "No current OSCA rules are available." },
    { title: "Barangay coverage", state: "pass", text: `${barangay} is covered.` },
    {
      title: "Restricted claim period",
      state: claimState,
      text: claimState === "fail" ? (result.message ?? "") : claimState === "pass" ? "No conflicting recent claim found." : "Not checked.",
    },
  ];
}

export default function EligibilityChecks(props: Props) {
  const { result } = props;
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div role="status" className={`flex items-center gap-3 p-4 ${result.eligible ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
        {result.eligible ? <CircleCheck className="size-6 shrink-0" aria-hidden /> : <CircleX className="size-6 shrink-0" aria-hidden />}
        <span>
          <span className="block text-lg font-bold">{result.eligible ? "Eligible for assistance" : "Not eligible"}</span>
          <span className="block text-sm">{result.eligible ? "All program requirements are satisfied." : result.message}</span>
        </span>
      </div>
      <ul className="divide-y divide-line px-4">
        {checksFor(props).map((c) => (
          <li key={c.title} className="flex items-start gap-3 py-3.5">
            <span
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                c.state === "pass" ? "bg-success-soft text-success" : c.state === "fail" ? "bg-danger-soft text-danger" : "bg-page text-muted"
              }`}
            >
              {c.state === "pass" ? <Check className="size-3.5" aria-hidden /> : c.state === "fail" ? <X className="size-3.5" aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
            </span>
            <span>
              <span className="block font-bold text-ink">{c.title}</span>
              <span className="block text-sm text-muted">{c.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
