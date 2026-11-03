import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Capture Facial Data (UC 2.0) checks that need no real face. Run "npm run db:seed:test" first.
// The fake camera shows a test pattern with no face in it. T10 (photo or screen fails liveness)
// and a real T12 with a person in front of the webcam are still checked by hand.

async function loginOk(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

const cont = (page: Page) => page.getByRole("button", { name: "Continue" }).click();

// Fill the first three steps and stop at "Consent & capture"
async function reachConsent(page: Page, oscaIdNo: string) {
  await page.goto("/beneficiaries/register");
  await page.getByLabel("First name").fill("Pedro");
  await page.getByLabel("Last name").fill("Camtest");
  await page.getByLabel("Birth date").fill("1948-07-21");
  await page.getByLabel("Birthplace").fill("Cebu City");
  await page.getByLabel("Sex").selectOption("M");
  await page.getByLabel("Civil status").selectOption("Married");
  await cont(page);
  await page.getByLabel("Mobile number").nth(0).fill("09171112222");
  await page.getByLabel("House / street").fill("3 Test Street");
  await page.getByLabel("Barangay").selectOption("San Isidro");
  await page.getByLabel("Contact name").fill("Rosa Camtest");
  await page.getByLabel("Relationship").fill("Spouse");
  await page.getByLabel("Mobile number").nth(1).fill("09173334444");
  await cont(page);
  await page.getByLabel("ID type").selectOption("OSCA ID");
  await page.getByLabel("ID number").fill(oscaIdNo);
  await page.getByLabel("Place of issue").fill("Cebu City");
  await page.getByLabel("Issue date").fill("2019-05-10");
  await cont(page);
  await expect(page.getByRole("heading", { name: "Privacy consent and facial capture" })).toBeVisible();
}

// Made-up face vectors. Random 128-number vectors are almost unrelated to each other (score near 0).
const randomFace = () => Array.from({ length: 128 }, () => Math.random() * 2 - 1);
const plus = (a: number[], b: number[]) => a.map((x, i) => x + b[i]);

const register = (request: APIRequestContext, oscaIdNo: string, embedding: number[]) =>
  request.post("/api/beneficiaries", {
    data: {
      data: {
        firstName: "Dupe",
        lastName: "Facetest",
        birthDate: "1950-01-01",
        sex: "F",
        address: "1 Test Street",
        barangay: "Poblacion",
        oscaIdNo,
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
      consent: true,
      embedding,
    },
  });

test.describe("face capture with the fake camera", () => {
  // The face models take a while to load in a headless browser
  test.setTimeout(120_000);

  test("T09 no face in view asks the senior to reposition", async ({ page }) => {
    await loginOk(page, "staff1", "Staff@123");
    await reachConsent(page, `CAM-T09-${Date.now()}`);
    await page.getByText("Yes, consent was freely given").click();
    await expect(page.getByText("Camera ready")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("No face found. Please reposition and face the camera.")).toBeVisible();
    // Nothing can be captured, so the step cannot be left with "Yes"
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("T11 three failed captures, then manual verification, flags the record", async ({ page }) => {
    await loginOk(page, "admin", "Admin@123");
    const osca = `CAM-T11-${Date.now()}`;
    await reachConsent(page, osca);
    await page.getByText("Yes, consent was freely given").click();
    await expect(page.getByText("Camera ready")).toBeVisible({ timeout: 60_000 });

    const captureBtn = page.getByRole("button", { name: "Capture facial data" });
    for (const n of [1, 2]) {
      await captureBtn.click();
      await expect(page.getByRole("alert").filter({ hasText: `Attempt ${n} of 3` })).toContainText("No face found");
    }
    await captureBtn.click();
    await expect(page.getByText("Face capture failed 3 times. Choose manual verification to continue.")).toBeVisible();
    await expect(captureBtn).toBeHidden();

    await page.getByText("No, continue with manual verification").click();
    await cont(page);
    const sent = page.waitForRequest((r) => r.url().endsWith("/api/beneficiaries") && r.method() === "POST");
    await page.getByRole("button", { name: "Save beneficiary" }).click();
    await expect(page.getByText("Registration Complete")).toBeVisible();
    await expect(page.getByText("This record is flagged for manual ID verification")).toBeVisible();

    // No face template (and no image) goes to the server without consent
    const body = (await sent).postDataJSON();
    expect(body.consent).toBe(false);
    expect(body.embedding).toBeUndefined();
    expect((await sent).postData()).not.toContain("data:image");

    const found = await (await page.request.get(`/api/beneficiaries?osca=${osca}`)).json();
    expect(found.results[0].needsManualVerification).toBe(true);
    await page.goto(`/beneficiaries/${found.results[0].id}`);
    await expect(page.getByText("Consent status: Not recorded")).toBeVisible();
  });
});

test("T12 (logic) registering the same face again is blocked as a duplicate", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  const face = randomFace();
  const stamp = Date.now();
  const first = await register(page.request, `DUPE-A-${stamp}`, face);
  expect(first.status()).toBe(201);
  const firstId = (await first.json()).beneficiary.id;

  // A second capture of the same face, under a new OSCA ID
  const again = await register(page.request, `DUPE-B-${stamp}`, plus(face, face.map(() => Math.random() * 0.1)));
  expect(again.status()).toBe(409);
  const body = await again.json();
  expect(body.code).toBe("DUPLICATE_FACE");
  expect(body.existing.id).toBe(firstId);
  const notSaved = await (await page.request.get(`/api/beneficiaries?osca=DUPE-B-${stamp}`)).json();
  expect(notSaved.results).toEqual([]);

  // A different face is not blocked
  expect((await register(page.request, `DUPE-C-${stamp}`, randomFace())).status()).toBe(201);
});
