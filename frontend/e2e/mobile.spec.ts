import { test, expect } from '@playwright/test';
import { enumerateRoutes } from './routes';

/**
 * 5. No horizontal scroll at 375px, on every route — plus the mobile nav drawer's open/close
 * behaviour.
 *
 * A horizontal-scroll bug in the nav drawer (AppShell.tsx: the drawer used to share a flex row
 * with the page content below `lg` instead of overlaying it) was just fixed; this is what stops
 * it coming back. `scrollWidth > clientWidth` on the root element is the actual definition of
 * "this page scrolls sideways" — checking for a specific overflowing element would miss whatever
 * element regresses next.
 */

const VIEWPORT = { width: 375, height: 667 };
const routes = enumerateRoutes();

test.describe('no horizontal scroll at 375px', () => {
  test.use({ viewport: VIEWPORT });

  for (const { pattern, path } of routes) {
    test(`${pattern} -> ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('status')).toHaveCount(0);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(
        overflow.scrollWidth,
        `document.documentElement.scrollWidth (${overflow.scrollWidth}) should not exceed clientWidth (${overflow.clientWidth}) on ${path}`,
      ).toBeLessThanOrEqual(overflow.clientWidth);
    });
  }
});

test.describe('mobile nav drawer', () => {
  test.use({ viewport: VIEWPORT });

  test('opens on the toggle, closes on Escape, and closes on backdrop click', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Toggle navigation' });
    const nav = page.getByRole('navigation', { name: 'Main' });

    // Closed by default: below `lg` the drawer's <aside> is not rendered at all (AppShell
    // renders `hidden` in place of the open classes), so the nav landmark is not visible.
    await expect(nav).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(nav).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // Escape closes it.
    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();

    // Backdrop click closes it too.
    await toggle.click();
    await expect(nav).toBeVisible();
    // The backdrop is the fixed, ARIA-hidden overlay AppShell renders behind the drawer while
    // it's open. It spans the full viewport, but the drawer itself (z-40, on top of it) only
    // covers the left ~85vw, so clicking near the right edge hits backdrop, not drawer content.
    await page.locator('[aria-hidden="true"].fixed.inset-0').click({ position: { x: 360, y: 300 } });
    await expect(nav).toBeHidden();
  });
});
