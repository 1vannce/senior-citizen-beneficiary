import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Manage Senior Citizen Records (UC 7.0). Run "npm run db:seed:test" first. Made-up data only.

async function loginOk(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

// Made-up face vector
const randomFace = () => Array.from({ length: 128 }, () => Math.random() * 2 - 1);

async function register(request: APIRequestContext, firstName: string, embedding?: number[]) {
  const res = await request.post("/api/beneficiaries", {
    data: {
      data: {
        firstName,
        lastName: "Recordtest",
        birthDate: "1950-01-01",
        sex: "F",
        address: "1 Test Street",
        barangay: "Poblacion",
        oscaIdNo: `REC-${firstName}-${Date.now()}`,
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
      consent: !!embedding,
      embedding,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).beneficiary as { id: string; referenceNo: string; name: string };
}

async function programId(page: Page, name: string) {
  await page.goto("/eligibility");
  return (await page.getByLabel("Assistance program").locator("option", { hasText: name }).getAttribute("value")) ?? "";
}

// "Nov 3, 2026", the date part of the change log's date and time
const today = () => new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });

const logRow = (page: Page, action: string) => page.getByRole("row").filter({ hasText: action });

async function openLog(page: Page) {
  await page.getByRole("tab", { name: "Change log" }).click();
}

test("T23 deactivating right after a claim is blocked", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  const person = await register(page.request, "Ongoing");
  const claim = await page.request.post("/api/assistance", {
    data: { beneficiaryId: person.id, programId: await programId(page, "Medical"), amountOrItems: "PHP 500", verificationMethod: "MANUAL_ID", idChecked: true },
  });
  expect(claim.status()).toBe(201);

  await page.goto(`/beneficiaries/${person.id}`);
  await page.getByRole("button", { name: "Deactivate" }).click();
  await page.getByLabel("Reason for deactivation").selectOption("Transferred residence");
  await page.getByRole("button", { name: "Deactivate record" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "This record has a transaction from the last 10 minutes" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.reload();
  await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
  await openLog(page);
  await expect(logRow(page, "Deactivated beneficiary")).toHaveCount(0);
});

test("T24 every edit, deactivation and reactivation writes a change-log row with user, date and reason", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  const person = await register(page.request, "Audited");
  await page.goto(`/beneficiaries/${person.id}`);

  // Edit the details added in Module 5
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Email address").fill("ana@");
  await page.getByLabel("Reason for change").fill("Corrected contact details");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await page.getByLabel("Email address").fill("audited.recordtest@example.com");
  await page.getByLabel("Emergency contact number").fill("09179998888");
  await page.getByLabel("Civil status").selectOption("Widowed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Record updated and logged.")).toBeVisible();
  for (const text of ["audited.recordtest@example.com", "09179998888", "Widowed"]) {
    await expect(page.getByRole("definition").filter({ hasText: text })).toBeVisible();
  }

  // Saving without a change is refused, so no empty log row is written
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Reason for change").fill("Nothing changed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("No changes to save.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  // Deactivate, then reactivate
  await page.getByRole("button", { name: "Deactivate" }).click();
  await page.getByLabel("Reason for deactivation").selectOption("Transferred residence");
  await page.getByRole("button", { name: "Deactivate record" }).click();
  await expect(page.getByText(`${person.name} deactivated. The change was logged.`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toBeHidden();
  await page.getByRole("button", { name: "Reactivate" }).click();
  await page.getByLabel("Reason for reactivation").fill("Moved back to the city");
  await page.getByRole("button", { name: "Reactivate record" }).click();
  await expect(page.getByText(`${person.name} reactivated. The change was logged.`)).toBeVisible();

  await openLog(page);
  const rows: [string, string][] = [
    ["Updated beneficiary", "Corrected contact details (changed: Civil status, Email address, Emergency contact number)"],
    ["Deactivated beneficiary", "Transferred residence"],
    ["Reactivated beneficiary", "Moved back to the city"],
    ["Registered beneficiary", "Registered without face data"],
  ];
  for (const [action, reason] of rows) {
    const row = logRow(page, action);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(reason);
    await expect(row).toContainText("OSCA Administrator");
    await expect(row).toContainText(today());
  }
});

test("a deactivated record leaves the active lists and reports but keeps its past claims", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  const maria = (await (await page.request.get("/api/beneficiaries?osca=OSCA-TEST-0001")).json()).results[0];
  const inReport = async (type: string) =>
    ((await (await page.request.get(`/api/reports?type=${type}`)).json()).rows as { referenceNo: string }[]).some(
      (r) => r.referenceNo === maria.referenceNo,
    );
  expect(await inReport("masterlist")).toBe(true);

  const off = await page.request.post(`/api/beneficiaries/${maria.id}/status`, { data: { status: "DEACTIVATED", reason: "E2E test" } });
  expect(off.status()).toBe(200);
  try {
    expect(await inReport("masterlist")).toBe(false);
    expect(await inReport("inactive")).toBe(true);
    await page.goto("/beneficiaries");
    await page.getByLabel("Status").selectOption("ACTIVE");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: "Maria Santos Reyes" })).toHaveCount(0);

    // Her past Pension claim is still in her history and in the claims report
    await page.goto(`/beneficiaries/${maria.id}/history`);
    await expect(page.getByRole("row").filter({ hasText: "Pension" })).toHaveCount(1);
    const claims = (await (await page.request.get("/api/reports?type=claims")).json()).rows as { referenceNo: string }[];
    expect(claims.some((r) => r.referenceNo === maria.referenceNo)).toBe(true);
  } finally {
    // Put the seeded record back for the other tests
    await page.request.post(`/api/beneficiaries/${maria.id}/status`, { data: { status: "ACTIVE", reason: "E2E test" } });
  }
  expect(await inReport("masterlist")).toBe(true);
});

