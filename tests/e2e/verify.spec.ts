import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Verify Identity (UC 3.0) checks that need no real face. Run "npm run db:seed:test" first.
// T13 and T14 with a real person in front of the webcam are still checked by hand.

async function loginOk(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

// Made-up face vectors. Random 128-number vectors are almost unrelated to each other (score near 0).
const randomFace = () => Array.from({ length: 128 }, () => Math.random() * 2 - 1);
const unit = (v: number[]) => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};
const plus = (a: number[], b: number[]) => a.map((x, i) => x + b[i]);

async function register(request: APIRequestContext, name: string, embedding?: number[]) {
  const res = await request.post("/api/beneficiaries", {
    data: {
      data: {
        firstName: name,
        lastName: "Facetest",
        birthDate: "1950-01-01",
        sex: "F",
        address: "1 Test Street",
        barangay: "Poblacion",
        oscaIdNo: `FACE-${name}-${Date.now()}`,
      },
      consent: !!embedding,
      embedding,
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).beneficiary;
}

const match = async (request: APIRequestContext, embedding: number[]) =>
  (await request.post("/api/face/match", { data: { embedding } })).json();

test("face match returns a match, no match or an ambiguous result", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  const a = randomFace();
  const b = randomFace();
  const alpha = await register(page.request, "Alpha", a);
  const beta = await register(page.request, "Beta", b);

  // T13 (logic): a slightly different capture of the same face is matched
  const same = await match(page.request, plus(a, a.map(() => Math.random() * 0.1)));
  expect(same.status).toBe("MATCH");
  expect(same.beneficiary.id).toBe(alpha.id);

  // T14 (logic): an unregistered face gets no match
  expect((await match(page.request, randomFace())).status).toBe("NO_MATCH");

  // A face halfway between two records is ambiguous and both records are shown
  const between = await match(page.request, plus(unit(a), unit(b)));
  expect(between.status).toBe("AMBIGUOUS");
  expect(between.candidates.map((c: { beneficiary: { id: string } }) => c.beneficiary.id).sort()).toEqual(
    [alpha.id, beta.id].sort(),
  );
});

test("a record without face data is flagged and can only be verified by manual ID", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  const flagged = await register(page.request, "Flagged");
  expect(flagged.needsManualVerification).toBe(true);

  await page.goto("/verify");
  await page.getByRole("tab", { name: "Manual ID" }).click();
  await page.getByLabel("Search beneficiary").fill(flagged.referenceNo);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: /Flagged Facetest/ }).click();
  await page.getByLabel(/I checked a valid government-issued ID/).check();
  await page.getByRole("button", { name: "Confirm identity" }).click();
  await expect(page.getByText("Identity verified")).toBeVisible();
  await expect(page.getByText("Verified by manual ID")).toBeVisible();
});

test("T15 face models fail to load, so manual ID is offered", async ({ page }) => {
  await page.route("**/models/**", (route) => route.abort());
  await loginOk(page, "staff1", "Staff@123");
  await page.goto("/verify");
  await expect(page.getByRole("alert").filter({ hasText: "face recognition models could not be loaded" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("tab", { name: "Manual ID" })).toHaveAttribute("aria-selected", "true");
});
