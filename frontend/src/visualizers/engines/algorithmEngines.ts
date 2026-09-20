import { cap, num, numbers, states, type CellState, type Engine, type GraphPanel, type Step } from '../types';

/**
 * Intervals, sorting, bit manipulation, topological order and shortest paths.
 *
 * Each of these has one moment where the idea lands, and the animation exists to reach that
 * moment: intervals become easy the instant they are sorted by start; merge sort's cost is
 * visible as the number of levels; a bit trick is obvious in binary and opaque in decimal;
 * Kahn's algorithm is just "take whatever owes nothing"; and Dijkstra is greedy only because
 * every edge is non-negative.
 */

/* ----------------------------------------------------------------- intervals */

interface Interval {
  start: number;
  end: number;
}

function intervalsFrom(input: Record<string, unknown>): Interval[] {
  const raw = input.intervals;
  if (Array.isArray(raw) && raw.every((item) => Array.isArray(item) && item.length === 2)) {
    return (raw as number[][]).map(([start, end]) => ({ start, end }));
  }
  return [
    { start: 1, end: 3 },
    { start: 8, end: 10 },
    { start: 2, end: 6 },
    { start: 15, end: 18 },
  ];
}

/** Renders intervals as a timeline: one row per interval, a filled band over its span. */
function timeline(intervals: Interval[], merged: Interval[], activeIndex: number, span: number): GraphPanel {
  const nodes: GraphPanel['nodes'] = [];
  intervals.forEach((interval, row) => {
    nodes.push({
      id: `i${row}`,
      label: `[${interval.start}, ${interval.end}]`,
      x: 60 + (interval.start / span) * 520,
      y: 40 + row * 44,
      state: row === activeIndex ? 'active' : 'idle',
    });
  });
  merged.forEach((interval, row) => {
    nodes.push({
      id: `m${row}`,
      label: `[${interval.start}, ${interval.end}]`,
      x: 60 + (interval.start / span) * 520,
      y: 60 + intervals.length * 44 + row * 44,
      state: 'match',
    });
  });
  return { nodes, edges: [], caption: 'input intervals above, merged result below' };
}

export const mergeIntervals: Engine = (input) => {
  const original = intervalsFrom(input);
  const span = Math.max(...original.map((interval) => interval.end), 1);
  const steps: Step[] = [];

  steps.push({
    scene: { graph: timeline(original, [], -1, span) },
    codeLine: 1,
    explain:
      'Merge every pair of intervals that overlap. Unsorted, "which ones overlap" is a question about every pair.',
    vars: { intervals: original.length },
  });

  const sorted = [...original].sort((a, b) => a.start - b.start);
  steps.push({
    scene: { graph: timeline(sorted, [], -1, span) },
    codeLine: 2,
    explain:
      'Sort by start. This is the whole trick: once sorted, an interval can only ever overlap the one currently being built — never anything earlier, because earlier intervals start earlier and have already been closed off.',
    vars: { sortedBy: 'start' },
  });

  const merged: Interval[] = [];
  for (let index = 0; index < sorted.length; index++) {
    const interval = sorted[index];
    const last = merged[merged.length - 1];

    if (!last || interval.start > last.end) {
      merged.push({ ...interval });
      steps.push({
        scene: { graph: timeline(sorted, merged, index, span) },
        codeLine: 4,
        explain: `[${interval.start}, ${interval.end}] starts after the current block ends — no overlap, so start a new block.`,
        vars: { current: `[${interval.start}, ${interval.end}]`, blocks: merged.length },
      });
    } else {
      const before = last.end;
      last.end = Math.max(last.end, interval.end);
      steps.push({
        scene: { graph: timeline(sorted, merged, index, span) },
        codeLine: 6,
        explain: `[${interval.start}, ${interval.end}] starts at or before ${before} — they overlap. Extend the block's end to ${last.end}. Note the max: a fully contained interval must not shrink it.`,
        vars: { current: `[${interval.start}, ${interval.end}]`, extendedTo: last.end },
      });
    }
  }

  steps.push({
    scene: { graph: timeline(sorted, merged, -1, span) },
    codeLine: 8,
    explain: `${original.length} intervals became ${merged.length}. The sort costs O(n log n) and dominates; the merge itself is one pass.`,
    vars: { result: merged.map((i) => `[${i.start}, ${i.end}]`).join(' ') },
    done: true,
  });
  return cap(steps);
};

/* ------------------------------------------------------------------- sorting */

