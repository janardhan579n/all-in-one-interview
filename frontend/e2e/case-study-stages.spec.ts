import { test, expect } from '@playwright/test';

/**
 * 6. A case study's stage navigation.
 *
 * `content/system-design/case-studies/chat-application.json` grows the architecture across four
 * evolution stages (polling → WebSockets → several servers, messages go missing → 10M concurrent
 * users), each adding components the previous stage didn't have. `CaseStudyPage.tsx` renders the
 * current stage's `ArchitectureCanvas` as an SVG whose `aria-label` is the stage's own title and
 * whose nodes are one `<g>` per component — so moving between stages should change both.
 */

const CASE_STUDY_PATH = '/system-design/case-studies/chat-application';

test.describe('case study stage navigation', () => {
  test('moving between architecture-evolution stages changes the rendered diagram', async ({ page }) => {
    await page.goto(CASE_STUDY_PATH);
    await expect(page.getByRole('heading', { name: 'Design a Chat Application' })).toBeVisible();

    await page.getByRole('tab', { name: 'Architecture evolution' }).click();

    // Each architecture node is drawn as a clickable <g role="button">, one per component —
    // that's what's counted below, not the <g> wrapping each edge line.
    const diagram = page.getByRole('img', { name: /Stage 1/i });
    await expect(diagram).toBeVisible();
    // Stage 1 ("polling") has 3 components: client, app server, database.
    await expect(diagram.getByRole('button')).toHaveCount(3);

    await page.getByRole('button', { name: 'Stage 2 — WebSockets' }).click();

    const stage2Diagram = page.getByRole('img', { name: /Stage 2/i });
    await expect(stage2Diagram).toBeVisible();
    // The stage 1 diagram (a different aria-label) is gone, not just visually replaced.
    await expect(page.getByRole('img', { name: /^Stage 1/ })).toHaveCount(0);
    // Stage 2 adds a load balancer: 4 components.
    await expect(stage2Diagram.getByRole('button')).toHaveCount(4);

    await page.getByRole('button', { name: /Stage 4/ }).click();
    const stage4Diagram = page.getByRole('img', { name: /Stage 4/i });
    await expect(stage4Diagram).toBeVisible();
    // Stage 4 ("10M concurrent users") has grown to 9 components.
    await expect(stage4Diagram.getByRole('button')).toHaveCount(9);

    // Jumping straight from stage 4 to stage 1 also updates the diagram — this isn't just
    // "next" incrementing something.
    await page.getByRole('button', { name: /Stage 1/ }).click();
    await expect(page.getByRole('img', { name: /Stage 1/i }).getByRole('button')).toHaveCount(3);
  });
});
