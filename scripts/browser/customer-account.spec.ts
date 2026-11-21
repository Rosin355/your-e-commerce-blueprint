import { expect, test } from '@playwright/test';
import { hostedCustomerAccount } from '../../src/customer/config';

for (const [width, accountLabel] of [[1440, 'Il mio account'], [390, 'Area account']] as const) {
  test(`area clienti ospitata e ritorno al negozio a ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.href === hostedCustomerAccount) {
        return route.fulfill({ contentType: 'text/html', body: '<h1>Accesso Shopify sintetico</h1>' });
      }
      if (url.origin !== new URL(baseURL!).origin) return route.abort();
      return route.continue();
    });
    await page.goto('/');
    const account = page.getByRole('link', { name: accountLabel, exact: true });
    await expect(account).toBeVisible();
    await expect(account).toHaveAttribute('href', '/account');
    await account.click();
    await expect(page.getByRole('heading', { name: 'Accesso Shopify sintetico' })).toBeVisible();
    await page.goBack();
    await expect(account).toBeVisible();
    await expect(page).toHaveURL(new URL('/', baseURL).href);
  });
}