/** Merge sort, shown as levels — because the number of levels IS the log n. */
export const mergeSortSteps: Engine = (input) => {
  const values = numbers(input, 'array', [5, 2, 9, 1, 6, 3]);
  const steps: Step[] = [];
  const working = [...values];
  let comparisons = 0;

  const snapshot = (explain: string, codeLine: number, from: number, to: number, depth: number) => {
    const cellStates = states(working.length);
    for (let i = from; i <= to && i < working.length; i++) cellStates[i] = 'inWindow';
    steps.push({
      scene: {
        array: { values: [...working], states: cellStates, caption: `depth ${depth} — the highlighted run is being worked on` },
      },
      codeLine,
      explain,
      vars: { depth, comparisons, range: `[${from}, ${to}]` },
    });
  };

  const merge = (from: number, middle: number, to: number, depth: number) => {
    const left = working.slice(from, middle + 1);
    const right = working.slice(middle + 1, to + 1);
    let l = 0;
    let r = 0;
    let write = from;

    while (l < left.length && r < right.length) {
      comparisons += 1;
      // <= rather than < is what makes the sort stable: equal elements keep their input order.
      working[write++] = left[l] <= right[r] ? left[l++] : right[r++];
    }
    while (l < left.length) working[write++] = left[l++];
    while (r < right.length) working[write++] = right[r++];

    snapshot(
      `Merge the two sorted halves into [${working.slice(from, to + 1).join(', ')}]. Merging two sorted runs is one pass — that is the only reason splitting was worth it.`,
      8,
      from,
      to,
      depth,
    );
  };

  const sort = (from: number, to: number, depth: number) => {
    if (from >= to) return;
    const middle = Math.floor((from + to) / 2);
    snapshot(`Split [${from}, ${to}] at ${middle}. Halving is what makes the depth log₂(n).`, 4, from, to, depth);
    sort(from, middle, depth + 1);
    sort(middle + 1, to, depth + 1);
    merge(from, middle, to, depth);
  };

  snapshot('Merge sort: split until each piece is trivially sorted, then merge back up.', 1, 0, working.length - 1, 0);
  sort(0, working.length - 1, 0);

  steps.push({
    ...steps[steps.length - 1],
    explain: `Sorted in ${comparisons} comparisons. There are log₂(${values.length}) ≈ ${Math.ceil(Math.log2(values.length))} levels and each level touches all n elements — hence O(n log n), always, regardless of the input.`,
    done: true,
  });
  return cap(steps);
};

/** Quicksort with Lomuto partition — where the O(n²) worst case actually comes from. */
export const quickSortSteps: Engine = (input) => {
  const values = numbers(input, 'array', [5, 2, 9, 1, 6, 3]);
  const working = [...values];
  const steps: Step[] = [];
  let swaps = 0;

  const snapshot = (
    explain: string,
    codeLine: number,
    from: number,
    to: number,
    pivotIndex: number,
    cursor: number,
  ) => {
    const cellStates = states(working.length);
    for (let i = from; i <= to && i < working.length; i++) cellStates[i] = 'inWindow';
    if (cursor >= 0 && cursor < working.length) cellStates[cursor] = 'active';
    if (pivotIndex >= 0 && pivotIndex < working.length) cellStates[pivotIndex] = 'target';
    steps.push({
      scene: { array: { values: [...working], states: cellStates, caption: 'pivot marked, current range highlighted' } },
      codeLine,
      explain,
      vars: { swaps, range: `[${from}, ${to}]`, pivot: working[pivotIndex] ?? '—' },
    });
  };

  const partition = (from: number, to: number): number => {
    const pivot = working[to];
    snapshot(`Partition [${from}, ${to}] around the pivot ${pivot} (the last element).`, 4, from, to, to, -1);
    let boundary = from;
    for (let i = from; i < to; i++) {
      if (working[i] < pivot) {
        [working[i], working[boundary]] = [working[boundary], working[i]];
        boundary += 1;
        swaps += 1;
        snapshot(`${working[boundary - 1]} < ${pivot} — move it into the "smaller" side.`, 6, from, to, to, i);
      }
    }
    [working[boundary], working[to]] = [working[to], working[boundary]];
    swaps += 1;
    snapshot(
      `Put the pivot between the two sides. ${pivot} is now in its final position — that is the guarantee partitioning gives, and it is why no merge step is needed.`,
      8,
      from,
      to,
      boundary,
      -1,
    );
    return boundary;
  };

  const sort = (from: number, to: number) => {
    if (from >= to) return;
    const pivotIndex = partition(from, to);
    sort(from, pivotIndex - 1);
    sort(pivotIndex + 1, to);
  };

  snapshot('Quicksort: put one element where it belongs, then repeat on each side.', 1, 0, working.length - 1, -1, -1);
  sort(0, working.length - 1);

  steps.push({
    ...steps[steps.length - 1],
    explain: `Sorted in place with ${swaps} swaps — no extra array, unlike merge sort. The catch: pick the pivot badly (already-sorted input with a last-element pivot) and every partition splits 1 and n-1, giving O(n²). Randomising or median-of-three is the standard defence.`,
    done: true,
  });
  return cap(steps);
};

