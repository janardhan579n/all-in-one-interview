import { test, expect } from '@playwright/test';
import { passProblemGate } from './gate';

/**
 * 3. A visualiser actually animates.
 *
 * `Visualizer.tsx`'s `CodePane` highlights `activeLine === lineNumber`, where `lineNumber` is
 * `index + 1` over the 0-based `code` array and `activeLine` is `step.codeLine + codeLineOffset`.
 * `step.codeLine` is already 1-based in every engine (see `visualizers/engines/`). Getting either
 * half of that off by one narrates the wrong source line while everything still "looks
 * animated" — exactly the kind of bug unit tests on the engines alone can't catch, because it's
 * the wiring between the engine's output and this component that's wrong, not the engine.
 *
 * `merge-sorted-array`'s `mergeSortSteps` trace (`array: [5, 2, 9, 1, 6, 3]`, the input this
 * engine defaults to) is deterministic: step 0 highlights code line 1 ("void mergeSort(..."),
 * step 1 highlights line 4 ("int middle = ..."). That's asserted directly, not just "it changed
 * to something.
 */

const PROBLEM_PATH = '/problems/merge-sorted-array';

test.describe('a step visualiser animates', () => {
  test('stepping forward advances the step index and moves the highlighted code line', async ({ page }) => {
    await page.goto(PROBLEM_PATH);
    await passProblemGate(page);

    const visualizer = page.getByLabel('Visualisation', { exact: true });
    await expect(visualizer).toBeVisible();

    const activeLine = visualizer.locator('[aria-current="step"]');
    const stepCounter = visualizer.getByText(/^\d+ \/ \d+$/);

    // Step 0: line 1, the function signature.
    await expect(stepCounter).toHaveText('1 / 12');
    await expect(activeLine).toContainText('void mergeSort');

    const nextButton = visualizer.getByRole('button', { name: 'Next step' });
    await nextButton.click();

    // Step 1: the index advanced by exactly one, and the highlighted line jumped from the
    // function signature to the midpoint calculation — a different source line, not just a
    // different frame of the same line.
    await expect(stepCounter).toHaveText('2 / 12');
    await expect(activeLine).toContainText('int middle');
    await expect(activeLine).not.toContainText('void mergeSort');

    await nextButton.click();
    await nextButton.click();
    await nextButton.click();

    // Step 4: line 8, the merge call — four clicks in from the start, still tracking correctly
    // (the trace revisits line 4 at steps 2 and 3 along the way, which is why this asserts the
    // step count precisely rather than just "not line 1 or 4").
    await expect(stepCounter).toHaveText('5 / 12');
    await expect(activeLine).toContainText('merge(a, from, middle, to)');
  });

  test('play animates through steps without manual clicking', async ({ page }) => {
    await page.goto(PROBLEM_PATH);
    await passProblemGate(page);

    const visualizer = page.getByLabel('Visualisation', { exact: true });
    const stepCounter = visualizer.getByText(/^\d+ \/ \d+$/);
    await expect(stepCounter).toHaveText('1 / 12');

    await visualizer.getByRole('button', { name: /^Play$/ }).click();

    // The player advances on its own timer; wait for the counter to move off the start rather
    // than sleeping a fixed amount.
    await expect(stepCounter).not.toHaveText('1 / 12', { timeout: 10_000 });
  });
});
