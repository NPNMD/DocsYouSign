import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("SignToSeal").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /get started with google/i })).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Simple pricing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
  });

  test("health API returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", service: "signtoseal" });
    expect(typeof body.time).toBe("string");
  });

  test("not-found page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByText("404")).toBeVisible();
  });
});
