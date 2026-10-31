import { requirePageUser } from "@/lib/session";
import AppShell from "@/components/AppShell";
import IdleTimer from "@/components/IdleTimer";
import { longDate } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();

  return (
    <>
      <IdleTimer />
      <AppShell role={user.role} fullName={user.fullName} today={longDate(new Date())}>
        {children}
      </AppShell>
    </>
  );
}
