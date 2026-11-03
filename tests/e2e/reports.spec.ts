import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Generate Reports (UC 8.0). Run "npm run db:seed:test" first. Made-up data only.

async function loginOk(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function register(request: APIRequestContext, firstName: string, lastName: string) {
  const res = await request.post("/api/beneficiaries", {
    data: {
      data: {
        firstName,
        lastName,
        birthDate: "1950-01-01",
        sex: "M",
        address: "1 Test Street",
        barangay: "Santa Cruz",
        oscaIdNo: `RPT-${Date.now()}`,
        birthplace: "Cebu City",
        civilStatus: "Single",
        contactNo: "09170000000",
        city: "Cebu City",
        province: "Cebu",
        emergencyName: "Test Contact",
        emergencyRelationship: "Child",
        emergencyMobile: "09170000001",
        idType: "OSCA ID",
        placeOfIssue: "Cebu City",
        issueDate: "2020-01-15",
      },
      consent: false,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).beneficiary as { id: string; referenceNo: string; name: string };
}

async function generate(page: Page, report: string) {
  await page.goto("/reports");
  await page.getByLabel(report).check();
  await page.getByRole("button", { name: "Generate report" }).click();
}

// The last table on the page holds the report rows (the claims report has a summary table above it)
async function screenTable(page: Page) {
  const table = page.locator("table").last();
  const headers = await table.locator("thead th").allTextContents(); // the text, not its upper-case styling
  const rows = await table.locator("tbody tr").evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => (td.textContent ?? "").trim())));
  return [headers.map((h) => h.trim()), ...rows];
}

async function exportedCsv(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Excel" }).click();
  const text = readFileSync((await (await download).path())!, "utf8");
  expect(text.charCodeAt(0)).toBe(0xfeff); // byte order mark, so Excel reads ñ correctly
  return Papa.parse<string[]>(text.slice(1), { skipEmptyLines: true }).data;
}

test("T27 a filter with no results shows the no matching record message", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  await page.goto("/reports");
  await page.getByLabel("Assistance released by program").check();
  await page.getByLabel("Date from").fill("2001-01-01");
  await page.getByLabel("Date to").fill("2001-01-31");
  await page.getByRole("button", { name: "Generate report" }).click();
  await expect(page.getByText("No matching records.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export Excel" })).toBeHidden();
});

test("T28 the exported CSV has the same rows and values as the masterlist on screen", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  const person = await register(page.request, "José Niño", "Peña");
  await generate(page, "Beneficiary masterlist by barangay");
  await expect(page.getByRole("row").filter({ hasText: person.referenceNo })).toContainText("José Niño Peña");

  const screen = await screenTable(page);
  const csv = await exportedCsv(page);
  expect(csv).toEqual(screen);
  expect(csv.some((r) => r.includes("José Niño Peña"))).toBe(true);
});

test("T28 the exported CSV has the same rows and values as the claims report on screen", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  const person = await register(page.request, "Claimcsv", "Testcase");
  await page.goto("/eligibility");
  const medical = await page.getByLabel("Assistance program").locator("option", { hasText: "Medical" }).getAttribute("value");
  const claim = await page.request.post("/api/assistance", {
    data: { beneficiaryId: person.id, programId: medical, amountOrItems: "PHP 1,000", verificationMethod: "REPRESENTATIVE", idChecked: true, representativeName: "Ana Cruz" },
  });
  expect(claim.status()).toBe(201);

  await generate(page, "Assistance released by program");
  const row = page.getByRole("row").filter({ hasText: person.referenceNo });
  await expect(row).toContainText("PHP 1,000");
  await expect(row).toContainText("Representative (Ana Cruz)");

  const screen = await screenTable(page);
  const csv = await exportedCsv(page);
  expect(csv).toEqual(screen);
  // "PHP 1,000" stays in one cell
  expect(csv.find((r) => r.includes(person.referenceNo))).toContain("PHP 1,000");
});

test("deactivated beneficiaries are in the inactive report, not in the masterlist", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  const person = await register(page.request, "Retired", "Reporttest");
  const off = await page.request.post(`/api/beneficiaries/${person.id}/status`, { data: { status: "DEACTIVATED", reason: "E2E test" } });
  expect(off.status()).toBe(200);

  await generate(page, "Beneficiary masterlist by barangay");
  await expect(page.locator("table")).toBeVisible();
  await expect(page.getByRole("cell", { name: person.referenceNo })).toHaveCount(0);

  await generate(page, "Inactive beneficiaries");
  await expect(page.getByRole("cell", { name: person.referenceNo })).toBeVisible();
});
