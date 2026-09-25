import { cap, text } from '../types';
function readNodes(input) {
    const raw = input.nodes;
    if (Array.isArray(raw) && raw.every((n) => typeof n === 'string'))
        return raw;
    return ['A', 'B', 'C', 'D', 'E', 'F'];
}
function readEdges(input) {
    const raw = input.edges;
    if (!Array.isArray(raw))
        return [];
    return raw.map((edge) => Array.isArray(edge) ? { from: edge[0], to: edge[1] } : edge);
}
/**
 * Circular layout. Deliberately simple and deterministic: a force-directed layout would look
 * nicer but move between steps, and a diagram that shifts under the learner while they follow
 * an algorithm is worse than one that is merely tidy.
 */
function layout(nodes) {
    const positions = {};
    const radius = nodes.length <= 4 ? 150 : 200;
    nodes.forEach((id, index) => {
        const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
        positions[id] = {
            x: 300 + radius * Math.cos(angle),
            y: 230 + radius * Math.sin(angle),
        };
    });
    return positions;
}
function adjacency(nodes, edges, directed) {
    const map = new Map(nodes.map((id) => [id, []]));
    edges.forEach(({ from, to }) => {
        map.get(from)?.push(to);
        if (!directed)
            map.get(to)?.push(from);
    });
    return map;
}
function graphPanel(nodes, edges, positions, marks, edgeMarks, directed, caption) {
    return {
        nodes: nodes.map((id) => ({ id, label: id, ...positions[id], state: marks.get(id) ?? 'idle' })),
        edges: edges.map((edge) => ({
            ...edge,
            state: edgeMarks.get(`${edge.from}->${edge.to}`) ?? edgeMarks.get(`${edge.to}->${edge.from}`) ?? 'idle',
        })),
        directed,
        caption,
    };
}
/** The same graph shown three ways: picture, adjacency list, adjacency matrix. */
export const graphRepresentation = (input) => {
    const nodes = readNodes(input);
    const edges = readEdges(input);
    const directed = input.directed === true;
    const positions = layout(nodes);
    const steps = [];
    const marks = new Map();
    const edgeMarks = new Map();
    const adjacencyRows = nodes.map((id) => [id, '']);
    const matrix = nodes.map(() => nodes.map(() => 0));
    steps.push({
        scene: {
            graph: graphPanel(nodes, edges, positions, marks, edgeMarks, directed, 'the graph'),
            table: { columns: ['node', 'neighbours'], rows: adjacencyRows.map((r) => [...r]), cursor: null, caption: 'adjacency list' },
        },
        codeLine: 2,
        explain: `${nodes.length} vertices and ${edges.length} edges. Nothing about the shape is constrained — that is the only difference from a tree, and it is why graph traversal needs a visited set.`,
        vars: { V: nodes.length, E: edges.length },
    });
    edges.forEach((edge, index) => {
        edgeMarks.clear();
        edgeMarks.set(`${edge.from}->${edge.to}`, 'active');
        const fromIndex = nodes.indexOf(edge.from);
        const toIndex = nodes.indexOf(edge.to);
        matrix[fromIndex][toIndex] = 1;
        if (!directed)
            matrix[toIndex][fromIndex] = 1;
        const appendTo = (nodeIndex, neighbour) => {
            const current = String(adjacencyRows[nodeIndex][1]);
            adjacencyRows[nodeIndex][1] = current ? `${current}, ${neighbour}` : neighbour;
        };
        appendTo(fromIndex, edge.to);
        if (!directed)
            appendTo(toIndex, edge.from);
        steps.push({
            scene: {
                graph: graphPanel(nodes, edges, positions, marks, edgeMarks, directed, 'the graph'),
                table: { columns: ['node', 'neighbours'], rows: adjacencyRows.map((r) => [...r]), cursor: [fromIndex, 1], caption: 'adjacency list' },
                grid: { cells: matrix.map((row) => [...row]), caption: `adjacency matrix (${nodes.length}² = ${nodes.length * nodes.length} cells for ${edges.length} edges)` },
            },
            codeLine: index === 0 ? 3 : 7,
            explain: `Edge ${edge.from}–${edge.to}. The list stores ${directed ? 'one entry' : 'two entries — one per direction'}; the matrix flips ${directed ? 'one cell' : 'two cells'}.`,
            vars: { edges: index + 1 },
        });
    });
    steps.push({
        scene: {
            graph: graphPanel(nodes, edges, positions, marks, new Map(), directed, 'the graph'),
            table: { columns: ['node', 'neighbours'], rows: adjacencyRows.map((r) => [...r]), cursor: null, caption: 'adjacency list' },
            grid: { cells: matrix.map((row) => [...row]), caption: 'adjacency matrix' },
        },
        explain: `List: ${nodes.length + edges.length * (directed ? 1 : 2)} entries. Matrix: ${nodes.length * nodes.length} cells, mostly zeros. Real graphs are sparse, which is why the list is the default — a billion-user social graph would need 10¹⁸ matrix cells.`,
        done: true,
    });
    return cap(steps);
};
/** Counting connected components: each fresh start is a new region. */
export const connectedComponents = (input) => {
    const nodes = readNodes(input);
    const edges = readEdges(input);
    const positions = layout(nodes);
    const adjacent = adjacency(nodes, edges, false);
    const steps = [];
    const marks = new Map();
    const edgeMarks = new Map();
    const visited = new Set();
    let components = 0;
    steps.push({
        scene: { graph: graphPanel(nodes, edges, positions, marks, edgeMarks, false, 'graph') },
        codeLine: 1,
        explain: 'Loop over every vertex. A vertex no earlier traversal reached must belong to a region we have not seen.',
        vars: { components: 0 },
    });
    for (const start of nodes) {
        if (visited.has(start)) {
            marks.set(start, 'visited');
            steps.push({
                scene: { graph: graphPanel(nodes, edges, positions, marks, edgeMarks, false, 'graph') },
                codeLine: 3,
                explain: `${start} was already absorbed into an earlier component — skip it.`,
                vars: { components },
            });
            continue;
        }
        components++;
        steps.push({
            scene: { graph: graphPanel(nodes, edges, positions, marks, edgeMarks, false, 'graph') },
            codeLine: 4,
            explain: `${start} is unvisited, so this is component number ${components}.`,
            vars: { components },
        });
        const stack = [start];
        visited.add(start);
        while (stack.length > 0) {
            const node = stack.pop();
            marks.set(node, 'match');
            steps.push({
                scene: { graph: graphPanel(nodes, edges, positions, marks, edgeMarks, false, 'graph') },
                codeLine: 5,
                explain: `Absorb ${node} into component ${components}.`,
                vars: { components, visited: visited.size },
            });
            for (const next of adjacent.get(node) ?? []) {
                if (!visited.has(next)) {
                    visited.add(next);
                    stack.push(next);
                    edgeMarks.set(`${node}->${next}`, 'tree');
                }
            }
        }
    }
    steps.push({
        scene: { graph: graphPanel(nodes, edges, positions, marks, edgeMarks, false, 'graph') },
        codeLine: 9,
        explain: `${components} connected components. The count is simply how many times we had to start a fresh traversal — every vertex and edge was touched once, so O(V + E).`,
        vars: { components },
        done: true,
    });
    return cap(steps);
};
/**
 * BFS: the frontier expands one ring at a time.
 *
 * The distance counter increments once per level, and the first time the target is dequeued
 * that distance is provably minimal — which is the entire reason BFS answers "fewest steps"
 * and DFS does not.
 */
