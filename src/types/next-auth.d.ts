import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    username: string;
  }
  interface Session {
    user: { id: string; role: string; username: string; name?: string | null };
  }
}
