import { describe, expect, it } from 'vitest';
import { ENGINES, engineIds } from '../registry';
import { slidingWindowFixed, slidingWindowShrink, slidingWindowVariable } from './windowEngines';
import { twoPointersOpposite, twoPointersSameDirection } from './pointerEngines';
import { binarySearch, binarySearchAnswer, binarySearchBoundary } from './searchEngines';
import { prefixSumHash, twoSumHash } from './hashEngines';
import { fastSlowPointer } from './listEngines';
import { balancedBrackets } from './stackQueueEngines';
import { treeTraversal } from './treeEngines';
import { graphBfs, gridDfs } from './graphEngines';
import { backtrackingNQueens, backtrackingSubsets, recursionTrace } from './recursionEngines';
import { dp1d, dpGrid } from './dpEngines';
import { MAX_STEPS } from '../types';

/**
 * Engines are pure functions, which is the whole point of ADR-004: an animation becomes
 * something you can assert on. These tests check the two things a learner would actually
 * notice if they broke — that the algorithm reaches the right answer, and that the highlighted
 * code line matches what the step claims to be doing.
 */

describe('registry', () => {
  it('registers every engine exactly once and exposes them sorted', () => {
    const ids = engineIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(40);
  });

  it('every registered engine produces at least one step from empty input', () => {
    for (const [id, engine] of Object.entries(ENGINES)) {
      const steps = engine({});
      expect(steps.length, `${id} produced no steps`).toBeGreaterThan(0);
      expect(steps[steps.length - 1].done, `${id} never marks a final step`).toBe(true);
      for (const step of steps) {
        expect(typeof step.explain, `${id} has a step with no explanation`).toBe('string');
        expect(step.explain.length, `${id} has an empty explanation`).toBeGreaterThan(0);
      }
    }
  });

  it('caps runaway output so a pathological input cannot freeze the tab', () => {
    const steps = ENGINES.nestedLoopPairs({ n: 12 });
    expect(steps.length).toBeLessThanOrEqual(MAX_STEPS);
  });
});

describe('sliding window', () => {
  it('finds the best fixed-size window and says so in the final step', () => {
    const steps = slidingWindowFixed({ array: [2, 1, 5, 1, 3, 2], k: 3 });
    const final = steps[steps.length - 1];
    expect(final.explain).toContain('9');
    expect(final.vars?.best).toBe(9);
  });

  it('handles an all-negative array without falling back to zero', () => {
    const steps = slidingWindowFixed({ array: [-5, -2, -1, -4], k: 2 });
    expect(steps[steps.length - 1].vars?.best).toBe(-3);
  });

  it('shows the window as a contiguous range at every step', () => {
    const steps = slidingWindowFixed({ array: [1, 2, 3, 4], k: 2 });
    const windowed = steps.filter((step) => (step.scene.ranges?.length ?? 0) > 0);
    expect(windowed.length).toBeGreaterThan(0);
    for (const step of windowed) {
      const range = step.scene.ranges?.[0];
      expect(range?.to).toBeGreaterThanOrEqual(range?.from ?? 0);
    }
  });

  it('jumps left past a duplicate rather than stepping', () => {
    const steps = slidingWindowVariable({ text: 'abcabcbb' });
    expect(steps[steps.length - 1].vars?.best).toBe(3);
    expect(steps.some((step) => step.explain.includes('Jump left'))).toBe(true);
  });

  it('does not move left backwards for a duplicate outside the window', () => {
    // "abba" is the case that exposes the missing `previous >= left` guard.
    const steps = slidingWindowVariable({ text: 'abba' });
    expect(steps[steps.length - 1].vars?.best).toBe(2);
  });

  it('records the shortest window while it is still valid', () => {
    const steps = slidingWindowShrink({ array: [2, 3, 1, 2, 4, 3], target: 7 });
    expect(steps[steps.length - 1].vars?.best).toBe(2);
    // The record must happen on the line inside the shrink loop, not after it.
    const recording = steps.find((step) => step.explain.includes('Record it NOW'));
    expect(recording?.codeLine).toBe(5);
  });
});

describe('two pointers', () => {
  it('converges on the pair and justifies each discard', () => {
    const steps = twoPointersOpposite({ array: [1, 3, 4, 6, 8, 11], target: 10 });
    const final = steps[steps.length - 1];
    expect(final.explain).toContain('Found it');
    expect(steps.some((step) => step.explain.includes('too small to pair'))).toBe(true);
    expect(steps.some((step) => step.explain.includes('too large to pair'))).toBe(true);
  });

  it('compacts duplicates in place and reports the new length', () => {
    const steps = twoPointersSameDirection({ array: [1, 1, 2, 2, 2, 3, 4, 4] });
    expect(steps[steps.length - 1].vars?.length).toBe(4);
  });
});

