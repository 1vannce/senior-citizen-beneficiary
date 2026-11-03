import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Starting accounts and programs for the real database. It only adds what is missing and never
// deletes or overwrites records, so it is safe to run again. Beneficiaries are registered in the app.

const db = new PrismaClient();

const ACCOUNTS = [
  { username: "admin", fullName: "OSCA Administrator", role: "ADMIN", passwordEnv: "SEED_ADMIN_PASSWORD" },
  { username: "staff1", fullName: "OSCA Releasing Staff", role: "STAFF", passwordEnv: "SEED_STAFF1_PASSWORD" },
  { username: "staff2", fullName: "OSCA Registration Staff", role: "STAFF", passwordEnv: "SEED_STAFF2_PASSWORD" },
];

const PROGRAMS = [
  { name: "Pension", description: "Social pension", restrictedPeriodDays: 90 },
  { name: "Medical", description: "Medical assistance", restrictedPeriodDays: 90 },
  { name: "Grocery", description: "Grocery pack", restrictedPeriodDays: 30 },
  { name: "Burial", description: "Burial assistance", restrictedPeriodDays: 365 },
];

async function main() {
  for (const a of ACCOUNTS) {
    const password = process.env[a.passwordEnv];
    if (!password || password.length < 8) {
      throw new Error(`Set ${a.passwordEnv} in .env (at least 8 characters) before seeding.`);
    }
    await db.user.upsert({
      where: { username: a.username },
      update: {},
      create: { username: a.username, fullName: a.fullName, role: a.role, passwordHash: bcrypt.hashSync(password, 10) },
    });
  }

  for (const p of PROGRAMS) {
    if (!(await db.program.findFirst({ where: { name: p.name } }))) await db.program.create({ data: p });
  }
  console.log("Seeded: 3 accounts and 4 programs (existing records kept)");
}

main().finally(() => db.$disconnect());
