import type { Page } from '@playwright/test';

/**
 * Clicks through ProblemPage's staged reveal to the end, so a test that cares about what comes
 * *after* the gate (the visualiser, the optimised code) doesn't have to re-describe the gate
 * itself. `problem-insight-gate.spec.ts` is what actually verifies the gate's behaviour
 * stage-by-stage; this is just plumbing for tests that need to get past it.
 */
export async function passProblemGate(page: Page): Promise<void> {
  await page.getByRole('button', { name: "I've thought about it →" }).click();
  await page.getByRole('button', { name: /Why is that not good enough/i }).click();
  await page.getByRole('button', { name: /Which pattern does this need/i }).click();
  await page.getByRole('button', { name: /Show the optimised solution/i }).click();
}
