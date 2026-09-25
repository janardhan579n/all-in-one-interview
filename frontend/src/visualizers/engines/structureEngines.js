import { cap, states, text } from '../types';
function makeNode(id, char) {
    return { id, char, children: new Map(), terminal: false };
}
/**
 * Lays the trie out as a graph: depth across, siblings down.
 *
 * The first version of this reused the binary-tree renderer via the left-child/right-sibling
 * encoding. It drew *something*, but it taught the wrong thing — a sibling link was drawn
 * identically to a parent link, so "cat" and "car" read as a chain rather than as two words
 * sharing a prefix, which is the one idea the picture exists to convey. Explicit coordinates
 * cost twenty lines and say what a trie actually is.
 */
function layout(root) {
    const nodes = [];
    const edges = [];
    let row = 0;
    const walk = (node, depth) => {
        const children = [...node.children.values()];
        let y;
        if (children.length === 0) {
            y = 40 + row * 52;
            row += 1;
        }
        else {
            // A parent sits level with the middle of the block its children occupy, so the shared
            // prefix visibly branches rather than hanging off one side.
            const childYs = children.map((child) => walk(child, depth + 1));
            y = childYs.reduce((sum, value) => sum + value, 0) / childYs.length;
        }
        nodes.push({
            id: node.id,
            label: node.char === '' ? 'root' : node.char + (node.terminal ? ' ●' : ''),
            x: 60 + depth * 96,
            y,
            state: node.state,
        });
        for (const child of children) {
            edges.push({ from: node.id, to: child.id, label: child.char, state: child.state === 'active' ? 'active' : 'idle' });
        }
        return y;
    };
    walk(root, 0);
    return { nodes, edges, directed: true, caption: 'a filled dot marks the end of a stored word' };
}
function clearStates(node) {
    node.state = undefined;
    node.children.forEach(clearStates);
}
export const trieOps = (input) => {
    const words = (Array.isArray(input.words) ? input.words : ['cat', 'car', 'card', 'dog']);
    const lookup = text(input, 'search', 'car');
    const prefix = text(input, 'prefix', 'ca');
    const root = makeNode('root', '');
    const steps = [];
    let counter = 0;
    const snapshot = (explain, codeLine, vars = {}) => {
        steps.push({
            scene: { graph: layout(root), output: [...words] },
            codeLine,
            explain,
            vars,
        });
    };
    snapshot('An empty trie: just a root holding no character.', 1);
    for (const word of words) {
        let node = root;
        clearStates(root);
        for (const char of word) {
            const existing = node.children.get(char);
            if (existing) {
                node = existing;
                node.state = 'inWindow';
                snapshot(`"${char}" already exists on this path — reuse it. This sharing is the entire reason a trie saves space.`, 3, { word, char, reused: 'yes' });
            }
            else {
                counter += 1;
                const created = makeNode(`n${counter}`, char);
                node.children.set(char, created);
                node = created;
                node.state = 'active';
                snapshot(`"${char}" is new on this path — create a node.`, 4, { word, char, reused: 'no' });
            }
        }
        node.terminal = true;
        node.state = 'match';
        snapshot(`Mark the end of "${word}". Without this flag you could not tell a whole word from a prefix of one.`, 5, { word, inserted: word });
    }
    // --- search: walking a word costs its own length, regardless of how many words are stored ---
    clearStates(root);
    let node = root;
    let matched = '';
    for (const char of lookup) {
        node = node?.children.get(char) ?? null;
        if (!node) {
            snapshot(`search("${lookup}") — no child for "${char}" after "${matched}". The word is not here, and we knew after ${matched.length + 1} characters.`, 8, { search: lookup, result: 'absent' });
            break;
        }
        matched += char;
        node.state = 'active';
        snapshot(`Follow "${char}" — matched "${matched}" so far.`, 8, { search: lookup, matched });
    }
    if (node) {
        node.state = node.terminal ? 'match' : 'reject';
        snapshot(node.terminal
            ? `"${lookup}" is present — the node is marked terminal. Cost was ${lookup.length} steps, not a scan of every word.`
            : `"${lookup}" is only a prefix here, not a stored word — the node is not terminal.`, 9, { search: lookup, result: node.terminal ? 'found' : 'prefix only' });
    }
    // --- prefix query: the operation a hash map cannot do at all ---
    clearStates(root);
    let cursor = root;
    for (const char of prefix) {
        cursor = cursor?.children.get(char) ?? null;
        if (cursor)
            cursor.state = 'inWindow';
    }
    if (cursor) {
        const collected = [];
        const walk = (current, built) => {
            current.state = current.state ?? 'visited';
            if (current.terminal)
                collected.push(built);
            current.children.forEach((child, char) => walk(child, built + char));
        };
        walk(cursor, prefix);
        steps.push({
            scene: { graph: layout(root), output: collected },
            codeLine: 12,
            explain: `startsWith("${prefix}") → ${collected.join(', ')}. This is what a trie is for: a HashMap can tell you whether a key exists, but it cannot enumerate everything that begins with "${prefix}" without scanning every key.`,
            vars: { prefix, matches: collected.length },
            done: true,
        });
    }
    return cap(steps);
};
/**
 * Union-find with path compression, drawn as the parent array.
 *
 * Showing `parent[]` rather than a picture of trees is deliberate: the "forest" is a mental
 * model, the array is the data structure, and path compression is visibly an edit to that array.
 */
