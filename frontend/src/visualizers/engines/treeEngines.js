import { cap, text } from '../types';
const DEFAULT_TREE = {
    value: 10,
    left: { value: 5, left: { value: 2 }, right: { value: 7 } },
    right: { value: 15, right: { value: 20 } },
};
function idFor(path) {
    return path.length === 0 ? 'root' : path;
}
/** Convert the authored tree into a view tree, with a state lookup applied. */
function toView(node, path, marks) {
    if (!node)
        return null;
    const id = idFor(path);
    return {
        id,
        value: node.value,
        state: marks.get(id) ?? 'idle',
        left: toView(node.left, `${path}L`, marks),
        right: toView(node.right, `${path}R`, marks),
    };
}
/**
 * The four traversals over one tree.
 *
 * The only difference between pre-, in- and post-order is WHERE the visit sits relative to
 * the two recursive calls — the animation makes that concrete by showing the call stack
 * alongside the tree. Level order is the odd one out: a queue, not recursion.
 */
export const treeTraversal = (input) => {
    const tree = input.tree ?? DEFAULT_TREE;
    const order = text(input, 'order', 'inorder');
    const steps = [];
    const marks = new Map();
    const output = [];
    const frames = [];
    const snapshot = (explain, codeLine, vars) => {
        steps.push({
            scene: {
                tree: toView(tree, '', marks),
                frames: order === 'levelorder' ? undefined : { frames: frames.map((f) => ({ ...f })), caption: 'call stack' },
                queue: order === 'levelorder' ? { items: [...queue.map((q) => q.node.value)], caption: 'queue' } : undefined,
                output: [...output],
            },
            codeLine,
            explain,
            vars,
        });
    };
    const queue = [];
    if (order === 'levelorder') {
        queue.push({ node: tree, path: '' });
        marks.set('root', 'active');
        snapshot('Breadth-first: start with the root in the queue.', undefined, { queued: 1 });
        let depth = 0;
        while (queue.length > 0) {
            const levelSize = queue.length;
            snapshot(`Level ${depth}: freeze the queue size at ${levelSize}. That is exactly the number of nodes at this depth — the trick that separates one level from the next.`, undefined, { level: depth, levelSize });
            for (let i = 0; i < levelSize; i++) {
                const { node, path } = queue.shift();
                marks.set(idFor(path), 'match');
                output.push(String(node.value));
                snapshot(`Visit ${node.value}.`, undefined, { level: depth, visited: output.length });
                if (node.left) {
                    queue.push({ node: node.left, path: `${path}L` });
                    marks.set(idFor(`${path}L`), 'inWindow');
                }
                if (node.right) {
                    queue.push({ node: node.right, path: `${path}R` });
                    marks.set(idFor(`${path}R`), 'inWindow');
                }
            }
            depth++;
        }
        steps.push({
            scene: { tree: toView(tree, '', marks), output: [...output] },
            explain: `Level order: ${output.join(' → ')}. Memory cost is the WIDEST level, which for a balanced tree is about n/2 — more than DFS, not less.`,
            done: true,
        });
        return cap(steps);
    }
    const walk = (node, path) => {
        if (!node) {
            snapshot('null — nothing to do, return immediately. Every tree recursion starts with this base case.', 2);
            return;
        }
        const id = idFor(path);
        frames.push({ label: `visit(${node.value})`, state: 'active' });
        marks.set(id, 'active');
        snapshot(`Enter node ${node.value}. A new stack frame is pushed — the stack depth is the tree height, which is the real space cost.`, 1, { depth: frames.length });
        if (order === 'preorder') {
            output.push(String(node.value));
            marks.set(id, 'match');
            snapshot(`Pre-order visits BEFORE the children: record ${node.value} now.`, 4, { output: output.length });
        }
        walk(node.left, `${path}L`);
        if (order === 'inorder') {
            output.push(String(node.value));
            marks.set(id, 'match');
            snapshot(`In-order visits BETWEEN the children: record ${node.value}. In a BST this produces sorted output.`, 4, { output: output.length });
        }
        walk(node.right, `${path}R`);
        if (order === 'postorder') {
            output.push(String(node.value));
            marks.set(id, 'match');
            snapshot(`Post-order visits AFTER the children: record ${node.value}. This is the shape for anything computed bottom-up, like height.`, 4, { output: output.length });
        }
        frames.pop();
        marks.set(id, 'visited');
        snapshot(`Node ${node.value} is finished; its frame pops off the stack.`, 6, { depth: frames.length });
    };
    walk(tree, '');
    steps.push({
        scene: { tree: toView(tree, '', marks), output: [...output] },
        explain: `${order}: ${output.join(' → ')}. Every node was visited exactly once — O(n) time, O(height) stack.`,
        done: true,
    });
    return cap(steps);
};
/**
 * BST search and insert.
 *
 * Each comparison eliminates an entire subtree — the tree version of binary search. The
 * animation greys out what has just been discarded, so the halving is visible rather than
 * asserted.
 */
