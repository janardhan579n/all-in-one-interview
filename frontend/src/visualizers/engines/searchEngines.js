import { cap, num, numbers, states } from '../types';
function searchScene(values, low, high, mid, target, found) {
    const cellStates = states(values.length);
    for (let i = 0; i < values.length; i++) {
        if (i < low || i > high)
            cellStates[i] = 'reject';
        else
            cellStates[i] = 'inWindow';
    }
    if (mid >= 0 && mid < values.length)
        cellStates[mid] = found ? 'match' : 'active';
    return {
        array: { values, states: cellStates, caption: `sorted nums (target ${target})` },
        pointers: [
            { name: 'low', index: Math.max(0, Math.min(low, values.length - 1)), tone: 'good' },
            { name: 'mid', index: Math.max(0, Math.min(mid, values.length - 1)), tone: 'brand' },
            { name: 'high', index: Math.max(0, Math.min(high, values.length - 1)), tone: 'warn' },
        ],
        ranges: low <= high ? [{ name: 'candidates', from: low, to: high, tone: 'info' }] : [],
    };
}
/** Classic exact-match binary search. Watch the candidate range halve every probe. */
export const binarySearch = (input) => {
    const values = numbers(input, 'array', [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]);
    const target = num(input, 'target', 23);
    const steps = [];
    let low = 0;
    let high = values.length - 1;
    let probes = 0;
    steps.push({
        scene: searchScene(values, low, high, -1, target, false),
        codeLine: 1,
        explain: `${values.length} candidates. A linear scan would need up to ${values.length} comparisons.`,
        vars: { low, high, candidates: values.length },
    });
    while (low <= high) {
        const mid = low + Math.floor((high - low) / 2);
        probes++;
        steps.push({
            scene: searchScene(values, low, high, mid, target, false),
            codeLine: 3,
            explain: `Probe ${probes}: mid = ${mid}, value ${values[mid]}. (Computed as low + (high - low) / 2 to avoid overflow.)`,
            vars: { low, high, mid, 'nums[mid]': values[mid], probes },
        });
        if (values[mid] === target) {
            steps.push({
                scene: searchScene(values, low, high, mid, target, true),
                codeLine: 4,
                explain: `Found ${target} at index ${mid} after ${probes} probes. log₂(${values.length}) ≈ ${Math.ceil(Math.log2(values.length))}.`,
                vars: { index: mid, probes },
                done: true,
            });
            return cap(steps);
        }
        if (values[mid] < target) {
            const discarded = mid - low + 1;
            low = mid + 1;
            steps.push({
                scene: searchScene(values, low, high, mid, target, false),
                codeLine: 5,
                explain: `${values[mid]} < ${target}, so the target must be to the right. ${discarded} candidates eliminated in one comparison.`,
                vars: { low, high, remaining: Math.max(0, high - low + 1) },
            });
        }
        else {
            const discarded = high - mid + 1;
            high = mid - 1;
            steps.push({
                scene: searchScene(values, low, high, mid, target, false),
                codeLine: 6,
                explain: `${values[mid]} > ${target}, so the target must be to the left. ${discarded} candidates eliminated.`,
                vars: { low, high, remaining: Math.max(0, high - low + 1) },
            });
        }
    }
    steps.push({
        scene: searchScene(values, low, high, -1, target, false),
        codeLine: 8,
        explain: `low passed high — the range is empty, so ${target} is not present. ${probes} probes total.`,
        vars: { probes },
        done: true,
    });
    return cap(steps);
};
/**
 * Lower bound: the first index whose value is ≥ target.
 *
 * Note the differences from the exact-match template: a half-open range, `while (low < high)`,
 * and `high = mid` rather than `mid - 1` — because mid itself might be the boundary. Mixing
 * the two templates is the most common source of binary-search bugs.
 */
