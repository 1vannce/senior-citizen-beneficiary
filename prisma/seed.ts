import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const BARANGAYS = ["Poblacion", "San Isidro", "Santa Cruz", "Bagong Silang"];

const NAMES: [string, string, string, string][] = [
  ["Maria", "Santos", "Reyes", "F"],
  ["Jose", "Dela Cruz", "Garcia", "M"],
  ["Rosario", "Mendoza", "Lopez", "F"],
  ["Pedro", "Aquino", "Ramos", "M"],
  ["Teresita", "Bautista", "Cruz", "F"],
  ["Antonio", "Villanueva", "Torres", "M"],
  ["Luzviminda", "Castro", "Flores", "F"],
  ["Ricardo", "Navarro", "Diaz", "M"],
  ["Remedios", "Pascual", "Morales", "F"],
  ["Eduardo", "Salazar", "Rivera", "M"],
];

async function main() {
  await db.auditLog.deleteMany();
  await db.assistanceClaim.deleteMany();
  await db.faceData.deleteMany();
  await db.beneficiary.deleteMany();
  await db.program.deleteMany();
  await db.user.deleteMany();

  const hash = (p: string) => bcrypt.hashSync(p, 10);
  const admin = await db.user.create({
    data: { username: "admin", passwordHash: hash("Admin@123"), fullName: "Test Admin", role: "ADMIN" },
  });
  const staff1 = await db.user.create({
    data: { username: "staff1", passwordHash: hash("Staff@123"), fullName: "Test Staff One", role: "STAFF" },
  });
  await db.user.create({
    data: { username: "staff2", passwordHash: hash("Staff@123"), fullName: "Test Staff Two", role: "STAFF" },
  });

  const pension = await db.program.create({
    data: { name: "Pension", description: "Social pension", restrictedPeriodDays: 90 },
  });
  await db.program.create({
    data: { name: "Medical", description: "Medical assistance", restrictedPeriodDays: 90 },
  });
  await db.program.create({
    data: { name: "Grocery", description: "Grocery pack", restrictedPeriodDays: 30 },
  });
  // Inactive program so the "program inactive" case (T18) can be shown
  await db.program.create({
    data: { name: "Burial", description: "Burial assistance (inactive)", restrictedPeriodDays: 365, isActive: false },
  });

  const year = new Date().getFullYear();
  for (const [i, [firstName, middleName, lastName, sex]] of NAMES.entries()) {
    const n = String(i + 1).padStart(4, "0");
    const b = await db.beneficiary.create({
      data: {
        referenceNo: `SCBVS-${year}-${n}`,
        firstName,
        middleName,
        lastName,
        sex,
        birthDate: new Date(1940 + i * 2, i % 12, 10 + i),
        address: `${i + 10} Test Street`,
        barangay: BARANGAYS[i % BARANGAYS.length],
        contactNo: `0917000${n}`,
        oscaIdNo: `OSCA-TEST-${n}`,
        needsManualVerification: true, // seed records have no face data
        createdById: admin.id,
      },
    });
    if (i === 0) {
      // Maria already claimed Pension recently, so she is ineligible (T16)
      await db.assistanceClaim.create({
        data: {
          beneficiaryId: b.id,
          programId: pension.id,
          amountOrItems: "PHP 1,000",
          verificationMethod: "MANUAL_ID",
          releasedById: staff1.id,
          releasedAt: new Date(Date.now() - 20 * 86400000),
          remarks: "Seed claim",
        },
      });
    }
  }
  console.log("Seeded: 3 users, 4 programs, 10 beneficiaries");
}

main().finally(() => db.$disconnect());
