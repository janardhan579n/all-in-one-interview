import {
  cap,
  num,
  numbers,
  states,
  type CellState,
  type CellValue,
  type Engine,
  type Step,
} from '../types';

/** Scanning for the maximum — the very first algorithm taught. */
export const arrayScanMax: Engine = (input) => {
  const values = numbers(input, 'array', [42, 17, 93, 8, 61, 93, 4]);
  const steps: Step[] = [];
  let best = values[0];
  let bestIndex = 0;

  const snapshot = (cellStates: CellState[]) => ({
    array: { values, states: cellStates, caption: 'scores' },
  });

  const initial = states(values.length);
  initial[0] = 'match';
  steps.push({
    scene: snapshot(initial),
    codeLine: 1,
    explain: `Assume the first paper is the winner: best = ${best}.`,
    vars: { best, i: 0 },
  });

  for (let i = 1; i < values.length; i++) {
    const comparing = states(values.length);
    for (let k = 0; k < i; k++) comparing[k] = 'visited';
    comparing[bestIndex] = 'match';
    comparing[i] = 'active';

    steps.push({
      scene: snapshot(comparing),
      codeLine: 3,
      explain: `Is ${values[i]} greater than the best so far (${best})?`,
      vars: { best, i, 'scores[i]': values[i] },
    });

    if (values[i] > best) {
      best = values[i];
      bestIndex = i;
      const updated = states(values.length);
      for (let k = 0; k <= i; k++) updated[k] = 'visited';
      updated[bestIndex] = 'match';
      steps.push({
        scene: snapshot(updated),
        codeLine: 4,
        explain: `Yes — ${values[i]} is the new best.`,
        vars: { best, i },
      });
    }
  }

  const final = states(values.length, 'visited');
  final[bestIndex] = 'match';
  steps.push({
    scene: snapshot(final),
    codeLine: 7,
    explain: `Every element has been examined exactly once. The maximum is ${best}.`,
    vars: { best },
    done: true,
  });

  return cap(steps);
};

interface ArrayOperation {
  op: 'access' | 'search' | 'insert' | 'delete' | 'traverse';
  index?: number;
  value?: number;
}

/** Access / search / insert / delete / traverse, so the cost of each is visible. */
export const arrayOps: Engine = (input) => {
  const values = [...numbers(input, 'array', [10, 20, 30, 40, 50])];
  const operations = (Array.isArray(input.operations) ? input.operations : []) as ArrayOperation[];
  const steps: Step[] = [];

  const scene = (cellStates: CellState[], caption: string) => ({
    array: { values: [...values], states: cellStates, caption },
  });

  steps.push({
    scene: scene(states(values.length), 'array'),
    explain: 'An array: a contiguous block where element i lives at base + i × elementSize.',
    vars: { length: values.length },
  });

  for (const operation of operations) {
    if (operation.op === 'access' && operation.index !== undefined) {
      const marked = states(values.length);
      marked[operation.index] = 'match';
      steps.push({
        scene: scene(marked, 'access'),
        codeLine: 1,
        explain: `a[${operation.index}] — one address calculation, no searching. O(1), regardless of array size.`,
        vars: { index: operation.index, value: values[operation.index] },
      });
    }

    if (operation.op === 'search' && operation.value !== undefined) {
      for (let i = 0; i < values.length; i++) {
        const marked = states(values.length);
        for (let k = 0; k < i; k++) marked[k] = 'reject';
        marked[i] = values[i] === operation.value ? 'match' : 'active';
        steps.push({
          scene: scene(marked, 'search'),
          codeLine: values[i] === operation.value ? 3 : 2,
          explain:
            values[i] === operation.value
              ? `Found ${operation.value} at index ${i}. Unsorted search is O(n) — position tells you nothing about value.`
              : `a[${i}] = ${values[i]} is not ${operation.value}. Keep looking.`,
          vars: { i, target: operation.value },
        });
        if (values[i] === operation.value) break;
      }
    }

    if (operation.op === 'insert' && operation.index !== undefined && operation.value !== undefined) {
      const from = operation.index;
      for (let i = values.length - 1; i >= from; i--) {
        const marked = states(values.length);
        marked[i] = 'active';
        steps.push({
          scene: scene(marked, 'insert — shifting the tail right'),
          codeLine: 4,
          explain: `Shift a[${i}] one slot right to make room. This is why inserting in the middle is O(n).`,
          vars: { shifting: values[i] },
        });
      }
      values.splice(from, 0, operation.value);
      const marked = states(values.length);
      marked[from] = 'match';
      steps.push({
        scene: scene(marked, 'insert'),
        codeLine: 4,
        explain: `Inserted ${operation.value} at index ${from}. Cost: ${values.length - from - 1} moves plus one write.`,
        vars: { inserted: operation.value, length: values.length },
      });
    }

    if (operation.op === 'delete' && operation.index !== undefined) {
      const removed = values[operation.index];
      for (let i = operation.index; i < values.length - 1; i++) {
        const marked = states(values.length);
        marked[i] = 'active';
        steps.push({
          scene: scene(marked, 'delete — shifting the tail left'),
          codeLine: 5,
          explain: `Move a[${i + 1}] into a[${i}] to close the gap.`,
          vars: { moving: values[i + 1] },
        });
      }
      values.splice(operation.index, 1);
      steps.push({
        scene: scene(states(values.length), 'delete'),
        codeLine: 5,
        explain: `Removed ${removed}. Contiguity is restored, at a cost of O(n).`,
        vars: { length: values.length },
      });
    }

    if (operation.op === 'traverse') {
      for (let i = 0; i < values.length; i++) {
        const marked = states(values.length);
        for (let k = 0; k < i; k++) marked[k] = 'visited';
        marked[i] = 'active';
        steps.push({
          scene: scene(marked, 'traverse'),
          codeLine: 2,
          explain: `Reading a[${i}]. Adjacent elements arrive together in one cache line — this is why arrays iterate fast.`,
          vars: { i, value: values[i] },
        });
      }
    }
  }

  steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
  return cap(steps);
};

