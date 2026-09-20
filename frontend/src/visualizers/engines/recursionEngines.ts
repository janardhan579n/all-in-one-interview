import { cap, num, numbers, text, type CellState, type Engine, type Step } from '../types';

/**
 * The call stack growing and unwinding.
 *
 * For `fib` the same subproblem appears in several places — that visible repetition is the
 * entire motivation for memoisation, so the animation counts how many times each value is
 * recomputed.
 */
export const recursionTrace: Engine = (input) => {
  const kind = text(input, 'kind', 'factorial') as 'factorial' | 'fib';
  const n = Math.min(num(input, 'n', 5), kind === 'fib' ? 6 : 8);
  const steps: Step[] = [];

  const frames: { label: string; detail?: string; state?: CellState }[] = [];
  const computed = new Map<number, number>();
  const callCount = new Map<number, number>();
  let calls = 0;

  const snapshot = (explain: string, codeLine: number, vars?: Record<string, string | number>) => {
    steps.push({
      scene: {
        frames: { frames: frames.map((f) => ({ ...f })), caption: 'call stack (top = most recent)' },
        table: {
          columns: ['input', 'times computed', 'result'],
          rows: [...callCount.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([key, count]) => [key, count, computed.has(key) ? (computed.get(key) as number) : '…']),
          cursor: null,
          caption: kind === 'fib' ? 'subproblems — note the repeats' : 'subproblems',
        },
      },
      codeLine,
      explain,
      vars,
    });
  };

  const factorial = (value: number): number => {
    calls++;
    callCount.set(value, (callCount.get(value) ?? 0) + 1);
    frames.push({ label: `factorial(${value})`, state: 'active' });
    snapshot(`Call factorial(${value}). A new frame is pushed — this is the O(n) space the iterative version avoids.`, 1, { depth: frames.length, calls });

    if (value <= 1) {
      computed.set(value, 1);
      frames[frames.length - 1] = { label: `factorial(${value}) = 1`, state: 'match' };
      snapshot(`Base case reached: factorial(${value}) = 1. Without this the recursion would never stop.`, 3, { depth: frames.length, calls });
      frames.pop();
      return 1;
    }

    const sub = factorial(value - 1);
    const result = value * sub;
    computed.set(value, result);
    frames[frames.length - 1] = { label: `factorial(${value}) = ${result}`, state: 'match' };
    snapshot(`Now that factorial(${value - 1}) = ${sub} is known, factorial(${value}) = ${value} × ${sub} = ${result}. The answers come back up the stack in reverse order.`, 5, { depth: frames.length, result });
    frames.pop();
    return result;
  };

  const fib = (value: number): number => {
    calls++;
    callCount.set(value, (callCount.get(value) ?? 0) + 1);
    frames.push({ label: `fib(${value})`, state: 'active' });
    snapshot(
      (callCount.get(value) as number) > 1
        ? `Call fib(${value}) — for the ${callCount.get(value)}${ordinal(callCount.get(value) as number)} time. The work is being repeated.`
        : `Call fib(${value}).`,
      1,
      { depth: frames.length, calls },
    );

    if (value <= 1) {
      computed.set(value, value);
      frames[frames.length - 1] = { label: `fib(${value}) = ${value}`, state: 'match' };
      snapshot(`Base case: fib(${value}) = ${value}.`, 3, { depth: frames.length, calls });
      frames.pop();
      return value;
    }

    const left = fib(value - 1);
    const right = fib(value - 2);
    const result = left + right;
    computed.set(value, result);
    frames[frames.length - 1] = { label: `fib(${value}) = ${result}`, state: 'match' };
    snapshot(`fib(${value}) = ${left} + ${right} = ${result}.`, 5, { depth: frames.length, result });
    frames.pop();
    return result;
  };

  const answer = kind === 'fib' ? fib(n) : factorial(n);
  const repeats = [...callCount.entries()].filter(([, count]) => count > 1);

  steps.push({
    scene: {
      frames: { frames: [], caption: 'call stack (empty — everything returned)' },
      table: {
        columns: ['input', 'times computed', 'result'],
        rows: [...callCount.entries()].sort((a, b) => a[0] - b[0]).map(([key, count]) => [key, count, computed.get(key) ?? '…']),
        cursor: null,
        caption: 'subproblems',
      },
    },
    explain:
      kind === 'fib'
        ? `fib(${n}) = ${answer} took ${calls} calls for only ${callCount.size} distinct values — ${repeats.length} of them were computed more than once. Cache those results and ${calls} calls become ${callCount.size}. That single change is dynamic programming.`
        : `factorial(${n}) = ${answer} in ${calls} calls, each doing O(1) work — O(n) time, O(n) stack. No subproblem repeated, so there is nothing for a cache to do here.`,
    vars: { calls, distinct: callCount.size },
    done: true,
  });

  return cap(steps);
};