export const binarySearchBoundary = (input) => {
    const values = numbers(input, 'array', [1, 3, 3, 3, 5, 8, 8, 10]);
    const target = num(input, 'target', 3);
    const steps = [];
    let low = 0;
    let high = values.length;
    steps.push({
        scene: searchScene(values, low, Math.min(high - 1, values.length - 1), -1, target, false),
        codeLine: 1,
        explain: `Finding the FIRST index with value ≥ ${target}. Note high starts at length, not length - 1 — the range is half-open.`,
        vars: { low, high },
    });
    while (low < high) {
        const mid = low + Math.floor((high - low) / 2);
        steps.push({
            scene: searchScene(values, low, Math.min(high - 1, values.length - 1), mid, target, false),
            codeLine: 3,
            explain: `mid = ${mid}, value ${values[mid]}.`,
            vars: { low, high, mid, 'nums[mid]': values[mid] },
        });
        if (values[mid] < target) {
            low = mid + 1;
            steps.push({
                scene: searchScene(values, low, Math.min(high - 1, values.length - 1), mid, target, false),
                codeLine: 4,
                explain: `${values[mid]} < ${target}, so mid cannot be the answer. Move low past it.`,
                vars: { low, high },
            });
        }
        else {
            high = mid;
            steps.push({
                scene: searchScene(values, low, Math.min(high - 1, values.length - 1), mid, target, false),
                codeLine: 5,
                explain: `${values[mid]} ≥ ${target}, so mid MIGHT be the answer — keep it by setting high = mid, not mid - 1.`,
                vars: { low, high },
            });
        }
    }
    const found = low < values.length && values[low] === target;
    steps.push({
        scene: searchScene(values, low, low, low, target, found),
        codeLine: 7,
        explain: found
            ? `low = ${low}: the first occurrence of ${target}. Plain binary search would have returned any of the duplicates.`
            : `low = ${low}: the insertion point for ${target}.`,
        vars: { answer: low },
        done: true,
    });
    return cap(steps);
};
/**
 * Binary search on the ANSWER — no sorted array in sight.
 *
 * The candidate space is the range of possible eating speeds. Each probe runs an O(n)
 * feasibility simulation. The table shows the predicate flipping from false to true exactly
 * once, which is the property that makes this valid.
 */
export const binarySearchAnswer = (input) => {
    const piles = numbers(input, 'piles', [30, 11, 23, 4, 20]);
    const hours = num(input, 'hours', 6);
    const steps = [];
    const hoursNeeded = (speed) => piles.reduce((total, pile) => total + Math.ceil(pile / speed), 0);
    let low = 1;
    let high = Math.max(...piles);
    const probed = [];
    steps.push({
        scene: {
            array: { values: piles, states: states(piles.length), caption: 'piles' },
            table: { columns: ['speed', 'hours needed', 'feasible?'], rows: [], cursor: null, caption: 'probes' },
        },
        codeLine: 1,
        explain: `The search space is every speed from 1 to ${high}. Nothing here is a sorted array — but canFinish(speed) is false for slow speeds and true from the answer onwards, and never flips back.`,
        vars: { low, high, hoursAllowed: hours },
    });
    while (low < high) {
        const mid = low + Math.floor((high - low) / 2);
        const needed = hoursNeeded(mid);
        const feasible = needed <= hours;
        probed.push([mid, needed, feasible ? 'yes' : 'no']);
        steps.push({
            scene: {
                array: { values: piles, states: states(piles.length, 'active'), caption: 'piles' },
                table: { columns: ['speed', 'hours needed', 'feasible?'], rows: probed.map((r) => [...r]), cursor: [probed.length - 1, 2], caption: 'probes' },
            },
            codeLine: 3,
            explain: `Try speed ${mid}: it needs ${needed} hours, and ${hours} are allowed — ${feasible ? 'feasible' : 'too slow'}.`,
            vars: { low, high, mid, needed, allowed: hours },
        });
        if (feasible) {
            high = mid;
            steps.push({
                scene: {
                    array: { values: piles, states: states(piles.length), caption: 'piles' },
                    table: { columns: ['speed', 'hours needed', 'feasible?'], rows: probed.map((r) => [...r]), cursor: null, caption: 'probes' },
                },
                codeLine: 4,
                explain: `Feasible, so every faster speed is feasible too — discard the upper half, but keep ${mid} as a candidate.`,
                vars: { low, high },
            });
        }
        else {
            low = mid + 1;
            steps.push({
                scene: {
                    array: { values: piles, states: states(piles.length), caption: 'piles' },
                    table: { columns: ['speed', 'hours needed', 'feasible?'], rows: probed.map((r) => [...r]), cursor: null, caption: 'probes' },
                },
                codeLine: 5,
                explain: `Too slow, so every slower speed is too slow as well — discard the lower half.`,
                vars: { low, high },
            });
        }
    }
    steps.push({
        scene: {
            array: { values: piles, states: states(piles.length, 'match'), caption: 'piles' },
            table: { columns: ['speed', 'hours needed', 'feasible?'], rows: probed.map((r) => [...r]), cursor: null, caption: 'probes' },
        },
        codeLine: 7,
        explain: `Minimum feasible speed: ${low} (needs ${hoursNeeded(low)} hours). Only ${probed.length} simulations instead of ${Math.max(...piles)}.`,
        vars: { answer: low, probes: probed.length },
        done: true,
    });
    return cap(steps);
};