/** Why nested loops explode: count the pairs. */
export const nestedLoopPairs: Engine = (input) => {
  const n = Math.min(num(input, 'n', 6), 12);
  const values = Array.from({ length: n }, (_, i) => i);
  const steps: Step[] = [];
  let comparisons = 0;

  for (let i = 0; i < n; i++) {
    steps.push({
      scene: {
        array: { values, states: markPair(n, i, -1), caption: 'elements' },
        pointers: [{ name: 'i', index: i, tone: 'brand' }],
      },
      codeLine: 1,
      explain: `Outer loop: i = ${i}.`,
      vars: { i, comparisons },
    });

    for (let j = i + 1; j < n; j++) {
      comparisons++;
      steps.push({
        scene: {
          array: { values, states: markPair(n, i, j), caption: 'elements' },
          pointers: [
            { name: 'i', index: i, tone: 'brand' },
            { name: 'j', index: j, tone: 'warn' },
          ],
        },
        codeLine: 3,
        explain: `Compare element ${i} with element ${j}. That is comparison number ${comparisons}.`,
        vars: { i, j, comparisons },
      });
    }
  }

  steps.push({
    scene: { array: { values, states: states(n, 'visited'), caption: 'elements' } },
    codeLine: 5,
    explain: `${comparisons} comparisons for n = ${n}. The formula is n(n-1)/2, which grows as n² — double n and the work quadruples.`,
    vars: { n, comparisons, 'n(n-1)/2': (n * (n - 1)) / 2 },
    done: true,
  });

  return cap(steps);
};

function markPair(n: number, i: number, j: number): CellState[] {
  const marked = states(n);
  if (i >= 0) marked[i] = 'active';
  if (j >= 0) marked[j] = 'match';
  return marked;
}

/** Comparing growth curves, one input size at a time. */
export const growthTable: Engine = (input) => {
  const sizes = numbers(input, 'sizes', [10, 100, 1000, 10000, 100000, 1000000]);
  const shapes = (Array.isArray(input.shapes) ? input.shapes : ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)']) as string[];
  const steps: Step[] = [];

  const compute = (shape: string, n: number): number => {
    switch (shape) {
      case 'O(1)': return 1;
      case 'O(log n)': return Math.ceil(Math.log2(Math.max(n, 2)));
      case 'O(n)': return n;
      case 'O(n log n)': return Math.round(n * Math.log2(Math.max(n, 2)));
      case 'O(n^2)': return n * n;
      default: return n;
    }
  };

  const rows: CellValue[][] = [];

  for (let s = 0; s < sizes.length; s++) {
    const n = sizes[s];
    rows.push([formatNumber(n), ...shapes.map((shape) => formatNumber(compute(shape, n)))]);

    steps.push({
      scene: {
        table: {
          columns: ['n', ...shapes],
          rows: rows.map((row) => [...row]),
          cursor: [rows.length - 1, shapes.length],
          caption: 'operations performed',
        },
      },
      codeLine: Math.min(s + 2, 6),
      explain:
        s === 0
          ? `At n = ${formatNumber(n)} every curve looks affordable. This is why small test data hides bad algorithms.`
          : `At n = ${formatNumber(n)}, O(n²) needs ${formatNumber(compute('O(n^2)', n))} operations while O(n log n) needs ${formatNumber(compute('O(n log n)', n))}.`,
      vars: { n: formatNumber(n) },
    });
  }

  steps[steps.length - 1] = {
    ...steps[steps.length - 1],
    explain:
      'Assuming ~10⁸ operations per second: O(n²) at n = 10⁶ would take about three hours. O(n log n) takes 0.2 seconds. Same problem, same machine.',
    done: true,
  };
  return cap(steps);
};

