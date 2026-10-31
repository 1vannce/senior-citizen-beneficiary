import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import AssistanceFlow from "./AssistanceFlow";

export default async function NewAssistancePage() {
  const user = await requirePageUser();
  const programs = await db.program.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true, restrictedPeriodDays: true },
  });
  return <AssistanceFlow programs={programs} staffName={user.fullName} />;
}
