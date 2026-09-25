import { describe, expect, it } from 'vitest';
import { ENGINES } from './registry';
const modules = import.meta.glob('../content-bundle/**/*.json', { eager: true, import: 'default' });
/** Translation overlays mirror the tree and share ids with the English documents. */
const specs = Object.entries(modules)
    .filter(([path]) => !path.includes('/i18n/'))
    .filter(([, doc]) => doc?.visualization?.engine)
    .map(([path, doc]) => ({ id: doc.id, path, spec: doc.visualization }));
describe('declared visualisations', () => {
    it('finds a substantial number of specs to check (guards against the glob silently breaking)', () => {
        expect(specs.length).toBeGreaterThan(80);
    });
    it.each(specs.map((entry) => [`${entry.id} → ${entry.spec.engine}`, entry]))('%s runs and stays inside its own code listing', (_label, entry) => {
        const engine = ENGINES[entry.spec.engine];
        expect(engine, `${entry.id}: engine "${entry.spec.engine}" is not registered`).toBeTypeOf('function');
        let steps;
        try {
            steps = engine(entry.spec.input ?? {});
        }
        catch (error) {
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
                expect(step.codeLine, `${entry.id}: step ${index} highlights line ${step.codeLine}, but the declared code has ${entry.spec.code.length} lines`).toBeGreaterThanOrEqual(1);
                expect(step.codeLine, `${entry.id}: step ${index} highlights line ${step.codeLine}, but the declared code has ${entry.spec.code.length} lines`).toBeLessThanOrEqual(entry.spec.code.length);
            }
        }
        expect(steps[steps.length - 1].done, `${entry.id}: the last step is not marked done — the player will never show completion`).toBe(true);
    });
});
