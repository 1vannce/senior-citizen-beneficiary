import { expect, test, type Page } from "@playwright/test";

// Run "npm run db:seed" first so the fake test accounts exist.

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  // Wait for the sign-in request so a following page.goto() cannot cancel it
  const done = page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials"));
  await page.getByRole("button", { name: "Sign in" }).click();
  await done;
}

async function loginOk(page: Page, username: string, password: string) {
  await login(page, username, password);
  await expect(page).toHaveURL(/dashboard/);
}

// Next.js adds its own empty role=alert route announcer, so only match alerts with text.
const alert = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });

async function createUser(page: Page, prefix: string) {
  await loginOk(page, "admin", "Admin@123");
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Create account" }).click();
  const name = `${prefix}${Date.now().toString().slice(-6)}`;
  await page.getByLabel("Username").fill(name);
  await page.getByLabel("Full name").fill("E2E Test");
  await page.getByLabel("Password").fill("Passw0rd!");
  await page.getByRole("button", { name: "Save account" }).click();
  await expect(page.getByText("Account created.")).toBeVisible();
  return name;
}

test("T01 wrong password shows an error and allows retry", async ({ page }) => {
  await login(page, "staff2", "wrong-password");
  await expect(alert(page)).toContainText("Incorrect username or password");
  await loginOk(page, "staff2", "Staff@123");
});

test("T02 five wrong passwords lock the account", async ({ page }) => {
  const name = await createUser(page, "lock");
  await page.context().clearCookies();
  for (let i = 0; i < 5; i++) await login(page, name, "bad-password");
  await expect(alert(page)).toContainText("locked");

  // Admin unlocks the account, then the user can sign in again
  await loginOk(page, "admin", "Admin@123");
  await page.goto("/admin/users");
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("Locked");
  await row.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByText("Account updated.")).toBeVisible();
  await expect(row).toContainText("Active");

  await page.context().clearCookies();
  await loginOk(page, name, "Passw0rd!");
});

test("T03 deactivated account is denied", async ({ page }) => {
  const name = await createUser(page, "off");
  await page.getByRole("row", { name: new RegExp(name) }).getByRole("button", { name: "Deactivate" }).click();
  await page.getByRole("button", { name: "Deactivate account" }).click();
  await expect(page.getByText("Account updated.")).toBeVisible();

  await page.context().clearCookies();
  await login(page, name, "Passw0rd!");
  await expect(alert(page)).toContainText("deactivated");
});

test("T04 staff does not see admin menus", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Register" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Reports" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Beneficiary Records" })).toHaveCount(0);

  // Typing an admin address sends Staff back to the dashboard
  for (const path of ["/admin/users", "/beneficiaries", "/reports"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/dashboard/);
  }
});

test("idle session signs out after 15 minutes", async ({ page }) => {
  // Fake browser clock, so the real 15-minute limit is tested without waiting
  await page.clock.install();
  await loginOk(page, "staff1", "Staff@123");

  await page.clock.fastForward("14:00");
  await expect(page).toHaveURL(/dashboard/);

  await page.clock.fastForward("01:30");
  await expect(page).toHaveURL(/login/);
});

async function verifyByManualId(page: Page, search: string) {
  await page.goto("/assistance/new");
  await page.getByRole("tab", { name: "Manual ID" }).click();
  await page.getByLabel("Search beneficiary").fill(search);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: new RegExp(search) }).click();
  await page.getByLabel(/I checked a valid government-issued ID/).check();
  await page.getByRole("button", { name: "Confirm identity" }).click();
}

test("assistance journey with manual ID: verify, eligibility, record, history", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  await verifyByManualId(page, "Eduardo");
  await page.getByLabel("Assistance program").selectOption({ label: "Medical" });
  await expect(page.getByRole("status")).toContainText("Eligible");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Amount released").fill(`PHP ${Date.now() % 10000}`);
  await page.getByLabel("Document / voucher number").fill("V-1001");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Save and release" }).click();
  await expect(page.getByText("Assistance recorded")).toBeVisible();

  await page.getByRole("link", { name: "View assistance history" }).click();
  await expect(page.getByRole("cell", { name: "Medical" }).first()).toBeVisible();
});

test("T16 repeat claim inside the restricted period is ineligible", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  await verifyByManualId(page, "Maria");
  await page.getByLabel("Assistance program").selectOption({ label: "Pension" });
  await expect(page.getByRole("status")).toContainText("Not eligible");
});