export const graphBfs = (input) => {
    const nodes = readNodes(input);
    const edges = readEdges(input);
    const start = text(input, 'start', nodes[0]);
    const target = text(input, 'target', nodes[nodes.length - 1]);
    const positions = layout(nodes);
    const adjacent = adjacency(nodes, edges, input.directed === true);
    const steps = [];
    const marks = new Map();
    const edgeMarks = new Map();
    const visited = new Set([start]);
    let queue = [start];
    let distance = 0;
    marks.set(start, 'active');
    marks.set(target, 'target');
    steps.push({
        scene: {
            graph: graphPanel(nodes, edges, positions, marks, edgeMarks, input.directed === true, `shortest path ${start} → ${target}`),
            queue: { items: [...queue], caption: 'queue (FIFO)' },
        },
        codeLine: 3,
        explain: `Enqueue ${start} and mark it visited immediately — marking at ENQUEUE time is what stops a node being queued several times.`,
        vars: { distance, queued: queue.length },
    });
    while (queue.length > 0) {
        const levelSize = queue.length;
        steps.push({
            scene: {
                graph: graphPanel(nodes, edges, positions, marks, edgeMarks, input.directed === true, `distance ${distance}`),
                queue: { items: [...queue], caption: 'queue' },
            },
            codeLine: 6,
            explain: `Freeze the queue size at ${levelSize}: that is every node exactly ${distance} step${distance === 1 ? '' : 's'} from ${start}.`,
            vars: { distance, levelSize },
        });
        const nextQueue = [];
        for (let i = 0; i < levelSize; i++) {
            const node = queue[i];
            marks.set(node, node === target ? 'match' : 'visited');
            steps.push({
                scene: {
                    graph: graphPanel(nodes, edges, positions, marks, edgeMarks, input.directed === true, `distance ${distance}`),
                    queue: { items: [...queue.slice(i + 1), ...nextQueue], caption: 'queue' },
                },
                codeLine: 8,
                explain: node === target
                    ? `Reached ${target} at distance ${distance}. Because everything closer was processed first, no shorter route exists — that is the BFS guarantee.`
                    : `Dequeue ${node} (distance ${distance}).`,
                vars: { node, distance },
            });
            if (node === target) {
                steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
                return cap(steps);
            }
            for (const next of adjacent.get(node) ?? []) {
                if (!visited.has(next)) {
                    visited.add(next);
                    nextQueue.push(next);
                    edgeMarks.set(`${node}->${next}`, 'tree');
                    if (marks.get(next) !== 'target')
                        marks.set(next, 'inWindow');
                    steps.push({
                        scene: {
                            graph: graphPanel(nodes, edges, positions, marks, edgeMarks, input.directed === true, `distance ${distance}`),
                            queue: { items: [...queue.slice(i + 1), ...nextQueue], caption: 'queue' },
                        },
                        codeLine: 10,
                        explain: `${next} is new — enqueue it for the next ring (distance ${distance + 1}).`,
                        vars: { frontier: nextQueue.length },
                    });
                }
            }
        }
        queue = nextQueue;
        distance++;
    }
    steps.push({
        scene: { graph: graphPanel(nodes, edges, positions, marks, edgeMarks, input.directed === true, 'exhausted') },
        codeLine: 16,
        explain: `The queue emptied without reaching ${target} — it is unreachable from ${start}.`,
        done: true,
    });
    return cap(steps);
};
/** DFS: one branch to its end, then back up. Note the order differs completely from BFS. */
export const graphDfs = (input) => {
    const nodes = readNodes(input);
    const edges = readEdges(input);
    const start = text(input, 'start', nodes[0]);
    const positions = layout(nodes);
    const adjacent = adjacency(nodes, edges, input.directed === true);
    const steps = [];
    const marks = new Map();
    const edgeMarks = new Map();
    const visited = new Set();
    const frames = [];
    const order = [];
    const snapshot = (explain, codeLine, vars) => {
        steps.push({
            scene: {
                graph: graphPanel(nodes, edges, positions, marks, edgeMarks, input.directed === true, `DFS from ${start}`),
                frames: { frames: frames.map((f) => ({ ...f })), caption: 'call stack' },
                output: [...order],
            },
            codeLine,
            explain,
            vars,
        });
    };
    const visit = (node, from) => {
        if (visited.has(node)) {
            edgeMarks.set(`${from}->${node}`, 'back');
            snapshot(`${node} has already been visited — return immediately. Without this check a cycle would loop forever, which is the whole difference from tree traversal.`, 2, { depth: frames.length });
            return;
        }
        visited.add(node);
        order.push(node);
        frames.push({ label: `dfs(${node})`, state: 'active' });
        marks.set(node, 'active');
        if (from)
            edgeMarks.set(`${from}->${node}`, 'tree');
        snapshot(`Visit ${node}. Depth ${frames.length} — the stack holds one root-to-leaf path, which is DFS's whole memory cost.`, 3, { depth: frames.length, visited: visited.size });
        for (const next of adjacent.get(node) ?? []) {
            visit(next, node);
        }
        frames.pop();
        marks.set(node, 'visited');
        snapshot(`${node} has no unexplored neighbours left — backtrack. This is the "reel the string back in" step.`, 6, { depth: frames.length });
    };
    snapshot(`Start at ${start}.`, 1, { depth: 0 });
    visit(start);
    steps.push({
        scene: {
            graph: graphPanel(nodes, edges, positions, marks, edgeMarks, input.directed === true, 'done'),
            output: [...order],
        },
        explain: `Visit order: ${order.join(' → ')}. Notice it bears no relation to distance from ${start} — DFS finds A path, never necessarily the shortest.`,
        done: true,
    });
    return cap(steps);
};
/**
 * Directed cycle detection with the two distinct marks.
 *
 * `visited` means "settled, never look again". `onPath` means "on the current recursion
 * stack". Meeting an onPath node is a back edge — a cycle. Conflating the two is the classic
 * bug this animation exists to make visible.
 */
