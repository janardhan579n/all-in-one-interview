import { cap, num, numbers, states, text } from '../types';
/**
 * Fixed-size sliding window.
 *
 * The whole point of the animation is the pair of operations at the window edges: one value
 * enters on the right and one leaves on the left, so the aggregate is *updated* rather than
 * recomputed. Watch the "adds this pass" variable stay at 1 no matter how large k is.
 */
export const slidingWindowFixed = (input) => {
    const values = numbers(input, 'array', [2, 1, 5, 1, 3, 2]);
    const k = Math.max(1, Math.min(num(input, 'k', 3), values.length));
    const steps = [];
    let windowSum = 0;
    let best = Number.NEGATIVE_INFINITY;
    let bestRange = [0, k - 1];
    steps.push({
        scene: { array: { values, states: states(values.length), caption: 'nums' } },
        codeLine: 1,
        explain: `Start with an empty window and no best yet. k = ${k}.`,
        vars: { windowSum: 0, k },
    });
    for (let right = 0; right < values.length; right++) {
        windowSum += values[right];
        steps.push({
            scene: windowScene(values, Math.max(0, right - k + 1), right, right, bestRange, right >= k - 1),
            codeLine: 3,
            explain: `${values[right]} enters the window on the right. windowSum = ${windowSum}.`,
            vars: { right, entering: values[right], windowSum },
        });
        if (right >= k - 1) {
            const left = right - k + 1;
            if (windowSum > best) {
                best = windowSum;
                bestRange = [left, right];
                steps.push({
                    scene: windowScene(values, left, right, right, bestRange, true),
                    codeLine: 5,
                    explain: `The window [${left}..${right}] sums to ${windowSum} — a new best.`,
                    vars: { left, right, windowSum, best },
                });
            }
            else {
                steps.push({
                    scene: windowScene(values, left, right, right, bestRange, true),
                    codeLine: 5,
                    explain: `The window sums to ${windowSum}, which does not beat ${best}.`,
                    vars: { left, right, windowSum, best },
                });
            }
            if (right < values.length - 1) {
                windowSum -= values[left];
                steps.push({
                    scene: windowScene(values, left, right, left, bestRange, true),
                    codeLine: 6,
                    explain: `${values[left]} leaves on the left. One subtraction — not a rescan of ${k} elements.`,
                    vars: { leaving: values[left], windowSum },
                });
            }
        }
    }
    steps.push({
        scene: windowScene(values, bestRange[0], bestRange[1], -1, bestRange, true),
        codeLine: 9,
        explain: `Best window: [${bestRange[0]}..${bestRange[1]}] summing to ${best}. Total work: ${values.length} additions and ${Math.max(0, values.length - k)} subtractions — O(n), independent of k.`,
        vars: { best },
        done: true,
    });
    return cap(steps);
};
function windowScene(values, left, right, touched, bestRange, windowReal) {
    const cellStates = states(values.length);
    if (windowReal) {
        for (let i = Math.max(0, left); i <= right && i < values.length; i++)
            cellStates[i] = 'inWindow';
    }
    if (touched >= 0)
        cellStates[touched] = 'active';
    for (let i = bestRange[0]; i <= bestRange[1]; i++) {
        if (cellStates[i] === 'idle')
            cellStates[i] = 'visited';
    }
    return {
        array: { values, states: cellStates, caption: 'nums' },
        pointers: [
            { name: 'left', index: Math.max(0, left), tone: 'warn' },
            { name: 'right', index: Math.max(0, right), tone: 'brand' },
        ],
        ranges: windowReal
            ? [{ name: 'window', from: Math.max(0, left), to: Math.max(0, right), tone: 'brand' }]
            : [],
    };
}
/**
 * Variable-size window: longest substring without repeating characters.
 *
 * The instructive moment is the JUMP — when a duplicate is found, `left` moves straight past
 * the previous occurrence rather than stepping one at a time. And the guard `previous >= left`
 * is what stops it moving backwards, which is the bug this animation is designed to expose.
 */