test("staff cannot edit, deactivate or remove face data", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  const maria = (await (await page.request.get("/api/beneficiaries?osca=OSCA-TEST-0001")).json()).results[0];

  await page.goto(`/beneficiaries/${maria.id}`);
  await expect(page).toHaveURL(/dashboard/);
  await page.goto(`/beneficiaries/${maria.id}?action=deactivate`);
  await expect(page).toHaveURL(/dashboard/);

  const edit = await page.request.patch(`/api/beneficiaries/${maria.id}`, { data: { firstName: "Changed", reason: "Staff test" } });
  const status = await page.request.post(`/api/beneficiaries/${maria.id}/status`, { data: { status: "DEACTIVATED", reason: "Staff test" } });
  const face = await page.request.delete(`/api/beneficiaries/${maria.id}/face`, { data: { reason: "Staff test" } });
  expect([edit.status(), status.status(), face.status()]).toEqual([403, 403, 403]);
});

test("removing face data on withdrawal of consent flags the record and keeps it", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  const face = randomFace();
  const person = await register(page.request, "Withdrawn", face);
  expect((await (await page.request.post("/api/face/match", { data: { embedding: face } })).json()).status).toBe("MATCH");

  await page.goto(`/beneficiaries/${person.id}`);
  await expect(page.getByText("Consent status: Granted")).toBeVisible();
  await page.getByRole("button", { name: "Remove face data" }).click();
  const remove = page.getByRole("dialog").getByRole("button", { name: "Remove face data" });
  await expect(remove).toBeDisabled(); // a reason is required
  await page.getByLabel("Reason for removal").fill("Senior withdrew consent in writing");
  await remove.click();
  await expect(page.getByText(`Face data of ${person.name} removed.`)).toBeVisible();
  await expect(page.getByText("Consent status: Not recorded")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove face data" })).toBeHidden();

  // The template is gone, the record stays active and is now verified by manual ID
  expect((await (await page.request.post("/api/face/match", { data: { embedding: face } })).json()).status).toBe("NO_MATCH");
  const after = (await (await page.request.get(`/api/beneficiaries?q=${person.referenceNo}`)).json()).results[0];
  expect(after).toMatchObject({ status: "ACTIVE", needsManualVerification: true });

  await openLog(page);
  await expect(logRow(page, "Removed face data")).toContainText("Senior withdrew consent in writing");
});