/* ------------------------------------------------------------ bit operations */

const BIT_WIDTH = 8;

function bits(value: number): string[] {
  return (value >>> 0).toString(2).padStart(BIT_WIDTH, '0').split('');
}

/** Bit tricks shown in binary, which is the only representation in which they are obvious. */
export const bitOps: Engine = (input) => {
  const value = num(input, 'value', 12);
  const steps: Step[] = [];

  const show = (
    label: string,
    result: number,
    explain: string,
    codeLine: number,
    highlight: (index: number) => CellState = () => 'idle',
  ) => {
    steps.push({
      scene: {
        array: {
          values: bits(value),
          states: bits(value).map((_, index) => highlight(index)),
          labels: Array.from({ length: BIT_WIDTH }, (_, i) => String(BIT_WIDTH - 1 - i)),
          caption: `${value} in binary — bit numbers below`,
          asText: true,
        },
        secondaryArray: {
          values: bits(result),
          states: bits(result).map((bit, index) => (bits(value)[index] !== bit ? 'match' : 'idle')),
          labels: Array.from({ length: BIT_WIDTH }, (_, i) => String(BIT_WIDTH - 1 - i)),
          caption: `${label} = ${result} — changed bits highlighted`,
          asText: true,
        },
      },
      codeLine,
      explain,
      vars: { value, result, binary: bits(result).join('') },
    });
  };

  steps.push({
    scene: {
      array: {
        values: bits(value),
        states: states(BIT_WIDTH),
        labels: Array.from({ length: BIT_WIDTH }, (_, i) => String(BIT_WIDTH - 1 - i)),
        caption: `${value} in binary`,
        asText: true,
      },
    },
    codeLine: 1,
    explain: `${value} is ${bits(value).join('')}. Every trick below is obvious here and unreadable in decimal — which is the real lesson.`,
    vars: { value },
  });

  show(`value << 1`, value << 1, `Shifting left by one doubles the number: ${value} → ${value << 1}. Each position is worth twice the one to its right.`, 2);
  show(`value >> 1`, value >> 1, `Shifting right halves it, discarding the remainder: ${value} → ${value >> 1}. This is integer division by two.`, 3);
  show(
    `value & 1`,
    value & 1,
    `AND with 1 keeps only the last bit, which is 0 for even and 1 for odd. Faster to read than % 2 once you see it, and identical in cost.`,
    4,
    (index) => (index === BIT_WIDTH - 1 ? 'active' : 'idle'),
  );
  show(
    `value & (value - 1)`,
    value & (value - 1),
    `Subtracting 1 flips the lowest set bit and everything below it; ANDing with the original therefore clears exactly that one bit. Loop this and the number of iterations is the number of set bits — Brian Kernighan's trick.`,
    5,
  );
  show(
    `value & -value`,
    value & -value,
    `Negation in two's complement is "flip all bits and add 1", which leaves the lowest set bit as the only bit agreeing with the original. So this isolates it — the operation a Fenwick tree is built on.`,
    6,
  );
  show(`value ^ value`, value ^ value, `XOR of anything with itself is 0, and XOR with 0 leaves a value unchanged. Those two facts together are why XOR-ing a whole array finds the single unpaired element.`, 7);

  steps[steps.length - 1].done = true;
  return cap(steps);
};

/* ------------------------------------------------------- topological ordering */

interface GraphInput {
  nodes: { id: string; label?: string; x: number; y: number }[];
  edges: { from: string; to: string }[];
}

function graphFrom(input: Record<string, unknown>): GraphInput {
  const raw = input.graph as GraphInput | undefined;
  if (raw?.nodes?.length) return raw;
  return {
    nodes: [
      { id: 'a', x: 80, y: 60 },
      { id: 'b', x: 220, y: 40 },
      { id: 'c', x: 220, y: 140 },
      { id: 'd', x: 360, y: 90 },
      { id: 'e', x: 500, y: 90 },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'd' },
      { from: 'c', to: 'd' },
      { from: 'd', to: 'e' },
    ],
  };
}