describe('binary search', () => {
  it('halves the candidate range on every probe', () => {
    const steps = binarySearch({ array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 });
    const probes = steps.filter((step) => step.codeLine === 3);
    expect(probes.length).toBeLessThanOrEqual(4); // log2(10) ≈ 3.3
    expect(steps[steps.length - 1].explain).toContain('Found 23');
  });

  it('reports a genuine miss rather than a wrong index', () => {
    const steps = binarySearch({ array: [1, 3, 5], target: 4 });
    expect(steps[steps.length - 1].explain).toContain('not present');
  });

  it('lower bound lands on the FIRST occurrence of a duplicated value', () => {
    const steps = binarySearchBoundary({ array: [1, 3, 3, 3, 5, 8, 8, 10], target: 3 });
    expect(steps[steps.length - 1].vars?.answer).toBe(1);
  });

  it('searches an answer space with a monotonic predicate', () => {
    const steps = binarySearchAnswer({ piles: [30, 11, 23, 4, 20], hours: 6 });
    expect(steps[steps.length - 1].vars?.answer).toBe(23);
  });
});

describe('hashing and prefix sums', () => {
  it('two sum stores the value only after checking for its complement', () => {
    const steps = twoSumHash({ array: [2, 7, 11, 15, 3], target: 18 });
    expect(steps[steps.length - 1].vars?.answer).toBe('[1, 2]');
  });

  it('counts subarrays correctly with negative values present', () => {
    const steps = prefixSumHash({ array: [1, -1, 0], k: 0 });
    expect(steps[steps.length - 1].vars?.count).toBe(3);
  });

  it('seeds the prefix map with the empty prefix', () => {
    const steps = prefixSumHash({ array: [1, 2, 3], k: 3 });
    expect(steps[0].explain).toContain('{0: 1}');
    expect(steps[steps.length - 1].vars?.count).toBe(2);
  });
});

describe('linked list', () => {
  it('finds the second middle of an even-length list', () => {
    const steps = fastSlowPointer({ values: [1, 2, 3, 4, 5, 6], mode: 'middle' });
    expect(steps[steps.length - 1].vars?.middle).toBe(4);
  });

  it('detects a cycle and shows the gap shrinking', () => {
    const steps = fastSlowPointer({ values: [3, 2, 0, -4], cycleAt: 1, mode: 'cycle' });
    const final = steps[steps.length - 1];
    expect(final.explain).toContain('Return true');
    expect(steps.some((step) => step.explain.includes('Gap around the cycle'))).toBe(true);
  });

  it('reports no cycle for a straight list', () => {
    const steps = fastSlowPointer({ values: [1, 2, 3, 4], mode: 'cycle' });
    expect(steps[steps.length - 1].explain).toContain('no cycle');
  });

  it('locates the cycle entry with the second phase', () => {
    const steps = fastSlowPointer({ values: [3, 2, 0, -4, 9, 6], cycleAt: 2, mode: 'entry' });
    expect(steps[steps.length - 1].vars?.entry).toBe(0); // index 2 holds the value 0
  });
});

describe('stack', () => {
  it('accepts correctly nested brackets', () => {
    const steps = balancedBrackets({ text: '{[()]}' });
    expect(steps[steps.length - 1].explain).toContain('Valid');
  });

  it('rejects a closer with an empty stack and one left unclosed', () => {
    expect(balancedBrackets({ text: ')' }).slice(-1)[0].explain).toContain('never opened');
    expect(balancedBrackets({ text: '(((' }).slice(-1)[0].explain).toContain('never closed');
  });

  it('rejects correct counts in the wrong order', () => {
    const steps = balancedBrackets({ text: '([)]' });
    expect(steps[steps.length - 1].explain).toContain('wrong type');
  });
});

describe('trees', () => {
  const tree = { value: 10, left: { value: 5, left: { value: 2 }, right: { value: 7 } }, right: { value: 15, right: { value: 20 } } };

  it('in-order traversal of a BST is sorted', () => {
    const steps = treeTraversal({ tree, order: 'inorder' });
    expect(steps[steps.length - 1].explain).toContain('2 → 5 → 7 → 10 → 15 → 20');
  });

  it('pre-order visits the node before its children', () => {
    const steps = treeTraversal({ tree, order: 'preorder' });
    expect(steps[steps.length - 1].explain).toContain('10 → 5 → 2 → 7 → 15 → 20');
  });

  it('level order groups by depth and uses a queue rather than a stack', () => {
    const steps = treeTraversal({ tree, order: 'levelorder' });
    expect(steps[steps.length - 1].explain).toContain('10 → 5 → 15 → 2 → 7 → 20');
    expect(steps.some((step) => step.scene.queue !== undefined)).toBe(true);
  });
});

