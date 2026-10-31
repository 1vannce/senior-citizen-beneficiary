import { requirePageUser } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import HistorySearch from "./HistorySearch";

export default async function HistoryPage() {
  await requirePageUser();
  return (
    <>
      <PageHeader
        eyebrow="USE CASE 6.0"
        title="View Assistance History"
        subtitle="Find a beneficiary and review every recorded claim without changing stored information."
      />
      <HistorySearch />
    </>
  );
}