function formatNumber(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(0)}e12`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}e9`;
  return value.toLocaleString('en-US');
}

interface MemoryOperation {
  op: 'declare' | 'assign' | 'alias';
  name: string;
  type?: string;
  value?: CellValue;
  expr?: string;
  reference?: boolean;
  target?: string;
}

/** Variables as labelled boxes, including the reference-vs-value distinction. */
const DEFAULT_MEMORY_PROGRAM: MemoryOperation[] = [
  { op: 'declare', name: 'score', type: 'int', value: 0 },
  { op: 'assign', name: 'score', value: 10 },
];

export const memoryBoxes: Engine = (input) => {
  // Never return an empty step list: an engine with nothing to show would render a blank
  // panel with no explanation, which is worse than showing a minimal example.
  const program = (Array.isArray(input.program) && input.program.length > 0
    ? input.program
    : DEFAULT_MEMORY_PROGRAM) as MemoryOperation[];
  const steps: Step[] = [];
  const boxes: { name: string; type?: string; value: CellValue; address: string; reference?: boolean; state?: CellState }[] = [];
  let nextAddress = 0x7f10;

  const address = () => `0x${(nextAddress += 4).toString(16)}`;

  program.forEach((operation, index) => {
    boxes.forEach((box) => { box.state = 'idle'; });

    if (operation.op === 'declare') {
      boxes.push({
        name: operation.name,
        type: operation.type,
        value: operation.value ?? 0,
        address: address(),
        reference: operation.reference,
        state: 'match',
      });
      steps.push({
        scene: { boxes: { boxes: boxes.map((b) => ({ ...b })), caption: 'memory' } },
        codeLine: index + 1,
        explain: operation.reference
          ? `\`${operation.name}\` holds an ADDRESS. The text itself lives elsewhere on the heap.`
          : `Reserve a box for \`${operation.name}\` and put ${operation.value} in it.`,
        vars: { [operation.name]: operation.value ?? 0 },
      });
    }

    if (operation.op === 'assign') {
      const box = boxes.find((b) => b.name === operation.name);
      if (box) {
        box.value = operation.value ?? box.value;
        box.state = 'active';
      }
      steps.push({
        scene: { boxes: { boxes: boxes.map((b) => ({ ...b })), caption: 'memory' } },
        codeLine: index + 1,
        explain: operation.expr
          ? `Evaluate \`${operation.expr}\`, then write the result back into \`${operation.name}\`.`
          : `Overwrite the box labelled \`${operation.name}\` with ${operation.value}.`,
        vars: Object.fromEntries(boxes.map((b) => [b.name, b.value])),
      });
    }

    if (operation.op === 'alias') {
      const target = boxes.find((b) => b.name === operation.target);
      boxes.push({
        name: operation.name,
        type: operation.type,
        value: target ? target.value : '',
        address: target ? target.address : address(),
        reference: true,
        state: 'match',
      });
      steps.push({
        scene: { boxes: { boxes: boxes.map((b) => ({ ...b })), caption: 'memory' } },
        codeLine: index + 1,
        explain: `\`${operation.name}\` copies the ADDRESS, not the value — both names now point at the same object. This is the single most common source of Java surprises.`,
        vars: Object.fromEntries(boxes.map((b) => [b.name, b.value])),
      });
    }
  });

  steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
  return cap(steps);
};

/** Tracing a loop pass by pass, with the printed output accumulating. */
export const loopTrace: Engine = (input) => {
  const multiplier = num(input, 'multiplier', 5);
  const upTo = Math.min(num(input, 'upTo', 5), 20);
  const steps: Step[] = [];
  const output: string[] = [];

  steps.push({
    scene: { output: [] },
    codeLine: 1,
    explain: `The part that stays the same: multiplier = ${multiplier}.`,
    vars: { multiplier },
  });

  for (let i = 1; i <= upTo; i++) {
    steps.push({
      scene: { output: [...output] },
      codeLine: 2,
      explain: `Check the guard: is i (${i}) still ≤ ${upTo}? Yes, so the body runs.`,
      vars: { multiplier, i },
    });

    const product = multiplier * i;
    steps.push({
      scene: { output: [...output] },
      codeLine: 3,
      explain: `Compute ${multiplier} × ${i} = ${product}.`,
      vars: { multiplier, i, product },
    });

    output.push(`${multiplier} x ${i} = ${product}`);
    steps.push({
      scene: { output: [...output] },
      codeLine: 4,
      explain: `Print it. Invariant so far: every multiple up to ${i} has been printed, in order.`,
      vars: { multiplier, i, product },
    });
  }

  steps.push({
    scene: { output: [...output] },
    codeLine: 2,
    explain: `i is now ${upTo + 1}, the guard fails, and the loop ends. ${upTo} passes, ${upTo} lines — the code did not grow with the data.`,
    vars: { multiplier, i: upTo + 1 },
    done: true,
  });

  return cap(steps);
};
