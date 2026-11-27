import { expect, test } from "@playwright/test";

test("Admin apre la scheda, applica il filtro ed esporta la selezione autorizzata", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "sb-127-auth-token",
      JSON.stringify({
        access_token: "synthetic-token",
        refresh_token: "synthetic-refresh",
        token_type: "bearer",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: "test-admin", aud: "authenticated" },
      }),
    )
  );
  let exported = false;
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname !== "127.0.0.1") return route.abort();
    if (u.pathname.endsWith("/product-admin-api")) {
      return route.fulfill({ json: { ok: true, roles: ["editor"] } });
    }
    if (u.pathname.endsWith("/woo_archive_access")) {
      return route.fulfill({ json: true });
    }
    if (u.pathname.endsWith("/woo_archive_read")) {
      const args = route.request().postDataJSON();
      expect(u.search).toBe("");
      if (args.p_action === "detail") {
        return route.fulfill({
          json: {
            id: "8",
            first_name: "Demo",
            last_name: "Otto",
            email: "demo@example.invalid",
            purchases: 2,
          },
        });
      }
      if (args.p_action === "export") {
        expect(args.p_purpose).toBe("verifica_archivio");
        expect(args.p_filter).toBe("with");
        exported = true;
      }
      return route.fulfill({
        json: {
          accounts: 1,
          buyers: 1,
          purchases: 2,
          total: 1,
          rows: [{ id: "8", name: "Demo Otto", purchases: 2 }],
        },
      });
    }
    if (u.pathname.startsWith("/rest/v1/")) return route.fulfill({ json: [] });
    return route.continue();
  });
  await page.goto("/admin/clienti-storici");
  await page.getByLabel("Acquisti storici").selectOption("with");
  await page.getByRole("button", { name: "Cerca" }).click();
  await page.getByRole("button", { name: "Apri scheda Woo 8" }).click();
  await expect(page.getByText("Email storica · demo@example.invalid"))
    .toBeVisible();
  const button = page.getByRole("button", { name: "Esporta 1 risultati" });
  await expect(button).toBeDisabled();
  await page.getByLabel("Motivo dell’esportazione").selectOption(
    "verifica_archivio",
  );
  const download = page.waitForEvent("download");
  await button.click();
  expect((await download).suggestedFilename()).toBe("archivio-woocommerce.csv");
  expect(exported).toBe(true);
});