export const directedCycle = (input) => {
    const nodes = readNodes(input);
    const edges = readEdges(input);
    const start = text(input, 'start', nodes[0]);
    const positions = layout(nodes);
    const adjacent = adjacency(nodes, edges, true);
    const steps = [];
    const visited = new Set();
    const onPath = new Set();
    const edgeMarks = new Map();
    const frames = [];
    let cycleFound = false;
    const marksNow = () => {
        const marks = new Map();
        nodes.forEach((id) => {
            if (onPath.has(id))
                marks.set(id, 'active');
            else if (visited.has(id))
                marks.set(id, 'visited');
        });
        return marks;
    };
    const snapshot = (explain, codeLine, vars) => {
        steps.push({
            scene: {
                graph: graphPanel(nodes, edges, positions, marksNow(), edgeMarks, true, 'directed graph'),
                frames: { frames: frames.map((f) => ({ ...f })), caption: 'onPath (the recursion stack)' },
            },
            codeLine,
            explain,
            vars,
        });
    };
    const visit = (node, from) => {
        if (onPath.has(node)) {
            if (from)
                edgeMarks.set(`${from}->${node}`, 'back');
            cycleFound = true;
            snapshot(`${node} is ALREADY ON THE CURRENT PATH — that edge closes a loop. A cycle exists, so no valid ordering is possible.`, 2, { cycle: 'found' });
            return true;
        }
        if (visited.has(node)) {
            snapshot(`${node} was fully explored earlier and is settled. Revisiting it is harmless — this is why one mark is not enough.`, 3, { depth: frames.length });
            return false;
        }
        visited.add(node);
        onPath.add(node);
        frames.push({ label: node, state: 'active' });
        if (from)
            edgeMarks.set(`${from}->${node}`, 'tree');
        snapshot(`Enter ${node}: mark it visited AND add it to the current path.`, 5, { depth: frames.length });
        for (const next of adjacent.get(node) ?? []) {
            if (visit(next, node))
                return true;
        }
        onPath.delete(node);
        frames.pop();
        snapshot(`Leaving ${node}: remove it from the path but keep it visited. Forgetting this removal reports cycles that do not exist.`, 9, { depth: frames.length });
        return false;
    };
    snapshot(`Start a depth-first walk at ${start}.`, 1, { depth: 0 });
    visit(start);
    steps.push({
        scene: {
            graph: graphPanel(nodes, edges, positions, marksNow(), edgeMarks, true, cycleFound ? 'cycle detected' : 'acyclic'),
            frames: { frames: [], caption: 'onPath' },
        },
        explain: cycleFound
            ? 'A back edge was found, so this graph has a circular dependency. In Course Schedule terms: those courses can never all be completed.'
            : 'No back edge was found from this start — nothing reachable here forms a cycle.',
        done: true,
    });
    return cap(steps);
};
/**
 * BFS on a grid — the implicit graph that half of all "matrix" problems really are.
 *
 * Three shapes, because the problems that use this engine are not all the same problem:
 *   - **single source to a target** (`start` + `target`): the maze. Stops when it arrives.
 *   - **multi-source distance fill** (`sources`, no `target`): every source seeded at distance 0
 *     so the first time a cell is reached, it is reached by the nearest one. This is rotting
 *     oranges and walls-and-gates, and the *only* thing that changes is the seeding loop.
 *   - **eight-directional** (`diagonal: true`): the same frontier, a wider neighbourhood.
 *
 * The multi-source mode was added because without it this engine narrated "reached the exit"
 * over a problem about decay spreading from several origins at once — a confident animation of
 * the wrong algorithm, which the visualisation regression test is there to prevent.
 */
