import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { evaluateEligibility } from "@/lib/claims";

const schema = z.object({ beneficiaryId: z.string().min(1), programId: z.string().min(1) });

// Check Eligibility (UC 4.0)
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select a program." }, { status: 400 });

  const out = await evaluateEligibility(parsed.data.beneficiaryId, parsed.data.programId);
  if (!out) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  return NextResponse.json(out.result);
}
