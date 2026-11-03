import { expect, test, type Page } from "@playwright/test";

// Register Senior Citizen (UC 1.0). Run "npm run db:seed:test" first. Made-up data only.

async function loginOk(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

const cont = (page: Page) => page.getByRole("button", { name: "Continue" }).click();

async function fillPersonal(page: Page, birthDate = "1950-03-12") {
  await page.getByLabel("First name").fill("Juan");
  await page.getByLabel("Last name").fill("Testcase");
  await page.getByLabel("Suffix").fill("Jr.");
  await page.getByLabel("Birth date").fill(birthDate);
  await page.getByLabel("Birthplace").fill("Cebu City");
  await page.getByLabel("Sex").selectOption("M");
  await page.getByLabel("Civil status").selectOption("Widowed");
}

async function fillContact(page: Page) {
  await page.getByLabel("Mobile number").nth(0).fill("09171234567");
  await page.getByLabel("Email address").fill("juan.testcase@example.com");
  await page.getByLabel("House / street").fill("12 Test Street");
  await page.getByLabel("Barangay").selectOption("San Isidro");
  await page.getByLabel("Contact name").fill("Ana Testcase");
  await page.getByLabel("Relationship").fill("Daughter");
  await page.getByLabel("Mobile number").nth(1).fill("09179876543");
}

async function fillId(page: Page, oscaIdNo: string) {
  await page.getByLabel("ID type").selectOption("OSCA ID");
  await page.getByLabel("ID number").fill(oscaIdNo);
  await page.getByLabel("Place of issue").fill("Cebu City");
  await page.getByLabel("Issue date").fill("2020-01-15");
}

test("T05 a missing required field is highlighted", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  await page.goto("/beneficiaries/register");
  await cont(page);
  await expect(page.getByText("First name is required")).toBeVisible();
  await expect(page.getByLabel("First name")).toHaveClass(/input-error/);
  await expect(page.getByRole("heading", { name: "Personal Details" })).toBeVisible();
});

test("T06 an applicant who is 59 is blocked", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  await page.goto("/beneficiaries/register");
  const d = new Date();
  d.setFullYear(d.getFullYear() - 59);
  await fillPersonal(page, d.toISOString().slice(0, 10));
  await cont(page);
  await expect(page.getByText("Applicant must be at least 60 years old")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Personal Details" })).toBeVisible();
});

test("T07 declining consent saves the record without face data, flagged, with every detail", async ({ page }) => {
  await loginOk(page, "admin", "Admin@123");
  await page.goto("/beneficiaries/register");
  const osca = `OSCA-E2E-${Date.now()}`;
  await fillPersonal(page);
  await cont(page);
  await fillContact(page);
  await cont(page);
  await fillId(page, osca);
  await cont(page);
  await page.getByText("No, continue with manual verification").click();
  await expect(page.getByText("No face data will be saved")).toBeVisible();
  await cont(page);
  await page.getByRole("button", { name: "Save beneficiary" }).click();
  await expect(page.getByText("Registration Complete")).toBeVisible();
  await expect(page.getByText("This record is flagged for manual ID verification")).toBeVisible();

  // The extra registration details are saved and shown on the record page
  const found = await (await page.request.get(`/api/beneficiaries?osca=${osca}`)).json();
  await page.goto(`/beneficiaries/${found.results[0].id}`);
  await expect(page.getByRole("heading", { name: "Juan Testcase Jr." })).toBeVisible();
  for (const text of ["Cebu City", "Widowed", "juan.testcase@example.com", "Ana Testcase, Daughter", "09179876543", "OSCA ID", "2020-01-15", "No expiry"]) {
    await expect(page.getByRole("definition").filter({ hasText: text }).first()).toBeVisible();
  }
  await expect(page.getByText("Consent status: Not recorded")).toBeVisible();
});

test("T08 the same OSCA ID twice is blocked and the existing record is shown", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  await page.goto("/beneficiaries/register");
  await fillPersonal(page);
  await cont(page);
  await fillContact(page);
  await cont(page);
  await fillId(page, "OSCA-TEST-0001");
  await cont(page);
  await expect(page.getByRole("alert").filter({ hasText: "This OSCA ID number is already registered." })).toContainText("Maria Santos Reyes");
  await expect(page.getByRole("heading", { name: "Identification" })).toBeVisible();
});
