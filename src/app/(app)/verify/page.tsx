import { requirePageUser } from "@/lib/session";
import VerifyClient from "./VerifyClient";

export default async function VerifyPage() {
  await requirePageUser();
  return <VerifyClient />;
}
