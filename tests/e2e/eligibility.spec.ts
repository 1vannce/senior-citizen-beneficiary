import { expect, test, type Page } from "@playwright/test";

// Check Eligibility (UC 4.0) on the eligibility screen. Run "npm run db:seed:test" first.
// The restricted-period boundary is covered by unit tests (tests/unit/eligibility.test.ts).

async function loginOk(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function idByOsca(page: Page, osca: string): Promise<string> {
  const { results } = await (await page.request.get(`/api/beneficiaries?osca=${osca}`)).json();
  return results[0].id;
}

async function evaluate(page: Page, beneficiaryId: string, program: string) {
  await page.goto(`/eligibility?beneficiary=${beneficiaryId}`);
  await page.getByLabel("Assistance program").selectOption({ label: program });
  await page.getByRole("button", { name: "Evaluate eligibility" }).click();
  return page.getByRole("status");
}

const check = (page: Page, title: string) => page.getByRole("listitem").filter({ hasText: title });

test("T16 a second Pension claim inside 90 days is ineligible", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  const status = await evaluate(page, await idByOsca(page, "OSCA-TEST-0001"), "Pension");
  await expect(status).toContainText("Not eligible");
  await expect(status).toContainText("Last claim was inside the 90-day restricted period. Eligible again on");
  await expect(check(page, "Restricted claim period")).toContainText("Eligible again on");
  await expect(page.getByRole("link", { name: "Continue to record assistance" })).toBeHidden();

  // The same senior is still eligible for a program they have not claimed
  await page.getByLabel("Assistance program").selectOption({ label: "Medical" });
  await page.getByRole("button", { name: "Evaluate eligibility" }).click();
  await expect(status).toContainText("Eligible for assistance");
});

test("T17 a deactivated beneficiary is ineligible", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  const res = await page.request.post("/api/beneficiaries", {
    data: {
      data: {
        firstName: "Inactive",
        lastName: "Eligtest",
        birthDate: "1950-01-01",
        sex: "F",
        address: "1 Test Street",
        barangay: "Poblacion",
        oscaIdNo: `ELIG-T17-${Date.now()}`,
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
  const { beneficiary } = await res.json();
  const off = await page.request.post(`/api/beneficiaries/${beneficiary.id}/status`, {
    data: { status: "DEACTIVATED", reason: "E2E test" },
  });
  expect(off.status()).toBe(200);

  const status = await evaluate(page, beneficiary.id, "Pension");
  await expect(status).toContainText("Not eligible");
  await expect(status).toContainText("This beneficiary record is deactivated.");
  await expect(check(page, "Active beneficiary record")).toContainText("This beneficiary record is deactivated.");
  await expect(check(page, "Restricted claim period")).toContainText("Not checked.");
});

test("T18 the inactive Burial program makes no check and shows a message", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  await page.goto("/eligibility");
  await expect(page.getByRole("option", { name: "Burial - Not configured" })).toBeAttached();

  const status = await evaluate(page, await idByOsca(page, "OSCA-TEST-0002"), "Burial - Not configured");
  await expect(status).toContainText("Not eligible");
  await expect(status).toContainText("This assistance program is not active. No eligibility check was made.");
  await expect(check(page, "Program is configured")).toContainText("No current OSCA rules are available.");
  for (const title of ["Active beneficiary record", "Barangay coverage", "Restricted claim period"]) {
    await expect(check(page, title)).toContainText("Not checked.");
  }
});