export const unionFind = (input) => {
    const size = typeof input.size === 'number' ? input.size : 6;
    const operations = (Array.isArray(input.operations) ? input.operations : []);
    const resolved = operations.length
        ? operations
        : [
            { op: 'union', a: 0, b: 1 },
            { op: 'union', a: 2, b: 3 },
            { op: 'union', a: 1, b: 2 },
            { op: 'find', a: 3 },
            { op: 'union', a: 4, b: 5 },
        ];
    const parent = Array.from({ length: size }, (_, i) => i);
    const rank = Array.from({ length: size }, () => 0);
    const steps = [];
    const snapshot = (explain, codeLine, marked = {}, vars = {}) => {
        const cellStates = states(size);
        for (const [index, state] of Object.entries(marked))
            cellStates[Number(index)] = state;
        const groups = new Map();
        for (let i = 0; i < size; i++) {
            let root = i;
            while (parent[root] !== root)
                root = parent[root];
            groups.set(root, [...(groups.get(root) ?? []), i]);
        }
        steps.push({
            scene: {
                array: {
                    values: [...parent],
                    states: cellStates,
                    labels: Array.from({ length: size }, (_, i) => String(i)),
                    caption: 'parent[i] — a node pointing at itself is a root',
                },
                output: [...groups.values()].map((group) => `{${group.join(', ')}}`),
            },
            codeLine,
            explain,
            vars,
        });
    };
    const find = (node, codeLine) => {
        const path = [];
        let current = node;
        while (parent[current] !== current) {
            path.push(current);
            current = parent[current];
        }
        if (path.length > 0) {
            snapshot(`find(${node}) walked ${path.length} link(s) up to root ${current}.`, codeLine, Object.fromEntries([...path.map((p) => [p, 'active']), [current, 'match']]), { find: node, root: current, hops: path.length });
            for (const item of path)
                parent[item] = current;
            snapshot(`Path compression: every node on that walk now points straight at ${current}. The next find is one hop — this is why the amortised cost is effectively constant.`, codeLine + 1, Object.fromEntries([...path.map((p) => [p, 'visited']), [current, 'match']]), { compressed: path.length });
        }
        return current;
    };
    snapshot('Every element starts in its own set, pointing at itself.', 1);
    for (const operation of resolved) {
        if (operation.op === 'find') {
            const root = find(operation.a, 4);
            snapshot(`find(${operation.a}) → ${root}.`, 6, { [operation.a]: 'active', [root]: 'match' }, { root });
            continue;
        }
        if (operation.b === undefined)
            continue;
        const rootA = find(operation.a, 4);
        const rootB = find(operation.b, 4);
        if (rootA === rootB) {
            snapshot(`union(${operation.a}, ${operation.b}) — already in the same set (both reach ${rootA}). Nothing to do. In cycle detection, this is exactly the moment you have found a cycle.`, 8, { [rootA]: 'match' });
            continue;
        }
        // Union by rank: hang the shorter tree under the taller one, or trees grow into linked lists.
        let winner = rootA;
        let loser = rootB;
        if (rank[rootA] < rank[rootB]) {
            winner = rootB;
            loser = rootA;
        }
        parent[loser] = winner;
        if (rank[winner] === rank[loser])
            rank[winner] += 1;
        snapshot(`union(${operation.a}, ${operation.b}) — hang root ${loser} under root ${winner}. By rank, so the shallower tree goes underneath and depth barely grows.`, 10, { [winner]: 'match', [loser]: 'target' }, { merged: `${loser} → ${winner}` });
    }
    steps.push({ ...steps[steps.length - 1], explain: 'Done — the groups below are the connected components.', done: true });
    return cap(steps);
};
/* ----------------------------------------------------------- monotonic stack */
/**
 * Next greater element with a monotonic decreasing stack.
 *
 * The insight to make visible is the discard: when a bigger value arrives, everything smaller
 * still waiting can never be anyone's answer again, so it leaves the stack permanently. That is
 * why the loop looks quadratic and is linear — each index is pushed once and popped once.
 */
