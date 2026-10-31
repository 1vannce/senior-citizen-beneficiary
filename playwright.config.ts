import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  // Tests share one SQLite file, so run them one at a time
  workers: 1,
  expect: { timeout: 15_000 },
  timeout: 60_000, // the dev server compiles pages on first visit
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
