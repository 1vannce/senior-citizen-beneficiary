import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { embeddingSchema } from "@/lib/validators";
import { matchFace, summary } from "@/lib/beneficiaries";
import { getThreshold } from "@/lib/face";

// Verify Senior Citizen Identity (UC 3.0): best match and its score for a live embedding.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const e = embeddingSchema.safeParse(body?.embedding);
  if (!e.success) return NextResponse.json({ error: "Invalid face data." }, { status: 400 });

  const result = await matchFace(e.data);
  const threshold = getThreshold();
  if (result.status === "NO_MATCH") {
    return NextResponse.json({ status: "NO_MATCH", score: result.best?.score ?? null, threshold });
  }

  const ids = [result.best.id, ...(result.status === "AMBIGUOUS" ? result.others.map((o) => o.id) : [])];
  const people = await db.beneficiary.findMany({ where: { id: { in: ids } } });
  const byId = new Map(people.map((p) => [p.id, p]));
  const best = byId.get(result.best.id);

  return NextResponse.json({
    status: result.status,
    score: result.best.score,
    threshold,
    beneficiary: best ? summary(best) : null,
    candidates:
      result.status === "AMBIGUOUS"
        ? [result.best, ...result.others].map((c) => ({ score: c.score, beneficiary: summary(byId.get(c.id)!) }))
        : undefined,
  });
}
