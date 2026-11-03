import { expect, test, type Page } from "@playwright/test";

// Every page and API route checks who is signed in (requirePageUser / requireApiUser).
// Run "npm run db:seed:test" first.

async function loginOk(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

const ID = "any-id"; // the check happens before the record is looked up

const PAGES = [
  "/dashboard",
  "/beneficiaries/register",
  "/verify",
  "/eligibility",
  "/assistance/new",
  "/history",
  `/beneficiaries/${ID}/history`,
  "/admin/users",
  "/beneficiaries",
  `/beneficiaries/${ID}`,
  "/reports",
];
const ADMIN_PAGES = ["/admin/users", "/beneficiaries", `/beneficiaries/${ID}`, "/reports"];

type Call = [method: "GET" | "POST" | "PATCH" | "DELETE", url: string, adminOnly: boolean];
const API: Call[] = [
  ["GET", "/api/beneficiaries?q=a", false],
  ["POST", "/api/beneficiaries", false],
  ["PATCH", `/api/beneficiaries/${ID}`, true],
  ["POST", `/api/beneficiaries/${ID}/status`, true],
  ["POST", `/api/beneficiaries/${ID}/face`, true],
  ["DELETE", `/api/beneficiaries/${ID}/face`, true],
  ["POST", "/api/face/match", false],
  ["POST", "/api/eligibility", false],
  ["POST", "/api/assistance", false],
  ["GET", "/api/reports?type=masterlist", true],
  ["POST", "/api/users", true],
  ["PATCH", `/api/users/${ID}`, true],
];

test("a visitor who is not signed in is sent to the login page and refused by every API route", async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login$/);
  }
  for (const [method, url] of API) {
    const res = await page.request.fetch(url, { method, data: {} });
    expect(res.status(), `${method} ${url}`).toBe(401);
  }
});

test("staff are kept out of every Admin page and Admin API route", async ({ page }) => {
  await loginOk(page, "staff1", "Staff@123");
  // The greeting uses the whole account name, not just its first word
  await expect(page.getByRole("heading", { level: 1 })).toContainText("OSCA Releasing Staff");
  for (const path of ADMIN_PAGES) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/dashboard$/);
  }
  for (const [method, url] of API.filter(([, , adminOnly]) => adminOnly)) {
    const res = await page.request.fetch(url, { method, data: {} });
    expect(res.status(), `${method} ${url}`).toBe(403);
  }
});
