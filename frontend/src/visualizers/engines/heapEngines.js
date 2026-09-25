import { cap, numbers, states } from '../types';
/**
 * Binary heap operations, shown as the array they really are.
 *
 * The array view is the point of the visualisation. A heap is drawn as a tree in textbooks,
 * which hides the single fact that makes it fast: it is a plain array where a node at index i
 * has children at 2i+1 and 2i+2. Nothing is allocated, nothing is linked, and the "tree" is
 * arithmetic on indices.
 */
function parentOf(index) {
    return Math.floor((index - 1) / 2);
}
/** Labels each cell with its index so the 2i+1 / 2i+2 relationship is visible, not asserted. */
function heapLabels(size) {
    return Array.from({ length: size }, (_, index) => String(index));
}
export const heapOps = (input) => {
    const operations = (Array.isArray(input.operations) ? input.operations : []);
    const resolved = operations.length
        ? operations
        : [
            { op: 'insert', value: 5 },
            { op: 'insert', value: 3 },
            { op: 'insert', value: 8 },
            { op: 'insert', value: 1 },
            { op: 'extract' },
            { op: 'extract' },
        ];
    const heap = [];
    const steps = [];
    const snapshot = (explain, codeLine, marked = {}, vars = {}) => {
        const cellStates = states(heap.length);
        for (const [index, state] of Object.entries(marked)) {
            const position = Number(index);
            if (position >= 0 && position < heap.length)
                cellStates[position] = state;
        }
        steps.push({
            scene: {
                array: {
                    values: [...heap],
                    states: cellStates,
                    labels: heapLabels(heap.length),
                    caption: 'min-heap as an array — children of i are at 2i+1 and 2i+2',
                },
            },
            codeLine,
            explain,
            vars: { size: heap.length, ...vars },
        });
    };
    snapshot('An empty min-heap. It is an array; the tree shape is arithmetic on indices.', 1);
    for (const operation of resolved) {
        if (operation.op === 'insert' && operation.value !== undefined) {
            heap.push(operation.value);
            let current = heap.length - 1;
            snapshot(`insert(${operation.value}) — always append at the end first. That keeps the tree complete.`, 2, { [current]: 'active' }, { inserted: operation.value });
            // Sift up: swap with the parent while the heap property is violated.
            while (current > 0) {
                const parent = parentOf(current);
                if (heap[parent] <= heap[current]) {
                    snapshot(`${heap[current]} is not smaller than its parent ${heap[parent]} — the heap property holds, stop.`, 4, { [current]: 'match', [parent]: 'visited' }, { child: current, parent });
                    break;
                }
                snapshot(`${heap[current]} < parent ${heap[parent]} — swap them and keep climbing.`, 5, { [current]: 'active', [parent]: 'target' }, { child: current, parent });
                [heap[current], heap[parent]] = [heap[parent], heap[current]];
                current = parent;
            }
            if (current === 0) {
                snapshot('Reached the root — nothing above it to compare against.', 6, { 0: 'match' });
            }
        }
        if (operation.op === 'extract') {
            if (heap.length === 0) {
                snapshot('extractMin() on an empty heap — check isEmpty() first.', 8);
                continue;
            }
            const minimum = heap[0];
            snapshot(`extractMin() → ${minimum}. The root is always the smallest; that is the whole guarantee a heap gives.`, 8, { 0: 'match' }, { min: minimum });
            const last = heap.pop();
            if (heap.length > 0) {
                heap[0] = last;
                snapshot(`Move the last element (${last}) to the root, so the tree stays complete. Now it is almost certainly in the wrong place.`, 9, { 0: 'active' });
                // Sift down: swap with the smaller child while it is smaller than the node.
                let current = 0;
                for (;;) {
                    const left = 2 * current + 1;
                    const right = 2 * current + 2;
                    let smallest = current;
                    if (left < heap.length && heap[left] < heap[smallest])
                        smallest = left;
                    if (right < heap.length && heap[right] < heap[smallest])
                        smallest = right;
                    if (smallest === current) {
                        snapshot(`${heap[current]} is smaller than both children — the heap property is restored.`, 12, { [current]: 'match' }, { at: current });
                        break;
                    }
                    snapshot(`Swap with the smaller child ${heap[smallest]}. Always the smaller one — swapping with the larger would break the other subtree.`, 11, { [current]: 'active', [smallest]: 'target' }, { at: current, swapWith: smallest });
                    [heap[current], heap[smallest]] = [heap[smallest], heap[current]];
                    current = smallest;
                }
            }
        }
    }
    steps.push({
        ...steps[steps.length - 1],
        explain: `Done. Every insert and extract touched at most log₂(n) levels — that is the O(log n).`,
        done: true,
    });
    return cap(steps);
};
/**
 * Top-K with a heap of size k.
 *
 * The teaching point is the inversion that beginners find backwards: to keep the k *largest*
 * values you use a **min**-heap, because the thing you need cheap access to is the weakest
 * survivor — the one to evict.
 */
export const topKHeap = (input) => {
    const values = numbers(input, 'array', [4, 1, 7, 3, 9, 2, 8]);
    const k = Math.max(1, Math.min(numbers(input, 'array', values).length, input.k ?? 3));
    const heap = [];
    const steps = [];
    const snapshot = (explain, codeLine, index, heapState = 'inWindow') => {
        const cellStates = states(values.length);
        for (let i = 0; i < index; i++)
            cellStates[i] = 'visited';
        if (index >= 0 && index < values.length)
            cellStates[index] = 'active';
        steps.push({
            scene: {
                array: { values, states: cellStates, caption: 'input' },
                secondaryArray: {
                    values: [...heap],
                    states: states(heap.length, heapState),
                    caption: `min-heap of the ${k} largest so far — root is the weakest survivor`,
                },
            },
            codeLine,
            explain,
            vars: { k, heapSize: heap.length, smallestKept: heap[0] ?? '—' },
        });
    };
    const siftUp = () => {
        let current = heap.length - 1;
        while (current > 0 && heap[parentOf(current)] > heap[current]) {
            const parent = parentOf(current);
            [heap[current], heap[parent]] = [heap[parent], heap[current]];
            current = parent;
        }
    };
    const siftDown = () => {
        let current = 0;
        for (;;) {
            const left = 2 * current + 1;
            const right = 2 * current + 2;
            let smallest = current;
            if (left < heap.length && heap[left] < heap[smallest])
                smallest = left;
            if (right < heap.length && heap[right] < heap[smallest])
                smallest = right;
            if (smallest === current)
                return;
            [heap[current], heap[smallest]] = [heap[smallest], heap[current]];
            current = smallest;
        }
    };
    snapshot(`Find the ${k} largest values without sorting all ${values.length}.`, 1, -1);
    for (let index = 0; index < values.length; index++) {
        const value = values[index];
        if (heap.length < k) {
            heap.push(value);
            siftUp();
            snapshot(`Heap is not full yet — keep ${value}.`, 3, index);
            continue;
        }
        if (value > heap[0]) {
            const evicted = heap[0];
            heap[0] = value;
            siftDown();
            snapshot(`${value} beats the weakest survivor ${evicted} — evict ${evicted}, keep ${value}.`, 5, index);
        }
        else {
            snapshot(`${value} is not larger than the weakest survivor ${heap[0]} — it cannot be in the top ${k}. Discard it.`, 7, index, 'reject');
        }
    }
    steps.push({
        ...steps[steps.length - 1],
        explain: `The heap holds the ${k} largest: ${[...heap].sort((a, b) => b - a).join(', ')}. Cost was O(n log k), not O(n log n).`,
        done: true,
    });
    return cap(steps);
};
