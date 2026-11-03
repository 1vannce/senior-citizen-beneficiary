import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Record Assistance (UC 5.0). Run "npm run db:seed:test" first. Made-up data only.
// Claims that change data use new records, so the seeded records stay as they are.

async function loginOk(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

// Made-up face vectors. Random 128-number vectors are almost unrelated to each other (score near 0).
const randomFace = () => Array.from({ length: 128 }, () => Math.random() * 2 - 1);
const plus = (a: number[], b: number[]) => a.map((x, i) => x + b[i]);

async function register(request: APIRequestContext, firstName: string, embedding?: number[]) {
  const res = await request.post("/api/beneficiaries", {
    data: {
      data: {
        firstName,
        lastName: "Claimtest",
        birthDate: "1950-01-01",
        sex: "F",
        address: "1 Test Street",
        barangay: "Poblacion",
        oscaIdNo: `CLAIM-${firstName}-${Date.now()}`,
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

// Program ids, read from the program list on the eligibility screen
async function programIds(page: Page): Promise<Record<string, string>> {
  await page.goto("/eligibility");
  const options = await page.getByLabel("Assistance program").locator("option").all();
  const ids: Record<string, string> = {};
  for (const o of options) ids[((await o.textContent()) ?? "").split(" - ")[0]] = (await o.getAttribute("value")) ?? "";
  return ids;
}

const claim = (request: APIRequestContext, data: Record<string, unknown>) =>
  request.post("/api/assistance", { data: { amountOrItems: "PHP 1,000", verificationMethod: "MANUAL_ID", idChecked: true, ...data } });

test("T19 failed verification blocks saving", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");

  // On screen: without the ID check, identity cannot be confirmed, so the claim steps never open
  await page.goto("/assistance/new");
  await page.getByRole("tab", { name: "Manual ID" }).click();
  await page.getByLabel("Search beneficiary").fill("Ricardo");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: /Ricardo Navarro Diaz/ }).click();
  await expect(page.getByRole("button", { name: "Confirm identity" })).toBeDisabled();
  await expect(page.getByLabel("Assistance program")).toBeHidden();

  // Through the API: every failed verification is refused and nothing is saved
  const ids = await programIds(page);
  const face = randomFace();
  const person = await register(page.request, "Facevalid", face);
  const other = await register(page.request, "Faceother", randomFace());
  const base = { beneficiaryId: person.id, programId: ids.Medical };
  const refused = [
    await claim(page.request, { ...base, idChecked: false }),
    await claim(page.request, { ...base, verificationMethod: "REPRESENTATIVE", idChecked: false, representativeName: "Ana Rep" }),
    await claim(page.request, { ...base, verificationMethod: "FACE", idChecked: undefined }),
    await claim(page.request, { ...base, verificationMethod: "FACE", embedding: randomFace() }),
    // The face belongs to this person, but the claim is for someone else
    await claim(page.request, { ...base, beneficiaryId: other.id, verificationMethod: "FACE", embedding: face }),
  ];
  for (const r of refused) expect(r.status()).toBe(403);
  const history = await page.request.get(`/beneficiaries/${person.id}/history`);
  expect(await history.text()).toContain("No assistance history for this beneficiary.");

  // A live face that matches the right person is accepted
  const ok = await claim(page.request, { ...base, verificationMethod: "FACE", embedding: plus(face, face.map(() => Math.random() * 0.1)) });
  expect(ok.status()).toBe(201);
});

test("T20 a representative claim skips the face step and uses the manual procedure", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  const person = await register(page.request, "Repclaim");

  await page.goto("/assistance/new");
  await page.getByRole("tab", { name: "Representative claim" }).click();
  await expect(page.getByText("Representative claim: face verification is skipped.")).toBeVisible();
  await expect(page.getByText("Camera ready")).toBeHidden();
  await page.getByLabel("Search beneficiary").fill(person.referenceNo);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: /Repclaim Claimtest/ }).click();

  const confirm = page.getByRole("button", { name: "Confirm identity" });
  await page.getByLabel(/I checked a valid government-issued ID and the authorization letter/).check();
  await expect(confirm).toBeDisabled(); // the representative's name is still missing
  await page.getByLabel("Representative's full name").fill("Lorna Repname");
  await confirm.click();
  await expect(page.getByText("Representative claim (representative: Lorna Repname)")).toBeVisible();

  await page.getByLabel("Assistance program").selectOption({ label: "Grocery" });
  await expect(page.getByRole("status")).toContainText("Eligible for assistance");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Amount released").fill("1 grocery pack");
  await page.getByLabel("Document / voucher number").fill("V-2020");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("definition").filter({ hasText: "Representative claim" })).toBeVisible();
  await page.getByRole("button", { name: "Save and release" }).click();
  await expect(page.getByText("Assistance recorded")).toBeVisible();

  // The claim shows in the history (module 2) with the representative's name
  await page.getByRole("link", { name: "View assistance history" }).click();
  const row = page.getByRole("row").filter({ hasText: "Grocery" });
  await expect(row).toContainText("Representative (Lorna Repname)");
  await expect(row).toContainText("1 grocery pack");

  // ...and in the claims report (module 10), which is for the Administrator
  await page.context().clearCookies();
  await loginOk(page, "admin", "Admin@123");
  const report = await (await page.request.get("/api/reports?type=claims")).json();
  expect(report.rows).toContainEqual(
    expect.objectContaining({ referenceNo: person.referenceNo, program: "Grocery", amountOrItems: "1 grocery pack", verificationMethod: "REPRESENTATIVE" }),
  );
});

test("saving is refused when eligibility fails, on screen and through the API", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  const ids = await programIds(page);

  // On screen: Maria already claimed Pension, so the release form cannot be opened
  await page.goto("/assistance/new");
  await page.getByRole("tab", { name: "Manual ID" }).click();
  await page.getByLabel("Search beneficiary").fill("Maria");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: /Maria Santos Reyes/ }).click();
  await page.getByLabel(/I checked a valid government-issued ID/).check();
  await page.getByRole("button", { name: "Confirm identity" }).click();
  await page.getByLabel("Assistance program").selectOption({ label: "Pension" });
  await expect(page.getByRole("status")).toContainText("Not eligible");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

  // Through the API, each failed rule is refused
  const maria = (await (await page.request.get("/api/beneficiaries?osca=OSCA-TEST-0001")).json()).results[0];
  const repeat = await claim(page.request, { beneficiaryId: maria.id, programId: ids.Pension });
  expect(repeat.status()).toBe(409);
  expect((await repeat.json()).code).toBe("WITHIN_RESTRICTED_PERIOD");

  const inactive = await claim(page.request, { beneficiaryId: maria.id, programId: ids.Burial });
  expect(inactive.status()).toBe(409);
  expect((await inactive.json()).code).toBe("PROGRAM_INACTIVE");

  const off = await register(page.request, "Deactivated");
  await page.request.post(`/api/beneficiaries/${off.id}/status`, { data: { status: "DEACTIVATED", reason: "E2E test" } });
  const deactivated = await claim(page.request, { beneficiaryId: off.id, programId: ids.Medical });
  expect(deactivated.status()).toBe(409);
  expect((await deactivated.json()).code).toBe("DEACTIVATED");
});

test("saving the same claim several times at once records it only once", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  const ids = await programIds(page);
  const person = await register(page.request, "Doublesave");
  const send = () => claim(page.request, { beneficiaryId: person.id, programId: ids.Grocery });
  const statuses = (await Promise.all([send(), send(), send(), send()])).map((r) => r.status()).sort();
  expect(statuses).toEqual([201, 409, 409, 409]);
});