export const bstOps = (input) => {
    const tree = structuredClone(input.tree ?? DEFAULT_TREE);
    // An engine must always produce at least one step, so fall back to a representative search.
    const operations = (Array.isArray(input.operations) && input.operations.length > 0
        ? input.operations
        : [{ op: 'search', value: 7 }]);
    const steps = [];
    const markSubtree = (node, path, marks, state) => {
        if (!node)
            return;
        marks.set(idFor(path), state);
        markSubtree(node.left, `${path}L`, marks, state);
        markSubtree(node.right, `${path}R`, marks, state);
    };
    const countNodes = (node) => node ? 1 + countNodes(node.left) + countNodes(node.right) : 0;
    for (const operation of operations) {
        const marks = new Map();
        let node = tree;
        let path = '';
        let comparisons = 0;
        steps.push({
            scene: { tree: toView(tree, '', marks) },
            codeLine: 1,
            explain: `${operation.op === 'search' ? 'Searching for' : 'Inserting'} ${operation.value}. Start at the root.`,
            vars: { target: operation.value, comparisons },
        });
        while (node) {
            comparisons++;
            marks.set(idFor(path), 'active');
            if (node.value === operation.value) {
                marks.set(idFor(path), 'match');
                steps.push({
                    scene: { tree: toView(tree, '', marks) },
                    codeLine: 2,
                    explain: operation.op === 'search'
                        ? `Found ${operation.value} after ${comparisons} comparisons.`
                        : `${operation.value} is already present — decide and state your duplicate policy.`,
                    vars: { comparisons },
                });
                break;
            }
            const goLeft = operation.value < node.value;
            const discarded = countNodes(goLeft ? node.right : node.left);
            markSubtree(goLeft ? node.right : node.left, goLeft ? `${path}R` : `${path}L`, marks, 'reject');
            steps.push({
                scene: { tree: toView(tree, '', marks) },
                codeLine: goLeft ? 3 : 4,
                explain: `${operation.value} ${goLeft ? '<' : '>'} ${node.value}, so go ${goLeft ? 'left' : 'right'} — and the entire ${goLeft ? 'right' : 'left'} subtree (${discarded} node${discarded === 1 ? '' : 's'}) is eliminated by that single comparison.`,
                vars: { at: node.value, comparisons, eliminated: discarded },
            });
            const next = goLeft ? node.left : node.right;
            if (!next && operation.op === 'insert') {
                const fresh = { value: operation.value };
                if (goLeft)
                    node.left = fresh;
                else
                    node.right = fresh;
                marks.set(idFor(goLeft ? `${path}L` : `${path}R`), 'match');
                steps.push({
                    scene: { tree: toView(tree, '', marks) },
                    codeLine: 4,
                    explain: `We fell off the tree, so ${operation.value} is attached here. Insertion is O(h) — the same descent as a search.`,
                    vars: { comparisons },
                });
                break;
            }
            if (!next) {
                steps.push({
                    scene: { tree: toView(tree, '', marks) },
                    codeLine: 2,
                    explain: `We reached a null child without finding ${operation.value}, so it is not in the tree. ${comparisons} comparisons — and note how few nodes were ever examined.`,
                    vars: { comparisons },
                });
                break;
            }
            path = goLeft ? `${path}L` : `${path}R`;
            node = next;
        }
    }
    steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        done: true,
        explain: `${steps[steps.length - 1].explain} Every operation costs O(h) — log n while the tree is balanced, n if it has degenerated into a chain.`,
    };
    return cap(steps);
};
