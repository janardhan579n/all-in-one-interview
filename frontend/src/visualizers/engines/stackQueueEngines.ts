import { cap, num, text, type CellValue, type Engine, type Step } from '../types';

interface StackOperation {
  op: 'push' | 'pop' | 'peek';
  value?: CellValue;
}

/** push / pop / peek — every operation touches one end only, which is why all three are O(1). */
export const stackOps: Engine = (input) => {
  const operations = (Array.isArray(input.operations) ? input.operations : []) as StackOperation[];
  const steps: Step[] = [];
  const items: CellValue[] = [];

  steps.push({
    scene: { stack: { items: [], caption: 'stack (top at the front)' } },
    codeLine: 1,
    explain: 'An empty stack. Use ArrayDeque — java.util.Stack extends Vector and is synchronised legacy.',
    vars: { size: 0 },
  });

  for (const operation of operations) {
    if (operation.op === 'push' && operation.value !== undefined) {
      items.push(operation.value);
      steps.push({
        scene: { stack: { items: [...items], caption: 'push' } },
        codeLine: 2,
        explain: `push(${operation.value}) — placed on top. Nothing below it moves, so this is O(1).`,
        vars: { top: operation.value, size: items.length },
      });
    }

    if (operation.op === 'peek') {
      steps.push({
        scene: { stack: { items: [...items], caption: 'peek' } },
        codeLine: 3,
        explain: items.length
          ? `peek() → ${items[items.length - 1]}. Look without removing.`
          : 'peek() on an empty stack — check isEmpty() first, or this throws.',
        vars: { top: items[items.length - 1] ?? 'empty' },
      });
    }

    if (operation.op === 'pop') {
      const removed = items.pop();
      steps.push({
        scene: { stack: { items: [...items], caption: 'pop' } },
        codeLine: 4,
        explain: removed !== undefined
          ? `pop() → ${removed}. The last thing in is the first thing out.`
          : 'pop() on an empty stack throws — this is the check people forget.',
        vars: { popped: removed ?? 'error', size: items.length },
      });
    }
  }

  steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
  return cap(steps);
};

/**
 * Balanced brackets.
 *
 * Pushing the EXPECTED closer rather than the opener makes the comparison a single equality
 * check. Both failure modes are shown: a closer arriving at an empty stack, and openers left
 * over at the end.
 */
export const balancedBrackets: Engine = (input) => {
  const source = text(input, 'text', '{[()]}');
  const characters = source.split('');
  const steps: Step[] = [];
  const stack: CellValue[] = [];
  const expected: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

  const scene = (index: number, state: 'active' | 'match' | 'reject') => ({
    array: {
      values: characters,
      states: characters.map((_, i) => (i < index ? 'visited' : i === index ? state : 'idle')) as never,
      caption: 'input',
      asText: true,
    },
    stack: { items: [...stack], caption: 'stack of expected closers' },
  });

  steps.push({
    scene: scene(-1, 'active'),
    codeLine: 1,
    explain: 'An empty stack. A closing bracket may only match the MOST RECENT unmatched opener — that is LIFO.',
    vars: { depth: 0 },
  });

  for (let i = 0; i < characters.length; i++) {
    const c = characters[i];

    if (expected[c]) {
      stack.push(expected[c]);
      steps.push({
        scene: scene(i, 'active'),
        codeLine: 3,
        explain: `'${c}' opens. Push what we now EXPECT to see: '${expected[c]}'.`,
        vars: { depth: stack.length, expecting: expected[c] },
      });
    } else {
      if (stack.length === 0) {
        steps.push({
          scene: scene(i, 'reject'),
          codeLine: 6,
          explain: `'${c}' closes something that was never opened — the stack is empty. Invalid. (Popping without this check is a crash.)`,
          done: true,
        });
        return cap(steps);
      }
      const wanted = stack.pop();
      if (wanted !== c) {
        steps.push({
          scene: scene(i, 'reject'),
          codeLine: 6,
          explain: `Expected '${wanted}' but found '${c}' — wrong type, so the nesting is invalid. Note that counting brackets would have accepted this.`,
          done: true,
        });
        return cap(steps);
      }
      steps.push({
        scene: scene(i, 'match'),
        codeLine: 6,
        explain: `'${c}' matches the expected '${wanted}'. Pop it.`,
        vars: { depth: stack.length },
      });
    }
  }

  steps.push({
    scene: scene(characters.length, stack.length === 0 ? 'match' : 'reject'),
    codeLine: 8,
    explain:
      stack.length === 0
        ? 'The stack is empty at the end, so everything opened was closed. Valid.'
        : `${stack.length} opener(s) were never closed. Invalid — this final check is the one people forget.`,
    vars: { leftover: stack.length },
    done: true,
  });

  return cap(steps);
};