export const monotonicStack = (input) => {
    const values = (Array.isArray(input.array) && input.array.every((v) => typeof v === 'number')
        ? input.array
        : [2, 1, 2, 4, 3]);
    const result = Array.from({ length: values.length }, () => -1);
    const stack = [];
    const steps = [];
    let pops = 0;
    const snapshot = (explain, codeLine, index, vars = {}) => {
        const cellStates = states(values.length);
        for (const position of stack)
            cellStates[position] = 'inWindow';
        for (let i = 0; i < values.length; i++)
            if (result[i] !== -1)
                cellStates[i] = 'visited';
        if (index >= 0 && index < values.length)
            cellStates[index] = 'active';
        steps.push({
            scene: {
                array: { values, states: cellStates, caption: 'input — highlighted cells are waiting on the stack' },
                secondaryArray: {
                    values: [...result],
                    states: result.map((value) => (value === -1 ? 'idle' : 'match')),
                    caption: 'next greater element (-1 = none yet)',
                },
                stack: { items: stack.map((i) => `i=${i} (${values[i]})`), caption: 'indices waiting for an answer' },
            },
            codeLine,
            explain,
            vars: { totalPops: pops, ...vars },
        });
    };
    snapshot('For each element, find the next element to its right that is larger.', 1, -1);
    for (let index = 0; index < values.length; index++) {
        snapshot(`Look at ${values[index]}.`, 2, index, { value: values[index] });
        while (stack.length > 0 && values[stack[stack.length - 1]] < values[index]) {
            const waiting = stack.pop();
            pops += 1;
            result[waiting] = values[index];
            snapshot(`${values[index]} is greater than the waiting ${values[waiting]} — that is its answer. Pop it; it will never be asked about again.`, 4, index, { resolved: `index ${waiting} → ${values[index]}` });
        }
        stack.push(index);
        snapshot(`Push ${values[index]} and wait. The stack is now decreasing from bottom to top — anything smaller was discarded, because a bigger value standing in front of it makes it useless to everyone further right.`, 6, index);
    }
    snapshot(`Anything still on the stack has no greater element to its right — it stays -1. Each index was pushed once and popped at most once: ${values.length} pushes, ${pops} pops. That is the O(n), despite the nested loop.`, 8, -1);
    steps[steps.length - 1].done = true;
    return cap(steps);
};
