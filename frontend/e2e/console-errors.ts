import type { Page } from '@playwright/test';

/**
 * Watches a page for console errors and uncaught exceptions from the moment it is attached.
 *
 * Attach it before `page.goto(...)` so nothing during the initial load is missed. `assertClean`
 * throws (with every message collected) if anything came through, so a failing assertion tells
 * you exactly what broke rather than just that something did.
 */
export function watchConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    errors.push(`uncaught exception: ${error.message}`);
  });

  return {
    errors,
    assertClean(context: string) {
      if (errors.length > 0) {
        throw new Error(`${context} produced console error(s):\n${errors.map((line) => `  - ${line}`).join('\n')}`);
      }
    },
  };
}