describe('graphs', () => {
  it('BFS reports the fewest hops, not just any path', () => {
    const steps = graphBfs({
      nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
      edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F']],
      start: 'A',
      target: 'F',
    });
    expect(steps[steps.length - 1].explain).toContain('distance 3');
  });

  it('counts islands without joining diagonals', () => {
    const steps = gridDfs({ grid: [[1, 0], [0, 1]] });
    expect(steps[steps.length - 1].vars?.islands).toBe(2);
  });
});

describe('recursion and backtracking', () => {
  it('shows fib recomputing the same subproblems', () => {
    const steps = recursionTrace({ kind: 'fib', n: 5 });
    const final = steps[steps.length - 1];
    expect(final.explain).toContain('computed more than once');
    expect(Number(final.vars?.calls)).toBeGreaterThan(Number(final.vars?.distinct));
  });

  it('factorial has no repeated subproblems, so there is nothing to memoise', () => {
    const steps = recursionTrace({ kind: 'factorial', n: 5 });
    expect(steps[steps.length - 1].explain).toContain('nothing for a cache to do');
  });

  it('generates 2^n subsets and always unchooses', () => {
    const steps = backtrackingSubsets({ array: [1, 2, 3] });
    expect(steps[steps.length - 1].vars?.subsets).toBe(8);
    expect(steps.some((step) => step.explain.startsWith('UNCHOOSE'))).toBe(true);
  });

  it('N-Queens prunes rather than enumerating', () => {
    const steps = backtrackingNQueens({ n: 4 });
    const final = steps[steps.length - 1];
    expect(Number(final.vars?.prunes)).toBeGreaterThan(0);
    expect(Number(final.vars?.solutions)).toBeGreaterThan(0);
  });
});

describe('dynamic programming', () => {
  it('fills a 1-D table to the right answer', () => {
    const steps = dp1d({ kind: 'climbStairs', n: 8 });
    expect(steps[steps.length - 1].vars?.answer).toBe(34); // fib(9)
  });

  it('seeds dp[0] to 1, not 0', () => {
    const steps = dp1d({ kind: 'climbStairs', n: 3 });
    expect(steps[1].vars?.['dp[0]']).toBe(1);
  });

  it('counts grid paths correctly', () => {
    const steps = dpGrid({ rows: 3, cols: 7 });
    expect(steps[steps.length - 1].vars?.answer).toBe(28);
  });
});

