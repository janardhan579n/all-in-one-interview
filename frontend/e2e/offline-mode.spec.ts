import { test, expect } from '@playwright/test';

/**
 * 4. Offline/online mode.
 *
 * No backend is started for this suite — see playwright.config.ts's `webServer.env` and
 * vite.config.ts's `VITE_DISABLE_API_PROXY`, which make the locally-previewed server behave like
 * the actual static deploy (Netlify's `public/_redirects` sends every unmatched path, including
 * `/api/health`, to `index.html` with a 200) instead of like the dev-time proxy (which would
 * fail to connect to a backend on :8080 and return a hard error). That is deliberate: per
 * `services/platform.ts`'s `detectMode`, a 200 alone is not enough to call the app "online" — it
 * insists on a JSON body with `status === 'UP'`, precisely because an SPA fallback's 200 would
 * otherwise be mistaken for a live API. This test is what actually exercises that fallback path,
 * which is the one every visitor to the deployed site gets.
 */

test.describe('offline mode (no backend reachable)', () => {
  test('content loads from the bundle and the header shows the saved-in-this-browser state', async ({ page }) => {
    await page.goto('/problems/two-sum');

    // Bundled content renders even though there is no API — the problem statement is real
    // content served offline, not an error state.
    await expect(page.getByRole('heading', { name: 'Two Sum', exact: false })).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);

    // The header's connection badge settles on the offline wording once detectMode() resolves.
    const badge = page.getByText('saved in this browser', { exact: false });
    await expect(badge).toBeVisible();
    await expect(page.getByText('● backend', { exact: false })).toHaveCount(0);
    await expect(page.getByText('connecting', { exact: false })).toHaveCount(0);
  });

  test('the dashboard (root route) also renders fully offline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(page.getByText('saved in this browser', { exact: false })).toBeVisible();
  });
});
