import { requirePageUser } from "@/lib/session";
import RegisterFlow from "./RegisterFlow";

export default async function RegisterPage() {
  await requirePageUser();
  return <RegisterFlow />;
}
