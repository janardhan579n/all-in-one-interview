import { test, expect } from '@playwright/test';

/**
 * 2. The insight gate on a problem page.
 *
 * ProblemPage.tsx stages its reveal: think first, then brute force, then why it's slow, then
 * the pattern, and only then the optimised solution (see the "Staged reveal" section there).
 * This is the pedagogical spine of the whole app — a refactor that shows the optimised code
 * immediately would break the product while every unit test (which exercises the data and the
 * visualiser engines, not this page's own gating) stayed green.
 *
 * The optimised code must be genuinely ABSENT from the DOM before the gate is passed, not just
 * hidden — `toHaveCount(0)` rather than `not.toBeVisible()`, so a CSS-only "hide the answer"
 * regression is still caught.
 */

const PROBLEM_PATH = '/problems/two-sum';
// From content/dsa/problems/two-sum.json — a distinctive line that only appears in the
// optimised solution's code listing, not in the brute force's.
const OPTIMIZED_MARKER = 'Integer j = seen.get(need);';

test.describe('problem page insight gate', () => {
  test('the optimised solution is absent until every stage is passed, then appears', async ({ page }) => {
    await page.goto(PROBLEM_PATH);

    await expect(page.getByRole('heading', { name: 'Two Sum', exact: false })).toBeVisible();

    // Stage 0: only the prompt to think it through first. Brute force and optimised code are
    // both absent.
    await expect(page.getByText("I've thought about it")).toBeVisible();
    await expect(page.getByText(OPTIMIZED_MARKER)).toHaveCount(0);
    await expect(page.getByText(/Show the optimised solution/i)).toHaveCount(0);

    await page.getByRole('button', { name: "I've thought about it →" }).click();

    // Stage 1: brute force is visible, optimised solution is still not in the DOM at all.
    await expect(page.getByText('Brute force', { exact: true })).toBeVisible();
    await expect(page.getByText(OPTIMIZED_MARKER)).toHaveCount(0);

    await page.getByRole('button', { name: /Why is that not good enough/i }).click();

    // Stage 2: the "why it's slow" callout appears; still no optimised code.
    await expect(page.getByText('Why it is too slow')).toBeVisible();
    await expect(page.getByText(OPTIMIZED_MARKER)).toHaveCount(0);

    await page.getByRole('button', { name: /Which pattern does this need/i }).click();

    // Stage 3: pattern identification appears; the optimised solution is STILL not present —
    // this is the step right before the gate opens, the easiest place for a regression to leak
    // the answer one click early.
    await expect(page.getByText('Identifying the pattern')).toBeVisible();
    await expect(page.getByText(OPTIMIZED_MARKER)).toHaveCount(0);

    await page.getByRole('button', { name: /Show the optimised solution/i }).click();

    // Stage 4: gate passed. The optimised solution is now genuinely in the DOM.
    await expect(page.getByText('Optimised', { exact: true })).toBeVisible();
    await expect(page.getByText(OPTIMIZED_MARKER)).toBeVisible();
  });
});
