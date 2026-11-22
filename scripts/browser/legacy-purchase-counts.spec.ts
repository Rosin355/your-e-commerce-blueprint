import { expect, test, type Page } from '@playwright/test';

async function staff(page: Page, role?: string) {
  if (role)
    await page.addInitScript(() => {
      localStorage.setItem(
        'sb-127-auth-token',
        JSON.stringify({
          access_token: 'synthetic-token',
          refresh_token: 'synthetic-refresh',
          token_type: 'bearer',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'synthetic-staff', aud: 'authenticated' },
        }),
      );
    });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname.startsWith('/rest/v1/'))
      return route.fulfill({ json: [] });
    if (url.pathname.endsWith('/functions/v1/product-admin-api'))
      return route.fulfill({ json: { ok: true, roles: role ? [role] : [] } });
    return route.continue();
  });
  await page.goto('/admin/storico-acquisti');
}
test('ospite ed editor non aprono il registro', async ({ page }) => {
  await staff(page);
  await expect(page.locator('input[type=password]')).toBeVisible();
  await expect(
    page.locator('iframe[title="Registro storico privato"]'),
  ).toHaveCount(0);
  await staff(page, 'editor');
  await expect(
    page.getByRole('alert').filter({ hasText: 'ruolo amministratore' }),
  ).toBeVisible();
  await expect(
    page.locator('iframe[title="Registro storico privato"]'),
  ).toHaveCount(0);
});
test('amministratore consulta un file locale in frame isolato senza trasmettere gli ID', async ({
  page,
}) => {
  await staff(page, 'admin');
  const frame = page.frameLocator('iframe[title="Registro storico privato"]');
  const input = frame.locator('input[type=file]');
  await expect(input).toBeVisible();
  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.frame().parentFrame()) requests.push(req.url());
  });
  const rows = Array.from({ length: 858 }, (_, i) => ({
    woo_id: String(i + 1),
    purchases: i < 95 ? 2 : 1,
    role: i === 857 ? 'author' : 'customer',
    assessment: i === 857 ? 'author' : i === 0 ? 'quarantine' : 'candidate',
    shopify_gid: null,
  }));
  const upload = (value: unknown) =>
    input.setInputFiles({
      name: 'conteggi.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(value)),
    });
  await upload({ format: 'onlinegarden-purchase-counts-v1', rows });
  await expect(frame.getByRole('status')).toContainText('953 acquisti');
  await frame.getByRole('button', { name: 'Avanti' }).click();
  await expect(frame.getByText('Pagina 2 di 35')).toBeVisible();
  await frame
    .getByLabel('Riconciliazione', { exact: true })
    .selectOption('author');
  await expect(frame.locator('tbody tr')).toHaveCount(1);
  await expect(frame.locator('tbody')).toContainText('858');
  await frame.getByLabel('Riconciliazione', { exact: true }).selectOption('');
  await frame.getByLabel('ID WooCommerce', { exact: true }).fill('1');
  await expect(frame.locator('tbody')).toContainText('Quarantena');
  expect(
    await page
      .locator('iframe')
      .evaluate((el: HTMLIFrameElement) => el.contentDocument === null),
  ).toBe(true);
  await frame.getByRole('button', { name: 'Chiudi registro' }).click();
  await expect(frame.locator('tbody tr')).toHaveCount(0);
  await upload({
    format: 'onlinegarden-purchase-counts-v1',
    rows: rows.slice(1),
  });
  await expect(frame.getByRole('status')).toContainText('File non valido');
  expect(requests).toEqual([]);
});
