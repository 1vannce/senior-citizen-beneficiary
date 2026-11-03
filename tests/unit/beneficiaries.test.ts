import { describe, expect, it } from "vitest";
import type { Beneficiary } from "@prisma/client";
import { changedFields, editValues, isOngoingTransaction, ONGOING_TRANSACTION_MINUTES, searchWhere } from "@/lib/beneficiaries";

const fields = (w: string) => ({
  OR: [
    { firstName: { contains: w } },
    { middleName: { contains: w } },
    { lastName: { contains: w } },
    { referenceNo: { contains: w } },
    { oscaIdNo: { contains: w } },
  ],
});

describe("searchWhere", () => {
  it("matches a single word in any field", () => {
    expect(searchWhere("reyes")).toEqual({ AND: [fields("reyes")] });
  });
  it("needs every word of a full name to match", () => {
    expect(searchWhere("Maria Reyes")).toEqual({ AND: [fields("Maria"), fields("Reyes")] });
  });
  it("ignores extra spaces", () => {
    expect(searchWhere("  Maria   Reyes ")).toEqual({ AND: [fields("Maria"), fields("Reyes")] });
  });
});

describe("isOngoingTransaction (T23)", () => {
  const now = new Date("2026-11-03T10:00:00+08:00");
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
  it("is ongoing for a claim released in the last 10 minutes", () => {
    expect(isOngoingTransaction(minutesAgo(0), now)).toBe(true);
    expect(isOngoingTransaction(minutesAgo(ONGOING_TRANSACTION_MINUTES), now)).toBe(true);
  });
  it("is not ongoing for an older claim or when there is no claim", () => {
    expect(isOngoingTransaction(minutesAgo(ONGOING_TRANSACTION_MINUTES + 1), now)).toBe(false);
    expect(isOngoingTransaction(null, now)).toBe(false);
  });
});

describe("changedFields (T24)", () => {
  // A made-up record as the database returns it
  const record = {
    firstName: "Ana",
    middleName: null,
    lastName: "Testcase",
    suffix: null,
    birthDate: new Date("1950-03-12"),
    birthplace: "Cebu City",
    sex: "F",
    civilStatus: "Single",
    contactNo: "09170000000",
    email: null,
    address: "1 Test St, Cebu City, Cebu",
    barangay: "Poblacion",
    emergencyName: "Ben Testcase",
    emergencyRelationship: "Son",
    emergencyMobile: "09170000001",
    oscaIdNo: "OSCA-1",
    idType: "OSCA ID",
    idPlaceOfIssue: "Cebu City",
    idIssueDate: new Date("2020-01-15"),
    idExpiryDate: null,
  } as Beneficiary;
  const before = editValues(record);

  it("turns a record into form values, with dates as entered and empty text for missing values", () => {
    expect(before).toMatchObject({ birthDate: "1950-03-12", issueDate: "2020-01-15", expiryDate: "", middleName: "", email: "" });
  });
  it("finds nothing when the form is saved unchanged, even with extra spaces", () => {
    expect(changedFields(before, { ...before, firstName: " Ana " })).toEqual([]);
  });
  it("names each changed field, including a value that was cleared or added", () => {
    const after = { ...before, email: "ana@example.com", emergencyMobile: "09179999999", contactNo: "" };
    expect(changedFields(before, after)).toEqual(["Contact number", "Email address", "Emergency contact number"]);
  });
});
