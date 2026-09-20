import { cap, num, numbers, states, text, type CellState, type Engine, type Step } from '../types';

/**
 * Converging pointers on a sorted array.
 *
 * The teaching moment is the JUSTIFICATION shown with each move: the discarded element cannot
 * pair with anything still in range. Without that argument the pattern is a trick; with it,
 * it is a proof.
 */
export const twoPointersOpposite: Engine = (input) => {
  const values = numbers(input, 'array', [1, 3, 4, 6, 8, 11]);
  const target = num(input, 'target', 14);
  const steps: Step[] = [];

  let left = 0;
  let right = values.length - 1;

  const scene = (l: number, r: number, extra?: { matched?: boolean; dropped?: number }) => {
    const cellStates: CellState[] = states(values.length);
    for (let i = 0; i < l; i++) cellStates[i] = 'reject';
    for (let i = r + 1; i < values.length; i++) cellStates[i] = 'reject';
    if (l < values.length) cellStates[l] = extra?.matched ? 'match' : 'active';
    if (r >= 0) cellStates[r] = extra?.matched ? 'match' : 'active';
    if (extra?.dropped !== undefined) cellStates[extra.dropped] = 'reject';

    return {
      array: { values, states: cellStates, caption: `sorted nums (target ${target})` },
      pointers: [
        { name: 'left', index: Math.max(0, Math.min(l, values.length - 1)), tone: 'brand' as const },
        { name: 'right', index: Math.max(0, r), tone: 'warn' as const },
      ],
    };
  };

  steps.push({
    scene: scene(left, right),
    codeLine: 1,
    explain: `Start at both ends. The array is sorted, which is the only reason this works.`,
    vars: { left, right, target },
  });

  while (left < right) {
    const sum = values[left] + values[right];

    steps.push({
      scene: scene(left, right),
      codeLine: 3,
      explain: `${values[left]} + ${values[right]} = ${sum}.`,
      vars: { left, right, sum, target },
    });

    if (sum === target) {
      steps.push({
        scene: scene(left, right, { matched: true }),
        codeLine: 4,
        explain: `Found it: indices ${left} and ${right}. O(n) time and O(1) space — no map needed.`,
        vars: { left, right, sum },
        done: true,
      });
      return cap(steps);
    }

    if (sum < target) {
      steps.push({
        scene: scene(left, right, { dropped: left }),
        codeLine: 5,
        explain: `${sum} < ${target}. Everything to the left of right is ≤ ${values[right]}, so ${values[left]} is too small to pair with ANY remaining value — discard it.`,
        vars: { left: left + 1, right },
      });
      left++;
    } else {
      steps.push({
        scene: scene(left, right, { dropped: right }),
        codeLine: 6,
        explain: `${sum} > ${target}. ${values[right]} is too large to pair with anything from left onwards — discard it.`,
        vars: { left, right: right - 1 },
      });
      right--;
    }
  }

  steps.push({
    scene: scene(left, right),
    codeLine: 8,
    explain: 'The pointers met without finding a pair. Every candidate was eliminated in at most n comparisons.',
    done: true,
  });

  return cap(steps);
};

