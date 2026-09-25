/**
 * The visualisation contract.
 *
 * Every animation on the platform — arrays, linked lists, trees, graphs, DP tables,
 * recursion, even request flow through an architecture — is produced by a pure function
 * that turns an input into an array of Steps. See docs/DECISIONS.md ADR-004.
 *
 * Consequences that matter:
 *   • engines are pure, so they are unit-testable ("step 3 must highlight code line 5")
 *   • one generic Player drives every visualisation, so play/pause/speed/reduced-motion
 *     are implemented exactly once
 *   • code, state and picture cannot drift apart, because one Step carries all three
 */
/** Hard cap so a pathological input can never freeze the tab (ADR-004). */
export const MAX_STEPS = 4000;
/** Small helpers shared by every engine. */
export function cap(steps) {
    if (steps.length <= MAX_STEPS)
        return steps;
    const trimmed = steps.slice(0, MAX_STEPS);
    trimmed[trimmed.length - 1] = {
        ...trimmed[trimmed.length - 1],
        explain: `Stopped after ${MAX_STEPS} steps — try a smaller input.`,
        done: true,
    };
    return trimmed;
}
export function states(length, fill = 'idle') {
    return Array.from({ length }, () => fill);
}
export function num(input, key, fallback) {
    const value = input[key];
    return typeof value === 'number' ? value : fallback;
}
export function numbers(input, key, fallback) {
    const value = input[key];
    return Array.isArray(value) && value.every((v) => typeof v === 'number') ? value : fallback;
}
export function text(input, key, fallback) {
    const value = input[key];
    return typeof value === 'string' ? value : fallback;
}
