import { test, expect } from '@playwright/test';
import { enumerateRoutes } from './routes';
import { watchConsoleErrors } from './console-errors';

/**
 * 1. The app boots, and every top-level route renders without a console error.
 *
 * Routes are read out of App.tsx (see routes.ts) instead of copied here, so a new page added to
 * the router is covered automatically instead of silently missing from this suite. A React
 * error boundary or a caught-and-swallowed exception that still leaves the page blank both count
 * as failures: this checks for console.error/uncaught exceptions AND for visible content, not
 * just a 200 response.
 */

const routes = enumerateRoutes();

test.describe('every top-level route boots cleanly', () => {
  for (const { pattern, path } of routes) {
    test(`${pattern} -> ${path}`, async ({ page }) => {
      const watcher = watchConsoleErrors(page);

      await page.goto(path);

      // The loading spinner (role="status") must resolve — a route stuck loading forever is as
      // much a failure as a crash.
      await expect(page.getByRole('status')).toHaveCount(0);

      const main = page.locator('#main');
      await expect(main).toBeVisible();
      await expect(main).not.toBeEmpty();

      // ErrorBox's fallback text — shown by a caught fetch/render failure. The page "loads" in
      // the sense that something is on screen, but it is still not the route working.
      await expect(page.getByText('Something went wrong')).toHaveCount(0);

      watcher.assertClean(`${pattern} (${path})`);
    });
  }
});