interface QueueOperation {
  op: 'enqueue' | 'dequeue' | 'peek';
  value?: CellValue;
}

/** enqueue / dequeue / peek — add at the back, take from the front. */
export const queueOps: Engine = (input) => {
  const operations = (Array.isArray(input.operations) ? input.operations : []) as QueueOperation[];
  const steps: Step[] = [];
  const items: CellValue[] = [];

  steps.push({
    scene: { queue: { items: [], caption: 'front → … → rear' } },
    codeLine: 1,
    explain: 'An empty queue. First in, first out — the fairness rule.',
    vars: { size: 0 },
  });

  for (const operation of operations) {
    if (operation.op === 'enqueue' && operation.value !== undefined) {
      items.push(operation.value);
      steps.push({
        scene: { queue: { items: [...items], caption: 'enqueue at the rear' } },
        codeLine: 2,
        explain: `offer(${operation.value}) — joins the back of the queue.`,
        vars: { rear: operation.value, size: items.length },
      });
    }

    if (operation.op === 'peek') {
      steps.push({
        scene: { queue: { items: [...items], caption: 'peek at the front' } },
        codeLine: 3,
        explain: items.length ? `peek() → ${items[0]} — the one waiting longest.` : 'peek() on an empty queue returns null.',
        vars: { front: items[0] ?? 'empty' },
      });
    }

    if (operation.op === 'dequeue') {
      const removed = items.shift();
      steps.push({
        scene: { queue: { items: [...items], caption: 'dequeue from the front' } },
        codeLine: 4,
        explain: removed !== undefined
          ? `poll() → ${removed}. Note what did NOT happen: no elements were shifted. A circular buffer moves an index instead.`
          : 'poll() on an empty queue returns null.',
        vars: { polled: removed ?? 'null', size: items.length },
      });
    }
  }

  steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
  return cap(steps);
};

/**
 * The circular buffer that makes both ends O(1).
 *
 * The naive "remove from index 0 and shift" implementation is O(n) per dequeue and silently
 * turns an O(n) BFS into O(n²). Watch head and tail wrap with modulo instead.
 */
export const circularQueue: Engine = (input) => {
  const capacity = num(input, 'capacity', 5);
  const operations = (Array.isArray(input.operations) ? input.operations : []) as QueueOperation[];
  const steps: Step[] = [];

  const slots: CellValue[] = Array.from({ length: capacity }, () => '');
  let head = 0;
  let tail = 0;
  let size = 0;

  const scene = (caption: string) => ({
    queue: { items: [...slots], head, tail, capacity, caption },
  });

  steps.push({
    scene: scene(`fixed array of ${capacity} slots`),
    explain: 'head and tail are indices into a fixed array. Nothing ever moves — only the indices do.',
    vars: { head, tail, size },
  });

  for (const operation of operations) {
    if (operation.op === 'enqueue' && operation.value !== undefined) {
      if (size === capacity) {
        steps.push({
          scene: scene('full'),
          explain: `The buffer is full (${size}/${capacity}) — enqueue would overwrite unread data, so it is rejected.`,
          vars: { head, tail, size },
        });
        continue;
      }
      slots[tail] = operation.value;
      const previousTail = tail;
      tail = (tail + 1) % capacity;
      size++;
      steps.push({
        scene: scene('enqueue'),
        codeLine: 3,
        explain:
          tail === 0 && previousTail === capacity - 1
            ? `Wrote to slot ${previousTail}, then tail wrapped from ${previousTail} back to 0 — that modulo is the whole trick.`
            : `Wrote ${operation.value} to slot ${previousTail}; tail moves to ${tail}.`,
        vars: { head, tail, size },
      });
    }

    if (operation.op === 'dequeue') {
      if (size === 0) {
        steps.push({ scene: scene('empty'), explain: 'Nothing to dequeue.', vars: { head, tail, size } });
        continue;
      }
      const value = slots[head];
      slots[head] = '';
      const previousHead = head;
      head = (head + 1) % capacity;
      size--;
      steps.push({
        scene: scene('dequeue'),
        codeLine: 9,
        explain: `Read ${value} from slot ${previousHead}; head moves to ${head}. No element was copied — contrast this with ArrayList.remove(0), which shifts everything.`,
        vars: { head, tail, size, polled: value },
      });
    }
  }

  steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
  return cap(steps);
};