export const gridBfs = (input) => {
    const grid = (Array.isArray(input.grid) ? input.grid : [[0]]);
    const diagonal = input.diagonal === true;
    const rows = grid.length;
    const cols = grid[0].length;
    const declaredSources = Array.isArray(input.sources) ? input.sources : null;
    const start = (Array.isArray(input.start) ? input.start : [0, 0]);
    const sources = declaredSources?.length ? declaredSources : [[start[0], start[1]]];
    const target = Array.isArray(input.target) ? input.target : null;
    const multiSource = sources.length > 1 || target === null;
    const steps = [];
    const cellStates = grid.map((row) => row.map((cell) => (cell === 1 ? 'reject' : 'idle')));
    const seen = grid.map((row) => row.map(() => false));
    const DIRS = diagonal
        ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
        : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let queue = [];
    for (const [r, c] of sources) {
        if (r < 0 || r >= rows || c < 0 || c >= cols)
            continue;
        seen[r][c] = true;
        cellStates[r][c] = 'active';
        queue.push([r, c]);
    }
    if (target)
        cellStates[target[0]][target[1]] = 'target';
    let distance = 0;
    let reached = queue.length;
    const snapshot = (explain, codeLine, vars) => {
        steps.push({
            scene: {
                grid: {
                    cells: grid.map((row) => row.map((cell) => (cell === 1 ? '█' : '·'))),
                    states: cellStates.map((row) => [...row]),
                    caption: multiSource
                        ? `grid — blocked cells are walls (${distance} round${distance === 1 ? '' : 's'} elapsed)`
                        : `grid — walls are blocked (distance ${distance})`,
                },
                queue: { items: queue.map(([r, c]) => `${r},${c}`), caption: 'frontier' },
            },
            codeLine,
            explain,
            vars,
        });
    };
    snapshot(multiSource
        ? `Every source starts in the queue at distance 0 — all ${sources.length} of them. That is the entire difference from single-source BFS, and it is what makes the first arrival at any cell the nearest one.`
        : `Each open cell is a node; its neighbours are the ${DIRS.length} adjacent cells. You never build this graph — you generate neighbours on demand.`, 2, { distance, sources: sources.length });
    while (queue.length > 0) {
        const levelSize = queue.length;
        const nextQueue = [];
        for (let i = 0; i < levelSize; i++) {
            const [r, c] = queue[i];
            if (cellStates[r][c] !== 'target')
                cellStates[r][c] = 'visited';
            if (target && r === target[0] && c === target[1]) {
                cellStates[r][c] = 'match';
                snapshot(`Reached the exit in ${distance} steps. Every cell was enqueued at most once, so this is O(rows × cols) — not O(paths).`, 4, { steps: distance });
                steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
                return cap(steps);
            }
            for (const [dr, dc] of DIRS) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols)
                    continue; // bounds BEFORE indexing
                if (seen[nr][nc] || grid[nr][nc] === 1)
                    continue;
                seen[nr][nc] = true;
                reached++;
                if (cellStates[nr][nc] !== 'target')
                    cellStates[nr][nc] = 'inWindow';
                nextQueue.push([nr, nc]);
            }
        }
        queue = nextQueue;
        if (queue.length === 0)
            break;
        distance++;
        snapshot(multiSource
            ? `Round ${distance}: ${queue.length} new cell${queue.length === 1 ? '' : 's'} reached. Each was claimed by whichever source got there first — no cell is ever reached twice.`
            : `Ring ${distance}: ${queue.length} cell${queue.length === 1 ? '' : 's'} are exactly ${distance} steps away.`, 10, { distance, frontier: queue.length });
    }
    const open = grid.flat().filter((cell) => cell !== 1).length;
    if (multiSource) {
        snapshot(reached === open
            ? `The frontier is exhausted after ${distance} round${distance === 1 ? '' : 's'}, and every reachable cell was claimed. That count is the answer.`
            : `The frontier is exhausted after ${distance} round${distance === 1 ? '' : 's'}, but ${open - reached} open cell${open - reached === 1 ? ' was' : 's were'} never reached — walled off from every source. That is the case the problem asks you to report as impossible.`, 12, { rounds: distance, reached, unreachable: open - reached });
    }
    else {
        snapshot('The frontier died out without reaching the exit — it is walled off.', 12, { distance });
    }
    steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
    return cap(steps);
};
/** DFS flood fill on a grid: counting islands by sinking each one. */
export const gridDfs = (input) => {
    const grid = structuredClone((Array.isArray(input.grid) ? input.grid : [[0]]));
    const steps = [];
    const rows = grid.length;
    const cols = grid[0].length;
    const cellStates = grid.map((row) => row.map((cell) => (cell === 1 ? 'idle' : 'reject')));
    let islands = 0;
    const snapshot = (explain, codeLine, vars) => {
        steps.push({
            scene: {
                grid: {
                    cells: grid.map((row) => row.map((cell) => (cell === 1 ? '1' : '0'))),
                    states: cellStates.map((row) => [...row]),
                    caption: `grid — 1 is land (${islands} island${islands === 1 ? '' : 's'} so far)`,
                },
            },
            codeLine,
            explain,
            vars,
        });
    };
    snapshot('Scan every cell. A land cell no flood fill has reached must belong to a new island.', 1, { islands });
    const sink = (r, c) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols)
            return;
        if (grid[r][c] !== 1)
            return;
        grid[r][c] = 0; // mark BEFORE recursing, or this never terminates
        cellStates[r][c] = 'match';
        snapshot(`Sink (${r}, ${c}) into island ${islands}. Marking it before recursing is what stops the traversal revisiting it forever.`, 12, { islands });
        sink(r + 1, c);
        sink(r - 1, c);
        sink(r, c + 1);
        sink(r, c - 1);
    };
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 1) {
                islands++;
                snapshot(`(${r}, ${c}) is land that no earlier fill reached — island number ${islands}.`, 5, { islands });
                sink(r, c);
            }
        }
    }
    steps.push({
        scene: {
            grid: {
                cells: grid.map((row) => row.map(() => '0')),
                states: cellStates.map((row) => [...row]),
                caption: 'all land absorbed',
            },
        },
        explain: `${islands} islands. Each cell was examined at most twice — once by the scan, once by a fill — so the whole thing is O(rows × cols). Note that diagonals do NOT connect here.`,
        vars: { islands },
        done: true,
    });
    return cap(steps);
};