/** Kahn's algorithm: repeatedly take a node that owes nothing. */
export const topologicalSort: Engine = (input) => {
  const graph = graphFrom(input);
  const indegree = new Map<string, number>(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);

  const removed = new Set<string>();
  const order: string[] = [];
  const steps: Step[] = [];

  const snapshot = (explain: string, codeLine: number, active: string | null, queue: string[]) => {
    steps.push({
      scene: {
        graph: {
          directed: true,
          nodes: graph.nodes.map((node) => ({
            id: node.id,
            label: `${node.label ?? node.id} (${indegree.get(node.id) ?? 0})`,
            x: node.x,
            y: node.y,
            state: node.id === active ? 'active' : removed.has(node.id) ? 'visited' : 'idle',
          })),
          edges: graph.edges.map((edge) => ({
            ...edge,
            state: removed.has(edge.from) ? 'tree' : 'idle',
          })),
          caption: 'each node shows its remaining indegree — how many prerequisites it still has',
        },
        queue: { items: [...queue], caption: 'ready: nothing left to wait for' },
        output: [...order],
      },
      codeLine,
      explain,
      vars: { ordered: order.length, ready: queue.length },
    });
  };

  const queue = graph.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  snapshot(
    'Count how many prerequisites each node has. Anything with a count of zero can go first — there is nothing to wait for.',
    2,
    null,
    queue,
  );

  while (queue.length > 0) {
    const current = queue.shift() as string;
    removed.add(current);
    order.push(current);
    snapshot(`Take ${current} — it owed nothing. Append it to the order.`, 5, current, queue);

    for (const edge of graph.edges.filter((e) => e.from === current)) {
      const next = (indegree.get(edge.to) ?? 0) - 1;
      indegree.set(edge.to, next);
      if (next === 0) {
        queue.push(edge.to);
        snapshot(`${edge.to}'s last prerequisite is done — it is ready now.`, 8, current, queue);
      } else {
        snapshot(`${edge.to} still waits on ${next} other prerequisite(s).`, 7, current, queue);
      }
    }
  }

  const cyclic = order.length !== graph.nodes.length;
  snapshot(
    cyclic
      ? `Only ${order.length} of ${graph.nodes.length} nodes came out. The rest are stuck waiting on each other — that is a cycle, and it is how this algorithm detects one.`
      : `Order: ${order.join(' → ')}. Every edge points forwards in this list, which is exactly what a topological order means.`,
    11,
    null,
    [],
  );
  steps[steps.length - 1].done = true;
  return cap(steps);
};

/* ------------------------------------------------------------ shortest paths */

interface WeightedGraph {
  nodes: { id: string; x: number; y: number }[];
  edges: { from: string; to: string; weight: number }[];
}