export const slidingWindowVariable = (input) => {
    const source = text(input, 'text', 'abcabcbb');
    const characters = source.split('');
    const steps = [];
    const lastSeen = new Map();
    let left = 0;
    let best = 0;
    let bestRange = [0, -1];
    steps.push({
        scene: scene(characters, 0, -1, -1, bestRange, lastSeen),
        codeLine: 2,
        explain: 'The window starts empty. Invariant: everything inside [left..right] is distinct.',
        vars: { left: 0, best: 0 },
    });
    for (let right = 0; right < characters.length; right++) {
        const c = characters[right];
        const previous = lastSeen.get(c);
        steps.push({
            scene: scene(characters, left, right, right, bestRange, lastSeen),
            codeLine: 4,
            explain: `'${c}' arrives on the right.`,
            vars: { left, right, char: c, best },
        });
        if (previous !== undefined && previous >= left) {
            steps.push({
                scene: scene(characters, left, right, previous, bestRange, lastSeen),
                codeLine: 5,
                explain: `'${c}' is already inside the window at index ${previous}.`,
                vars: { left, right, duplicateAt: previous },
            });
            left = previous + 1;
            steps.push({
                scene: scene(characters, left, right, right, bestRange, lastSeen),
                codeLine: 6,
                explain: `Jump left straight to ${left} — past the earlier '${c}'. One move, not a loop.`,
                vars: { left, right },
            });
        }
        else if (previous !== undefined) {
            steps.push({
                scene: scene(characters, left, right, right, bestRange, lastSeen),
                codeLine: 5,
                explain: `'${c}' was seen at index ${previous}, but that is BEFORE left (${left}) — outside the window, so it is not a duplicate. Moving left backwards here is the classic bug.`,
                vars: { left, right, lastSeen: previous },
            });
        }
        lastSeen.set(c, right);
        const length = right - left + 1;
        if (length > best) {
            best = length;
            bestRange = [left, right];
        }
        steps.push({
            scene: scene(characters, left, right, right, bestRange, lastSeen),
            codeLine: 9,
            explain: `Window [${left}..${right}] has length ${length}. Best so far: ${best}.`,
            vars: { left, right, length, best },
        });
    }
    steps.push({
        scene: scene(characters, bestRange[0], bestRange[1], -1, bestRange, lastSeen),
        codeLine: 11,
        explain: `Longest run of distinct characters: "${source.slice(bestRange[0], bestRange[1] + 1)}" (length ${best}). Each index entered and left the window at most once, so this is O(n).`,
        vars: { best },
        done: true,
    });
    return cap(steps);
    function scene(chars, windowLeft, windowRight, touched, bestSoFar, seen) {
        const cellStates = states(chars.length);
        for (let i = windowLeft; i <= windowRight && i < chars.length; i++)
            cellStates[i] = 'inWindow';
        if (touched >= 0 && touched < chars.length)
            cellStates[touched] = 'active';
        for (let i = bestSoFar[0]; i <= bestSoFar[1]; i++) {
            if (cellStates[i] === 'idle')
                cellStates[i] = 'visited';
        }
        return {
            array: { values: chars, states: cellStates, caption: 's', asText: true },
            pointers: [
                { name: 'left', index: Math.max(0, windowLeft), tone: 'warn' },
                { name: 'right', index: Math.max(0, windowRight), tone: 'brand' },
            ],
            buckets: {
                caption: 'lastSeen',
                buckets: [
                    {
                        index: 0,
                        entries: [...seen.entries()].map(([key, value]) => ({
                            key,
                            value,
                            state: (value >= windowLeft ? 'inWindow' : 'idle'),
                        })),
                    },
                ],
            },
        };
    }
};
/**
 * Shrink-while-valid window: the shortest subarray with sum ≥ target.
 *
 * Note where the answer is recorded — INSIDE the shrink loop, while the window is still valid.
 * For a "longest" problem it would be recorded after the loop instead. That one difference is
 * the most common source of wrong answers with this pattern.
 */
export const slidingWindowShrink = (input) => {
    const values = numbers(input, 'array', [2, 3, 1, 2, 4, 3]);
    const target = num(input, 'target', 7);
    const steps = [];
    let left = 0;
    let sum = 0;
    let best = Number.POSITIVE_INFINITY;
    let bestRange = [0, -1];
    steps.push({
        scene: build(values, 0, -1, -1, bestRange),
        codeLine: 1,
        explain: `Looking for the shortest run summing to at least ${target}.`,
        vars: { target, sum: 0 },
    });
    for (let right = 0; right < values.length; right++) {
        sum += values[right];
        steps.push({
            scene: build(values, left, right, right, bestRange),
            codeLine: 3,
            explain: `${values[right]} enters. sum = ${sum}.`,
            vars: { left, right, sum },
        });
        while (sum >= target) {
            const length = right - left + 1;
            if (length < best) {
                best = length;
                bestRange = [left, right];
            }
            steps.push({
                scene: build(values, left, right, -1, bestRange),
                codeLine: 5,
                explain: `Window [${left}..${right}] is valid (sum ${sum} ≥ ${target}) and has length ${length}. Record it NOW, while it is still valid.`,
                vars: { left, right, sum, best },
            });
            sum -= values[left];
            steps.push({
                scene: build(values, left + 1, right, left, bestRange),
                codeLine: 6,
                explain: `Shrink from the left: drop ${values[left]}, sum = ${sum}. Try to find something even shorter.`,
                vars: { left: left + 1, sum },
            });
            left++;
        }
    }
    steps.push({
        scene: build(values, bestRange[0], bestRange[1], -1, bestRange),
        codeLine: 9,
        explain: best === Number.POSITIVE_INFINITY
            ? 'No window reaches the target.'
            : `Shortest valid window: [${bestRange[0]}..${bestRange[1]}], length ${best}.`,
        vars: { best: best === Number.POSITIVE_INFINITY ? 0 : best },
        done: true,
    });
    return cap(steps);
    function build(nums, windowLeft, windowRight, touched, bestSoFar) {
        const cellStates = states(nums.length);
        for (let i = windowLeft; i <= windowRight && i < nums.length; i++)
            cellStates[i] = 'inWindow';
        if (touched >= 0 && touched < nums.length)
            cellStates[touched] = 'reject';
        for (let i = bestSoFar[0]; i <= bestSoFar[1]; i++) {
            if (cellStates[i] === 'idle')
                cellStates[i] = 'visited';
        }
        return {
            array: { values: nums, states: cellStates, caption: 'nums' },
            pointers: [
                { name: 'left', index: Math.max(0, windowLeft), tone: 'warn' },
                { name: 'right', index: Math.max(0, windowRight), tone: 'brand' },
            ],
            ranges: windowRight >= windowLeft
                ? [{ name: 'window', from: windowLeft, to: windowRight, tone: 'brand' }]
                : [],
        };
    }
};