function ordinal(value: number): string {
  if (value === 2) return 'nd';
  if (value === 3) return 'rd';
  return 'th';
}

/** Subsets: the include/exclude decision tree, with the unchoose step made visible. */
export const backtrackingSubsets: Engine = (input) => {
  const values = numbers(input, 'array', [1, 2, 3]).slice(0, 6);
  const steps: Step[] = [];
  const current: number[] = [];
  const results: string[] = [];
  const frames: { label: string; state?: CellState }[] = [];

  const snapshot = (explain: string, codeLine: number, marked: CellState[] | null = null) => {
    steps.push({
      scene: {
        array: {
          values,
          states: marked ?? values.map((value) => (current.includes(value) ? 'match' : 'idle')),
          caption: 'nums (highlighted = in the current partial subset)',
        },
        frames: { frames: frames.map((f) => ({ ...f })), caption: 'call stack' },
        output: [...results],
      },
      codeLine,
      explain,
      vars: { current: `[${current.join(', ')}]`, found: results.length },
    });
  };

  const backtrack = (start: number) => {
    results.push(`[${current.join(', ')}]`);
    frames.push({ label: `backtrack(start=${start})`, state: 'active' });
    snapshot(`Record a COPY of the current subset: [${current.join(', ')}]. Every node of this tree is itself a valid subset, which is why the record happens on entry.`, 2);

    for (let i = start; i < values.length; i++) {
      current.push(values[i]);
      snapshot(`CHOOSE ${values[i]}.`, 4);

      backtrack(i + 1);

      current.pop();
      snapshot(`UNCHOOSE ${values[i]} — restore the state exactly as it was before this branch. Skip this line and every later result is corrupted.`, 6);
    }

    frames.pop();
  };

  backtrack(0);

  steps.push({
    scene: {
      array: { values, states: values.map(() => 'visited' as CellState), caption: 'nums' },
      frames: { frames: [], caption: 'call stack' },
      output: [...results],
    },
    explain: `${results.length} subsets = 2^${values.length}. The output itself is exponential, so no algorithm can do better — this is O(n · 2ⁿ) and that is optimal.`,
    vars: { subsets: results.length },
    done: true,
  });

  return cap(steps);
};

/** Permutations: `used[]` instead of a start index, because order matters. */
export const backtrackingPermutations: Engine = (input) => {
  const values = numbers(input, 'array', [1, 2, 3]).slice(0, 4);
  const steps: Step[] = [];
  const current: number[] = [];
  const used = values.map(() => false);
  const results: string[] = [];
  const frames: { label: string; state?: CellState }[] = [];

  const snapshot = (explain: string, codeLine: number) => {
    steps.push({
      scene: {
        array: {
          values,
          states: used.map((isUsed) => (isUsed ? 'match' : 'idle')) as CellState[],
          caption: 'nums (highlighted = already placed)',
        },
        frames: { frames: frames.map((f) => ({ ...f })), caption: 'call stack' },
        output: [...results],
      },
      codeLine,
      explain,
      vars: { current: `[${current.join(', ')}]`, found: results.length },
    });
  };

  const backtrack = () => {
    if (current.length === values.length) {
      results.push(`[${current.join(', ')}]`);
      snapshot(`All ${values.length} positions filled — record [${current.join(', ')}].`, 3);
      return;
    }

    frames.push({ label: `position ${current.length}`, state: 'active' });
    for (let i = 0; i < values.length; i++) {
      if (used[i]) {
        snapshot(`${values[i]} is already placed, so it cannot be used again at this position.`, 7);
        continue;
      }
      used[i] = true;
      current.push(values[i]);
      snapshot(`Place ${values[i]} at position ${current.length - 1}. Unlike subsets, we scan from index 0 every time — order matters, so any unused value is a candidate.`, 8);

      backtrack();

      used[i] = false;
      current.pop();
      snapshot(`Undo BOTH: remove ${values[i]} from the permutation and clear its used flag. Undoing only one is a classic half-fix.`, 10);
    }
    frames.pop();
  };

  backtrack();

  steps.push({
    scene: {
      array: { values, states: values.map(() => 'visited' as CellState), caption: 'nums' },
      frames: { frames: [], caption: 'call stack' },
      output: [...results],
    },
    explain: `${results.length} permutations = ${values.length}!. Compare with subsets: a start index gives combinations, a used[] array gives permutations.`,
    vars: { permutations: results.length },
    done: true,
  });

  return cap(steps);
};

