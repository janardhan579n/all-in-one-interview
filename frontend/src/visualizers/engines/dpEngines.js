import { cap, num, text } from '../types';
/**
 * 1-D bottom-up DP.
 *
 * Each cell reads only the two before it, which is exactly the observation that lets the whole
 * table collapse into two variables — the space optimisation is visible in the picture rather
 * than asserted in prose.
 */
export const dp1d = (input) => {
    const kind = text(input, 'kind', 'climbStairs');
    const n = Math.min(num(input, 'n', 8), 20);
    const steps = [];
    const dp = Array.from({ length: n + 1 }, () => '?');
    const cellStates = Array.from({ length: n + 1 }, () => 'idle');
    const snapshot = (explain, codeLine, vars) => {
        steps.push({
            scene: {
                array: {
                    values: [...dp],
                    states: [...cellStates],
                    labels: Array.from({ length: n + 1 }, (_, i) => `dp[${i}]`),
                    caption: `dp[i] = the number of ways to reach step i`,
                },
            },
            codeLine,
            explain,
            vars,
        });
    };
    snapshot(`State definition first, in words: dp[i] = the number of distinct ways to reach step i. If you cannot write that sentence, no amount of index fiddling will save the solution. (${kind})`, 1);
    dp[0] = 1;
    cellStates[0] = 'match';
    snapshot('Base case: dp[0] = 1. There is exactly one way to stand at the bottom having climbed nothing — setting this to 0 is the most common bug here.', 2, { 'dp[0]': 1 });
    if (n >= 1) {
        dp[1] = 1;
        cellStates[1] = 'match';
        snapshot('Base case: dp[1] = 1. One step, one way.', 3, { 'dp[1]': 1 });
    }
    for (let i = 2; i <= n; i++) {
        cellStates.fill('idle');
        cellStates[i - 1] = 'active';
        cellStates[i - 2] = 'active';
        cellStates[i] = 'target';
        snapshot(`To reach step ${i}, the final move was either a 1-step (from ${i - 1}) or a 2-step (from ${i - 2}). No other way exists, so those two cells are all we need.`, 5, {
            [`dp[${i - 1}]`]: dp[i - 1],
            [`dp[${i - 2}]`]: dp[i - 2],
        });
        dp[i] = dp[i - 1] + dp[i - 2];
        cellStates.fill('visited', 0, i);
        cellStates[i] = 'match';
        snapshot(`dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i]}.`, 5, { [`dp[${i}]`]: dp[i] });
    }
    cellStates.fill('visited');
    cellStates[n] = 'match';
    snapshot(`Answer: ${dp[n]}. The naive recursion would have made about 2^${n} calls to compute this; the table computes each of the ${n + 1} states exactly once. And since every cell reads only the previous two, the whole array can be replaced by two variables — O(1) space.`, 7, { answer: dp[n] });
    steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
    return cap(steps);
};
/**
 * 2-D grid DP: unique paths.
 *
 * Every path into a cell arrives from above or from the left, so the answer for a cell depends
 * only on the cell — not on the route taken to reach it. That is the definition of an
 * overlapping subproblem, and it is why a table works at all.
 */
export const dpGrid = (input) => {
    const rows = Math.min(num(input, 'rows', 4), 8);
    const cols = Math.min(num(input, 'cols', 5), 8);
    const steps = [];
    const dp = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
    const cellStates = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 'idle'));
    const snapshot = (explain, codeLine, vars) => {
        steps.push({
            scene: {
                grid: {
                    cells: dp.map((row) => [...row]),
                    states: cellStates.map((row) => [...row]),
                    caption: 'dp[r][c] = the number of distinct paths from the top-left to (r, c)',
                },
            },
            codeLine,
            explain,
            vars,
        });
    };
    snapshot(`The robot moves only right or down. State: dp[r][c] = how many distinct paths reach cell (r, c). Naive recursion is O(2^(rows+cols)); this table is O(rows × cols).`, 1);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cellStates.forEach((row) => row.fill('idle'));
            for (let rr = 0; rr < rows; rr++) {
                for (let cc = 0; cc < cols; cc++) {
                    if (dp[rr][cc] !== '')
                        cellStates[rr][cc] = 'visited';
                }
            }
            if (r === 0 || c === 0) {
                dp[r][c] = 1;
                cellStates[r][c] = 'match';
                snapshot(r === 0 && c === 0
                    ? 'The start cell: exactly one way to be where you already are.'
                    : `Edge cell (${r}, ${c}): only one route reaches it — straight along the ${r === 0 ? 'top row' : 'left column'}.`, 4, { [`dp[${r}][${c}]`]: 1 });
            }
            else {
                cellStates[r - 1][c] = 'active';
                cellStates[r][c - 1] = 'active';
                cellStates[r][c] = 'target';
                snapshot(`Cell (${r}, ${c}) can only be entered from above (${dp[r - 1][c]} paths) or from the left (${dp[r][c - 1]} paths).`, 5, {
                    above: dp[r - 1][c],
                    left: dp[r][c - 1],
                });
                dp[r][c] = dp[r - 1][c] + dp[r][c - 1];
                cellStates[r - 1][c] = 'visited';
                cellStates[r][c - 1] = 'visited';
                cellStates[r][c] = 'match';
                snapshot(`dp[${r}][${c}] = ${dp[r - 1][c]} + ${dp[r][c - 1]} = ${dp[r][c]}.`, 5, { [`dp[${r}][${c}]`]: dp[r][c] });
            }
        }
    }
    cellStates.forEach((row) => row.fill('visited'));
    cellStates[rows - 1][cols - 1] = 'match';
    snapshot(`${dp[rows - 1][cols - 1]} distinct paths across a ${rows}×${cols} grid. Each row depends only on the row above, so a single rolling array of ${cols} values is enough — O(n) space instead of O(m·n).`, 8, { answer: dp[rows - 1][cols - 1] });
    steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
    return cap(steps);
};
