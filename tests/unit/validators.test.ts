import { describe, expect, it } from "vitest";
import { ageOn, beneficiarySchema, registerSchema, userCreateSchema, userEditSchema } from "@/lib/validators";

const valid = {
  firstName: "Maria",
  lastName: "Reyes",
  birthDate: "1950-01-01",
  sex: "F",
  address: "1 Test St",
  barangay: "Poblacion",
  oscaIdNo: "OSCA-1",
};

describe("ageOn", () => {
  it("counts the birthday only once it has passed", () => {
    const now = new Date("2026-06-15");
    expect(ageOn(new Date("1966-06-16"), now)).toBe(59);
    expect(ageOn(new Date("1966-06-15"), now)).toBe(60);
  });
});

describe("beneficiarySchema", () => {
  it("accepts a valid senior", () => {
    expect(beneficiarySchema.safeParse(valid).success).toBe(true);
  });
  it("rejects age below 60 (T06)", () => {
    const young = new Date();
    young.setFullYear(young.getFullYear() - 59);
    const r = beneficiarySchema.safeParse({ ...valid, birthDate: young.toISOString().slice(0, 10) });
    expect(r.success).toBe(false);
  });
  it("rejects a missing OSCA ID and required fields (T05)", () => {
    const r = beneficiarySchema.safeParse({ ...valid, oscaIdNo: "", firstName: " " });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(Object.keys(r.error.flatten().fieldErrors)).toEqual(expect.arrayContaining(["oscaIdNo", "firstName"]));
    }
  });
});

describe("registerSchema", () => {
  const full = {
    ...valid,
    birthplace: "Cebu City",
    civilStatus: "Single",
    contactNo: "09170000000",
    city: "Cebu City",
    province: "Cebu",
    emergencyName: "Ana",
    emergencyRelationship: "Child",
    emergencyMobile: "09170000001",
    idType: "OSCA ID",
    placeOfIssue: "Cebu City",
    issueDate: "2020-01-15",
  };
  it("accepts a full registration with optional email and expiry left empty", () => {
    expect(registerSchema.safeParse({ ...full, email: "", expiryDate: "" }).success).toBe(true);
  });
  it("rejects a badly written email address", () => {
    expect(registerSchema.safeParse({ ...full, email: "ana@" }).success).toBe(false);
  });
  it("rejects a missing emergency contact", () => {
    expect(registerSchema.safeParse({ ...full, emergencyName: "" }).success).toBe(false);
  });
});

describe("userCreateSchema", () => {
  it("requires a password of at least 8 characters", () => {
    const r = userCreateSchema.safeParse({ username: "abc", fullName: "A B", role: "STAFF", password: "short" });
    expect(r.success).toBe(false);
    const ok = userCreateSchema.safeParse({ username: "abc", fullName: "A B", role: "STAFF", password: "12345678" });
    expect(ok.success).toBe(true);
  });
});

describe("userEditSchema", () => {
  const base = { fullName: "A B", role: "STAFF", isActive: true };
  it("keeps the current password when the field is left empty", () => {
    expect(userEditSchema.safeParse({ ...base, password: "" }).success).toBe(true);
  });
  it("rejects a new password shorter than 8 characters", () => {
    expect(userEditSchema.safeParse({ ...base, password: "1234567" }).success).toBe(false);
  });
});