describe('code ↔ state synchronisation', () => {
  it('every step that claims a code line uses a positive 1-based line number', () => {
    for (const [id, engine] of Object.entries(ENGINES)) {
      for (const step of engine({})) {
        if (step.codeLine !== undefined) {
          expect(step.codeLine, `${id} emitted a non-positive code line`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('scene snapshots are independent — mutating one cannot affect another', () => {
    const steps = slidingWindowFixed({ array: [1, 2, 3, 4], k: 2 });
    const firstStates = steps[0].scene.array?.states;
    const lastStates = steps[steps.length - 1].scene.array?.states;
    expect(firstStates).not.toBe(lastStates);
  });
});

/**
 * The new structural and algorithmic engines.
 *
 * These assert the *computation*, not the narration: an animation that tells a confident story
 * about a wrong answer is worse than no animation, and the only defence is checking the result
 * the steps arrive at against what the algorithm should actually produce.
 */
describe('heaps', () => {
  it('extracts in ascending order and keeps the heap property', () => {
    const steps = ENGINES.heapOps({
      operations: [
        { op: 'insert', value: 5 },
        { op: 'insert', value: 3 },
        { op: 'insert', value: 8 },
        { op: 'insert', value: 1 },
        { op: 'extract' },
        { op: 'extract' },
      ],
    });
    const extracted = steps.filter((step) => /extractMin\(\) → /.test(step.explain));
    expect(extracted.map((step) => step.vars?.min)).toEqual([1, 3]);

    // Every array snapshot must satisfy heap[parent] <= heap[child].
    for (const step of steps) {
      const heap = step.scene.array?.values as number[] | undefined;
      if (!heap || heap.length < 2 || step.scene.secondaryArray) continue;
      for (let i = 1; i < heap.length; i++) {
        const parent = Math.floor((i - 1) / 2);
        // Snapshots taken mid-sift are allowed to violate it; the final one must not.
        if (step.done) expect(heap[parent]).toBeLessThanOrEqual(heap[i]);
      }
    }
  });

  it('keeps the k largest with a min-heap of size k', () => {
    const steps = ENGINES.topKHeap({ array: [4, 1, 7, 3, 9, 2, 8], k: 3 });
    const final = steps[steps.length - 1];
    const heap = [...((final.scene.secondaryArray?.values ?? []) as number[])].sort((a, b) => b - a);
    expect(heap).toEqual([9, 8, 7]);
  });
});

describe('trie', () => {
  it('finds a stored word, rejects a bare prefix, and enumerates by prefix', () => {
    const steps = ENGINES.trieOps({ words: ['cat', 'car', 'card', 'dog'], search: 'car', prefix: 'ca' });

    const found = steps.find((step) => step.vars?.result === 'found');
    expect(found).toBeDefined();

    const final = steps[steps.length - 1];
    expect([...(final.scene.output ?? [])].sort()).toEqual(['car', 'card', 'cat']);
  });

  it('reports a prefix that is not itself a word', () => {
    const steps = ENGINES.trieOps({ words: ['card'], search: 'car', prefix: 'c' });
    expect(steps.some((step) => step.vars?.result === 'prefix only')).toBe(true);
  });
});

describe('union-find', () => {
  it('merges sets and reports the connected components', () => {
    const steps = ENGINES.unionFind({
      size: 6,
      operations: [
        { op: 'union', a: 0, b: 1 },
        { op: 'union', a: 2, b: 3 },
        { op: 'union', a: 1, b: 2 },
        { op: 'union', a: 4, b: 5 },
      ],
    });
    const groups = (steps[steps.length - 1].scene.output ?? []).sort();
    expect(groups).toEqual(['{0, 1, 2, 3}', '{4, 5}']);
  });

  it('detects that two nodes are already connected', () => {
    const steps = ENGINES.unionFind({
      size: 3,
      operations: [
        { op: 'union', a: 0, b: 1 },
        { op: 'union', a: 1, b: 2 },
        { op: 'union', a: 0, b: 2 },
      ],
    });
    expect(steps.some((step) => /already in the same set/.test(step.explain))).toBe(true);
  });
});

describe('monotonic stack', () => {
  it('computes the next greater element', () => {
    const steps = ENGINES.monotonicStack({ array: [2, 1, 2, 4, 3] });
    const result = steps[steps.length - 1].scene.secondaryArray?.values;
    expect(result).toEqual([4, 2, 4, -1, -1]);
  });

  it('pushes and pops each index at most once', () => {
    const values = [5, 4, 3, 2, 1, 9];
    const steps = ENGINES.monotonicStack({ array: values });
    const pops = Number(steps[steps.length - 1].vars?.totalPops ?? 0);
    expect(pops).toBeLessThanOrEqual(values.length);
  });
});

describe('intervals', () => {
  it('merges overlapping intervals after sorting by start', () => {
    const steps = ENGINES.mergeIntervals({ intervals: [[1, 3], [8, 10], [2, 6], [15, 18]] });
    expect(steps[steps.length - 1].vars?.result).toBe('[1, 6] [8, 10] [15, 18]');
  });

  it('does not shrink a block when a fully contained interval arrives', () => {
    const steps = ENGINES.mergeIntervals({ intervals: [[1, 10], [2, 3]] });
    expect(steps[steps.length - 1].vars?.result).toBe('[1, 10]');
  });
});

describe('sorting', () => {
  const unsorted = [5, 2, 9, 1, 6, 3];
  const sorted = [1, 2, 3, 5, 6, 9];

  it('merge sort produces a sorted array', () => {
    const steps = ENGINES.mergeSortSteps({ array: unsorted });
    expect(steps[steps.length - 1].scene.array?.values).toEqual(sorted);
  });

  it('quicksort produces a sorted array in place', () => {
    const steps = ENGINES.quickSortSteps({ array: unsorted });
    expect(steps[steps.length - 1].scene.array?.values).toEqual(sorted);
  });
});

describe('bit operations', () => {
  it('computes each trick correctly for 12', () => {
    const steps = ENGINES.bitOps({ value: 12 });
    const results = steps.map((step) => step.vars?.result);
    // 12 = 00001100
    expect(results).toContain(24); // << 1
    expect(results).toContain(6);  // >> 1
    expect(results).toContain(0);  // & 1 (even) and ^ itself
    expect(results).toContain(8);  // & (n-1) clears the lowest set bit
    expect(results).toContain(4);  // & -n isolates the lowest set bit
  });
});

describe('topological sort', () => {
  it('produces an order where every edge points forwards', () => {
    const steps = ENGINES.topologicalSort({});
    const order = steps[steps.length - 1].scene.output ?? [];
    const position = new Map(order.map((id, index) => [id, index]));
    const edges = [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['d', 'e']];
    for (const [from, to] of edges) {
      expect(position.get(from)!).toBeLessThan(position.get(to)!);
    }
  });

  it('reports a cycle rather than producing a wrong order', () => {
    const steps = ENGINES.topologicalSort({
      graph: {
        nodes: [
          { id: 'x', x: 80, y: 60 },
          { id: 'y', x: 220, y: 60 },
        ],
        edges: [
          { from: 'x', to: 'y' },
          { from: 'y', to: 'x' },
        ],
      },
    });
    expect(steps[steps.length - 1].explain).toMatch(/cycle/i);
  });
});

describe('dijkstra', () => {
  it('finds the shortest distance even when the direct edge is worse', () => {
    const steps = ENGINES.dijkstra({});
    const labels = steps[steps.length - 1].scene.output ?? [];
    // a→c is 1, c→b is 2, so b costs 3 via c rather than the direct 4.
    expect(labels).toContain('b (3)');
    expect(labels).toContain('d (8)');
    expect(labels).toContain('e (11)');
  });
});

describe('matrix traversal', () => {
  it('walks a rectangular matrix in spiral order, visiting each cell once', () => {
    const steps = ENGINES.matrixSpiral({
      matrix: [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
      ],
    });
    const order = steps[steps.length - 1].scene.output ?? [];
    expect(order.join(',')).toBe('1,2,3,4,8,12,11,10,9,5,6,7');
    expect(new Set(order).size).toBe(12);
  });

  it('handles a single row without walking it twice', () => {
    const steps = ENGINES.matrixSpiral({ matrix: [[1, 2, 3]] });
    expect(steps[steps.length - 1].scene.output).toEqual(['1', '2', '3']);
  });
});

describe('grid BFS modes', () => {
  /**
   * The engine originally had one mode — single source, walk to a target — and two problems
   * pointed at it that are not that problem at all. Rotting oranges and walls-and-gates are
   * multi-source distance fills, and the animation cheerfully narrated "reached the exit" over
   * them. These assert the distinction the problems actually turn on.
   */
  const OPEN = [
    [0, 0, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ];

  it('multi-source reaches every cell in fewer rounds than any single source could', () => {
    const rounds = (input: Record<string, unknown>) => {
      const steps = ENGINES.gridBfs({ grid: OPEN, ...input });
      return Number(steps[steps.length - 1].vars?.rounds ?? -1);
    };
    const fromOneCorner = rounds({ sources: [[0, 0]] });
    const fromBothCorners = rounds({ sources: [[0, 0], [2, 3]] });
    expect(fromOneCorner).toBeGreaterThan(0);
    expect(fromBothCorners).toBeLessThan(fromOneCorner);
  });

  it('reports cells no source can reach, which is the case these problems must return -1 for', () => {
    const walled = [
      [0, 1, 0],
      [1, 1, 0],
      [0, 0, 0],
    ];
    const steps = ENGINES.gridBfs({ grid: walled, sources: [[0, 0]] });
    const last = steps[steps.length - 1];
    // Six open cells; the source is sealed in its corner by the walls at (0,1) and (1,0).
    expect(last.vars?.unreachable).toBe(5);
    expect(last.explain).toMatch(/never reached/);
  });

  it('claims every open cell exactly once when a source can reach them all', () => {
    const steps = ENGINES.gridBfs({ grid: OPEN, sources: [[0, 0]] });
    const last = steps[steps.length - 1];
    expect(last.vars?.unreachable).toBe(0);
    expect(last.vars?.reached).toBe(10); // 12 cells minus the two walls
  });

  it('an eight-cell neighbourhood reaches the far corner faster than a four-cell one', () => {
    const open = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const distance = (diagonal: boolean) => {
      const steps = ENGINES.gridBfs({ grid: open, start: [0, 0], target: [3, 3], diagonal });
      return Number(steps[steps.length - 1].vars?.steps ?? -1);
    };
    expect(distance(false)).toBe(6); // Manhattan
    expect(distance(true)).toBe(3); // Chebyshev
  });

  it('still stops at the target in single-source mode rather than filling the grid', () => {
    const steps = ENGINES.gridBfs({ grid: OPEN, start: [0, 0], target: [0, 2] });
    expect(steps[steps.length - 1].explain).toMatch(/Reached the exit/);
    expect(steps[steps.length - 1].done).toBe(true);
  });
});