export const dijkstra: Engine = (input) => {
  const graph = (input.graph as WeightedGraph | undefined)?.nodes?.length
    ? (input.graph as WeightedGraph)
    : {
        nodes: [
          { id: 'a', x: 70, y: 100 },
          { id: 'b', x: 220, y: 40 },
          { id: 'c', x: 220, y: 160 },
          { id: 'd', x: 380, y: 100 },
          { id: 'e', x: 520, y: 100 },
        ],
        edges: [
          { from: 'a', to: 'b', weight: 4 },
          { from: 'a', to: 'c', weight: 1 },
          { from: 'c', to: 'b', weight: 2 },
          { from: 'b', to: 'd', weight: 5 },
          { from: 'c', to: 'd', weight: 8 },
          { from: 'd', to: 'e', weight: 3 },
        ],
      };

  const source = (input.source as string) ?? graph.nodes[0].id;
  const distance = new Map<string, number>(graph.nodes.map((node) => [node.id, Infinity]));
  distance.set(source, 0);
  const settled = new Set<string>();
  const steps: Step[] = [];

  const label = (id: string) => {
    const value = distance.get(id) ?? Infinity;
    return `${id} (${value === Infinity ? '∞' : value})`;
  };

  const snapshot = (explain: string, codeLine: number, active: string | null, relaxing?: { from: string; to: string }) => {
    steps.push({
      scene: {
        graph: {
          nodes: graph.nodes.map((node) => ({
            id: node.id,
            label: label(node.id),
            x: node.x,
            y: node.y,
            state: node.id === active ? 'active' : settled.has(node.id) ? 'visited' : 'idle',
          })),
          edges: graph.edges.map((edge) => ({
            from: edge.from,
            to: edge.to,
            label: String(edge.weight),
            state:
              relaxing && relaxing.from === edge.from && relaxing.to === edge.to
                ? 'active'
                : settled.has(edge.from) && settled.has(edge.to)
                  ? 'tree'
                  : 'idle',
          })),
          directed: true,
          caption: 'each node shows the best distance known so far',
        },
        output: graph.nodes.map((node) => label(node.id)),
      },
      codeLine,
      explain,
      vars: { settled: settled.size, active: active ?? '—' },
    });
  };

  snapshot(`Start at ${source}: distance 0 to itself, ∞ to everything else — "∞" meaning "no route known yet".`, 2, source);

  for (;;) {
    let current: string | null = null;
    let best = Infinity;
    for (const node of graph.nodes) {
      const value = distance.get(node.id) ?? Infinity;
      if (!settled.has(node.id) && value < best) {
        best = value;
        current = node.id;
      }
    }
    if (current === null) break;

    settled.add(current);
    snapshot(
      `Settle ${current} at distance ${best}. It is the nearest unsettled node, and because no edge is negative, nothing discovered later can beat it — that single fact is what makes the greedy choice safe.`,
      5,
      current,
    );

    for (const edge of graph.edges.filter((e) => e.from === current)) {
      const candidate = best + edge.weight;
      const known = distance.get(edge.to) ?? Infinity;
      if (candidate < known) {
        distance.set(edge.to, candidate);
        snapshot(
          `Going via ${current} reaches ${edge.to} in ${candidate}, better than ${known === Infinity ? '∞' : known}. Update it.`,
          8,
          current,
          { from: edge.from, to: edge.to },
        );
      } else {
        snapshot(
          `Via ${current}, ${edge.to} would cost ${candidate} — no better than the ${known} we already have. Leave it.`,
          7,
          current,
          { from: edge.from, to: edge.to },
        );
      }
    }
  }

  snapshot(
    `Done. Every node holds its shortest distance from ${source}. With a negative edge this would be wrong — a settled node could still be improved later, which is exactly the case Bellman-Ford handles and Dijkstra does not.`,
    11,
    null,
  );
  steps[steps.length - 1].done = true;
  return cap(steps);
};

/* -------------------------------------------------------------- matrix spiral */

export const matrixSpiral: Engine = (input) => {
  const matrix = (Array.isArray(input.matrix) ? input.matrix : [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
  ]) as number[][];

  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  const visited = Array.from({ length: rows }, () => Array.from({ length: columns }, () => false));
  const order: string[] = [];
  const steps: Step[] = [];

  const snapshot = (explain: string, codeLine: number, at: [number, number] | null, vars: Record<string, string | number>) => {
    steps.push({
      scene: {
        grid: {
          cells: matrix,
          states: visited.map((row, r) =>
            row.map((seen, c) => (at && at[0] === r && at[1] === c ? 'active' : seen ? 'visited' : 'idle')),
          ),
          caption: 'spiral traversal',
        },
        output: [...order],
      },
      codeLine,
      explain,
      vars,
    });
  };

  let top = 0;
  let bottom = rows - 1;
  let left = 0;
  let right = columns - 1;

  snapshot('Walk the matrix in a spiral. Four boundaries, shrinking inwards.', 1, null, { top, bottom, left, right });

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) {
      visited[top][c] = true;
      order.push(String(matrix[top][c]));
      snapshot(`Across the top row, left to right.`, 3, [top, c], { top, bottom, left, right });
    }
    top += 1;

    for (let r = top; r <= bottom; r++) {
      visited[r][right] = true;
      order.push(String(matrix[r][right]));
      snapshot(`Down the right column.`, 5, [r, right], { top, bottom, left, right });
    }
    right -= 1;

    // These two guards are the bug everyone writes: without them, a single remaining row or
    // column is walked twice — once forwards and once back.
    if (top <= bottom) {
      for (let c = right; c >= left; c--) {
        visited[bottom][c] = true;
        order.push(String(matrix[bottom][c]));
        snapshot(`Back across the bottom row — but only if a row is actually left.`, 8, [bottom, c], { top, bottom, left, right });
      }
      bottom -= 1;
    }

    if (left <= right) {
      for (let r = bottom; r >= top; r--) {
        visited[r][left] = true;
        order.push(String(matrix[r][left]));
        snapshot(`Up the left column — again, only if a column is left.`, 11, [r, left], { top, bottom, left, right });
      }
      left += 1;
    }
  }

  snapshot(`Order: ${order.join(', ')}. Every cell visited exactly once — O(rows × columns).`, 14, null, {
    visited: order.length,
  });
  steps[steps.length - 1].done = true;
  return cap(steps);
};
