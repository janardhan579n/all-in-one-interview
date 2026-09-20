import { describe, expect, it } from 'vitest';
import { ENGINES } from './registry';
import type { Step } from './types';

/**
 * Every visualisation the content declares, actually run.
 *
 * A `visualization` block is content naming code: a problem says "animate me with `twoSumHash`
 * and this input". Nothing checks that the engine can *do* anything with that input. The content
 * validator confirms the engine name is registered and stops there, so a spec that hands
 * `graphBfs` an input with no `edges` key, or hands an engine a key it does not read, passes the
 * build and then renders a one-frame animation of an empty array — or throws inside the player.
 * Either way the page loads and the learner sees something that looks deliberate.
 *
 * Phase 9 caught a trie drawn with the wrong renderer by *looking* at it, and Phase 10 caught a
 * ring hashed with a clustering hash by *testing the property*. This is the third version of the
 * same lesson: the specs are data, there are over a hundred of them, and nobody is going to open
 * them all. So run them.
 *
 * What counts as passing:
 *   - the engine returns at least two steps (one step is not an animation)
 *   - every step carries a scene
 *   - `codeLine` is 1-based and must land inside the declared `code` array, or the player
 *     highlights nothing while confidently narrating a line
 *   - the run ends on a step marked `done`
 */

type Spec = {
  engine: string;
  input?: Record<string, unknown>;
  code?: string[];
  title?: string;
};

type Doc = { id: string; visualization?: Spec; interactive?: unknown };

const modules = import.meta.glob('../content-bundle/**/*.json', { eager: true, import: 'default' }) as Record<
  string,
  Doc
>;

/** Translation overlays mirror the tree and share ids with the English documents. */
const specs: { id: string; path: string; spec: Spec }[] = Object.entries(modules)
  .filter(([path]) => !path.includes('/i18n/'))
  .filter(([, doc]) => doc?.visualization?.engine)
  .map(([path, doc]) => ({ id: doc.id, path, spec: doc.visualization as Spec }));

describe('declared visualisations', () => {
  it('finds a substantial number of specs to check (guards against the glob silently breaking)', () => {
    expect(specs.length).toBeGreaterThan(80);
  });

  it.each(specs.map((entry) => [`${entry.id} → ${entry.spec.engine}`, entry] as const))(
    '%s runs and stays inside its own code listing',
    (_label, entry) => {
      const engine = ENGINES[entry.spec.engine];
      expect(engine, `${entry.id}: engine "${entry.spec.engine}" is not registered`).toBeTypeOf('function');

      let steps: Step[];
      try {
        steps = engine(entry.spec.input ?? {});
      } catch (error) {
        throw new Error(`${entry.id}: engine "${entry.spec.engine}" threw on its declared input — ${String(error)}`);
      }

      expect(Array.isArray(steps), `${entry.id}: engine did not return an array`).toBe(true);
      expect(steps.length, `${entry.id}: ${steps.length} step(s) — that is not an animation`).toBeGreaterThan(1);

      for (const [index, step] of steps.entries()) {
        expect(step.scene, `${entry.id}: step ${index} has no scene`).toBeTruthy();
        expect(typeof step.explain, `${entry.id}: step ${index} has no explanation`).toBe('string');
        expect(step.explain.length, `${entry.id}: step ${index} has an empty explanation`).toBeGreaterThan(0);

        if (entry.spec.code && step.codeLine !== undefined) {
          // 1-based: CodePane compares against index + 1.
          expect(
            step.codeLine,
            `${entry.id}: step ${index} highlights line ${step.codeLine}, but the declared code has ${entry.spec.code.length} lines`,
          ).toBeGreaterThanOrEqual(1);
          expect(
            step.codeLine,
            `${entry.id}: step ${index} highlights line ${step.codeLine}, but the declared code has ${entry.spec.code.length} lines`,
          ).toBeLessThanOrEqual(entry.spec.code.length);
        }
      }

      expect(
        steps[steps.length - 1].done,
        `${entry.id}: the last step is not marked done — the player will never show completion`,
      ).toBe(true);
    },
  );
});