/**
 * N-Queens: pruning is where all the speed lives.
 *
 * Conflicts are detected the moment a queen is placed rather than at the end, so an entire
 * subtree disappears with one check. The animation stops after the first two solutions —
 * enough to see the mechanism without thousands of steps.
 */
export const backtrackingNQueens: Engine = (input) => {
  const n = Math.max(4, Math.min(num(input, 'n', 5), 6));
  const steps: Step[] = [];

  const queens = Array.from({ length: n }, () => -1);
  const cols = Array.from({ length: n }, () => false);
  const diag = Array.from({ length: 2 * n - 1 }, () => false);
  const anti = Array.from({ length: 2 * n - 1 }, () => false);

  let solutions = 0;
  let placements = 0;
  let prunes = 0;
  const found: string[] = [];
  const MAX_SOLUTIONS = 2;

  const snapshot = (explain: string, codeLine: number, conflicts: [number, number][] = []) => {
    steps.push({
      scene: {
        board: { size: n, queens: [...queens], conflicts, caption: `${n}×${n} board` },
        output: [...found],
      },
      codeLine,
      explain,
      vars: { placements, prunes, solutions },
    });
  };

  snapshot(`Exactly one queen per row, so the search is a decision per row. Naive enumeration would try ${n}^${n} = ${Math.pow(n, n).toLocaleString('en-US')} placements.`, 1);

  const place = (row: number): boolean => {
    if (row === n) {
      solutions++;
      found.push(queens.map((col) => `r${queens.indexOf(col)}c${col}`).join(' '));
      found[found.length - 1] = `solution ${solutions}: columns [${queens.join(', ')}]`;
      snapshot(`All ${n} rows filled with no conflicts — solution ${solutions}.`, 2);
      return solutions >= MAX_SOLUTIONS;
    }

    for (let col = 0; col < n; col++) {
      const d = row - col + (n - 1);
      const a = row + col;

      if (cols[col] || diag[d] || anti[a]) {
        prunes++;
        snapshot(`Row ${row}, column ${col} is attacked — skip it WITHOUT recursing. That one O(1) check eliminates every arrangement that would have started this way.`, 4, [[row, col]]);
        continue;
      }

      cols[col] = diag[d] = anti[a] = true;
      queens[row] = col;
      placements++;
      snapshot(`Place a queen at row ${row}, column ${col}. Three boolean arrays track the column and both diagonals, so safety is O(1) rather than a board scan.`, 5);

      if (place(row + 1)) return true;

      cols[col] = diag[d] = anti[a] = false;
      queens[row] = -1;
      snapshot(`Backtrack: remove the queen from row ${row} and clear all three marks. An incomplete undo here corrupts every later branch.`, 7);
    }
    return false;
  };

  place(0);

  steps.push({
    scene: { board: { size: n, queens: [...queens], caption: 'search complete' }, output: [...found] },
    explain: `${placements} placements and ${prunes} pruned branches to reach ${solutions} solution${solutions === 1 ? '' : 's'} — against ${Math.pow(n, n).toLocaleString('en-US')} for blind enumeration. Backtracking does not make the problem polynomial; it makes the constant survivable.`,
    vars: { placements, prunes, solutions },
    done: true,
  });

  return cap(steps);
};