/** Palindrome check — the same converging shape, a different comparison. */
export const twoPointersPalindrome: Engine = (input) => {
  const source = text(input, 'text', 'racecar');
  const characters = source.split('');
  const steps: Step[] = [];

  let left = 0;
  let right = characters.length - 1;

  const scene = (l: number, r: number, state: CellState) => {
    const cellStates: CellState[] = states(characters.length);
    for (let i = 0; i < l; i++) cellStates[i] = 'visited';
    for (let i = r + 1; i < characters.length; i++) cellStates[i] = 'visited';
    if (l < characters.length) cellStates[l] = state;
    if (r >= 0) cellStates[r] = state;
    return {
      array: { values: characters, states: cellStates, caption: 's', asText: true },
      pointers: [
        { name: 'left', index: Math.max(0, Math.min(l, characters.length - 1)), tone: 'brand' as const },
        { name: 'right', index: Math.max(0, r), tone: 'warn' as const },
      ],
    };
  };

  steps.push({
    scene: scene(left, right, 'active'),
    codeLine: 1,
    explain: 'Compare the outermost pair, then work inwards.',
    vars: { left, right },
  });

  while (left < right) {
    const same = characters[left] === characters[right];
    steps.push({
      scene: scene(left, right, same ? 'match' : 'reject'),
      codeLine: 3,
      explain: same
        ? `'${characters[left]}' matches '${characters[right]}'.`
        : `'${characters[left]}' ≠ '${characters[right]}' — not a palindrome, and we can stop immediately.`,
      vars: { left, right },
    });

    if (!same) {
      steps.push({
        scene: scene(left, right, 'reject'),
        codeLine: 3,
        explain: 'Return false.',
        done: true,
      });
      return cap(steps);
    }

    left++;
    right--;
    if (left < right) {
      steps.push({
        scene: scene(left, right, 'active'),
        codeLine: 5,
        explain: 'Step both pointers inwards.',
        vars: { left, right },
      });
    }
  }

  steps.push({
    scene: scene(left, right, 'match'),
    codeLine: 7,
    explain: `The pointers met with every pair matching: "${source}" is a palindrome. n/2 comparisons, O(1) space.`,
    done: true,
  });

  return cap(steps);
};

/**
 * Same-direction (read/write) pointers: in-place deduplication.
 *
 * `fast` reads everything; `slow` marks where the next kept value belongs. The array is
 * compacted with no extra allocation — which is the entire reason this shape exists.
 */
export const twoPointersSameDirection: Engine = (input) => {
  const values = [...numbers(input, 'array', [1, 1, 2, 2, 2, 3, 4, 4])];
  const steps: Step[] = [];
  let slow = 0;

  const scene = (s: number, f: number, wrote: boolean) => {
    const cellStates: CellState[] = states(values.length);
    for (let i = 0; i <= s; i++) cellStates[i] = 'match';
    for (let i = s + 1; i < f; i++) cellStates[i] = 'reject';
    if (f < values.length) cellStates[f] = 'active';
    if (wrote) cellStates[s] = 'inWindow';
    return {
      array: { values: [...values], states: cellStates, caption: 'nums (kept region highlighted)' },
      pointers: [
        { name: 'slow', index: s, tone: 'good' as const },
        { name: 'fast', index: Math.min(f, values.length - 1), tone: 'brand' as const },
      ],
    };
  };

  steps.push({
    scene: scene(0, 1, false),
    codeLine: 1,
    explain: 'slow marks the last kept element; everything up to and including slow is the answer so far.',
    vars: { slow: 0 },
  });

  for (let fast = 1; fast < values.length; fast++) {
    const duplicate = values[fast] === values[slow];
    steps.push({
      scene: scene(slow, fast, false),
      codeLine: 3,
      explain: duplicate
        ? `nums[${fast}] = ${values[fast]} equals nums[slow] — a duplicate, so skip it. Nothing is written.`
        : `nums[${fast}] = ${values[fast]} is new.`,
      vars: { slow, fast, 'nums[fast]': values[fast] },
    });

    if (!duplicate) {
      slow++;
      values[slow] = values[fast];
      steps.push({
        scene: scene(slow, fast, true),
        codeLine: 5,
        explain: `Write ${values[fast]} into position ${slow}. The kept region grows by one.`,
        vars: { slow, fast },
      });
    }
  }

  steps.push({
    scene: scene(slow, values.length - 1, false),
    codeLine: 8,
    explain: `New length is ${slow + 1}. The first ${slow + 1} slots hold the distinct values — done in place, O(1) extra space.`,
    vars: { length: slow + 1 },
    done: true,
  });

  return cap(steps);
};
