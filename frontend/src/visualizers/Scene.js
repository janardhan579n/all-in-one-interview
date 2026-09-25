import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * One renderer for every visualisation.
 *
 * Engines produce a Scene; this draws whichever panels are present. That is what keeps 41
 * engines from needing 41 renderers, and it is why a new engine usually needs no new UI code
 * at all — it composes the panels that already exist.
 */
const CELL_CLASSES = {
    idle: 'bg-surface-raised border-line text-ink',
    active: 'bg-brand/15 border-brand text-ink ring-2 ring-brand/40',
    inWindow: 'bg-info/15 border-info/60 text-ink',
    visited: 'bg-surface-sunken border-line text-ink-muted',
    match: 'bg-good/20 border-good text-ink font-semibold',
    reject: 'bg-surface-sunken border-line/60 text-ink-faint line-through decoration-ink-faint/60',
    target: 'bg-warn/15 border-warn text-ink',
};
const TONE_CLASSES = {
    brand: 'text-brand',
    good: 'text-good',
    warn: 'text-warn',
    bad: 'text-bad',
    info: 'text-info',
};
const NODE_FILL = {
    idle: 'rgb(var(--surface-raised))',
    active: 'rgb(var(--brand) / 0.25)',
    inWindow: 'rgb(var(--info) / 0.25)',
    visited: 'rgb(var(--surface-sunken))',
    match: 'rgb(var(--good) / 0.3)',
    reject: 'rgb(var(--surface-sunken))',
    target: 'rgb(var(--warn) / 0.25)',
};
const NODE_STROKE = {
    idle: 'rgb(var(--line))',
    active: 'rgb(var(--brand))',
    inWindow: 'rgb(var(--info))',
    visited: 'rgb(var(--line))',
    match: 'rgb(var(--good))',
    reject: 'rgb(var(--line))',
    target: 'rgb(var(--warn))',
};
function Panel({ title, children }) {
    return (_jsxs("section", { className: "min-w-0", children: [title ? (_jsx("h4", { className: "mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: title })) : null, children] }));
}
function ArrayPanelView({ values, states, labels, caption, asText, pointers, ranges, }) {
    const pointersByIndex = new Map();
    pointers?.forEach((pointer) => {
        const list = pointersByIndex.get(pointer.index) ?? [];
        list.push({ name: pointer.name, tone: pointer.tone });
        pointersByIndex.set(pointer.index, list);
    });
    return (_jsx(Panel, { title: caption, children: _jsx("div", { className: "overflow-x-auto pb-1", children: _jsxs("div", { className: "inline-flex flex-col gap-1", children: [ranges && ranges.length > 0 ? (_jsx("div", { className: "flex", children: values.map((_, index) => {
                            const range = ranges.find((r) => index >= r.from && index <= r.to);
                            const isStart = range && index === range.from;
                            return (_jsx("div", { className: "w-12 shrink-0 px-0.5", children: _jsx("div", { className: `h-4 rounded-t border-t-2 border-x-2 ${range ? 'border-brand/70' : 'border-transparent'} ${isStart ? '' : 'border-l-transparent'}`, children: isStart ? (_jsx("span", { className: "block -mt-[2px] text-[10px] font-medium text-brand", children: range?.name })) : null }) }, index));
                        }) })) : null, _jsx("div", { className: "flex", role: "list", "aria-label": caption ?? 'array', children: values.map((value, index) => (_jsx("div", { className: "w-12 shrink-0 px-0.5", role: "listitem", children: _jsx("div", { className: `flex h-12 items-center justify-center rounded-lg border text-sm transition-colors duration-200 motion-reduce:transition-none ${CELL_CLASSES[states?.[index] ?? 'idle']} ${asText ? 'font-mono' : 'tabular-nums'}`, children: String(value) }) }, index))) }), _jsx("div", { className: "flex", children: values.map((_, index) => (_jsxs("div", { className: "w-12 shrink-0 px-0.5 text-center", children: [_jsx("div", { className: "text-[10px] text-ink-faint", children: labels?.[index] ?? index }), _jsx("div", { className: "min-h-[16px] space-y-px", children: (pointersByIndex.get(index) ?? []).map((pointer) => (_jsxs("div", { className: `text-[10px] font-semibold leading-tight ${TONE_CLASSES[pointer.tone ?? 'brand']}`, children: ["\u25B2", pointer.name] }, pointer.name))) })] }, index))) })] }) }) }));
}
function ListPanelView({ list }) {
    const pointersByNode = new Map();
    list.pointers?.forEach((pointer) => {
        if (!pointer.nodeId)
            return;
        const existing = pointersByNode.get(pointer.nodeId) ?? [];
        existing.push({ name: pointer.name, tone: pointer.tone });
        pointersByNode.set(pointer.nodeId, existing);
    });
    return (_jsx(Panel, { title: list.caption, children: _jsx("div", { className: "overflow-x-auto pb-2", children: _jsx("div", { className: "inline-flex items-start gap-1", children: list.nodes.map((node, index) => (_jsxs("div", { className: "flex items-start gap-1", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: `flex h-12 w-14 items-center justify-center rounded-lg border text-sm tabular-nums transition-colors duration-200 motion-reduce:transition-none ${CELL_CLASSES[node.state ?? 'idle']}`, children: String(node.value) }), _jsx("div", { className: "min-h-[16px] pt-1", children: (pointersByNode.get(node.id) ?? []).map((pointer) => (_jsxs("div", { className: `text-[10px] font-semibold leading-tight ${TONE_CLASSES[pointer.tone ?? 'brand']}`, children: ["\u25B2", pointer.name] }, pointer.name))) })] }), _jsx("div", { className: "flex h-12 items-center text-ink-faint", children: index === list.nodes.length - 1 ? (list.cycleTo !== null && list.cycleTo !== undefined ? (_jsxs("span", { className: "whitespace-nowrap text-[11px] font-medium text-warn", children: ["\u21A9 back to #", list.cycleTo] })) : (_jsx("span", { className: "text-xs", children: "\u2192 null" }))) : (_jsx("span", { "aria-hidden": "true", children: "\u2192" })) })] }, node.id))) }) }) }));
}
/** Lay a tree out by in-order position (x) and depth (y). Deterministic, so nothing jumps. */
function layoutTree(root) {
    const placed = [];
    const edges = [];
    let cursor = 0;
    const walk = (node, depth) => {
        if (!node)
            return null;
        const left = walk(node.left, depth + 1);
        const x = cursor++;
        const position = { x, y: depth };
        placed.push({ node, x, y: depth });
        const right = walk(node.right, depth + 1);
        if (left)
            edges.push({ x1: x, y1: depth, x2: left.x, y2: depth + 1 });
        if (right)
            edges.push({ x1: x, y1: depth, x2: right.x, y2: depth + 1 });
        return position;
    };
    walk(root, 0);
    const width = Math.max(1, cursor);
    const height = placed.reduce((max, item) => Math.max(max, item.y), 0) + 1;
    return { placed, edges, width, height };
}
function TreePanelView({ tree }) {
    const { placed, edges, width, height } = layoutTree(tree);
    const stepX = 76;
    const stepY = 74;
    const viewWidth = width * stepX;
    const viewHeight = height * stepY;
    const cx = (x) => x * stepX + stepX / 2;
    const cy = (y) => y * stepY + 28;
    return (_jsx(Panel, { title: "tree", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("svg", { viewBox: `0 0 ${viewWidth} ${viewHeight}`, style: { width: Math.max(viewWidth, 260), height: viewHeight }, role: "img", "aria-label": "binary tree", children: [edges.map((edge, index) => (_jsx("line", { x1: cx(edge.x1), y1: cy(edge.y1), x2: cx(edge.x2), y2: cy(edge.y2), stroke: "rgb(var(--line))", strokeWidth: 1.5 }, index))), placed.map(({ node, x, y }) => (_jsxs("g", { children: [_jsx("circle", { cx: cx(x), cy: cy(y), r: 20, fill: NODE_FILL[node.state ?? 'idle'], stroke: NODE_STROKE[node.state ?? 'idle'], strokeWidth: node.state === 'idle' ? 1.5 : 2.5, className: "transition-all duration-200 motion-reduce:transition-none" }), _jsx("text", { x: cx(x), y: cy(y) + 4, textAnchor: "middle", fontSize: 13, fill: "rgb(var(--ink))", className: "tabular-nums", children: String(node.value) })] }, node.id)))] }) }) }));
}
function GraphPanelView({ graph }) {
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    const edgeColor = (state) => {
        if (state === 'tree')
            return 'rgb(var(--good))';
        if (state === 'back')
            return 'rgb(var(--bad))';
        if (state === 'active')
            return 'rgb(var(--brand))';
        return 'rgb(var(--line))';
    };
    return (_jsx(Panel, { title: graph.caption ?? 'graph', children: _jsxs("svg", { viewBox: "0 0 600 470", className: "h-[320px] w-full", role: "img", "aria-label": graph.caption ?? 'graph', children: [_jsx("defs", { children: _jsx("marker", { id: "arrow", viewBox: "0 0 10 10", refX: "26", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse", children: _jsx("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "rgb(var(--ink-faint))" }) }) }), graph.edges.map((edge, index) => {
                    const from = byId.get(edge.from);
                    const to = byId.get(edge.to);
                    if (!from || !to)
                        return null;
                    return (_jsxs("g", { children: [_jsx("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: edgeColor(edge.state), strokeWidth: edge.state && edge.state !== 'idle' ? 3 : 1.5, strokeDasharray: edge.state === 'back' ? '5 4' : undefined, markerEnd: graph.directed ? 'url(#arrow)' : undefined, className: "transition-all duration-200 motion-reduce:transition-none" }), edge.label ? (_jsx("text", { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 6, textAnchor: "middle", fontSize: 11, fill: "rgb(var(--ink-faint))", children: edge.label })) : null] }, `${edge.from}-${edge.to}-${index}`));
                }), graph.nodes.map((node) => (_jsxs("g", { children: [_jsx("circle", { cx: node.x, cy: node.y, r: 22, fill: NODE_FILL[node.state ?? 'idle'], stroke: NODE_STROKE[node.state ?? 'idle'], strokeWidth: node.state === 'idle' ? 1.5 : 3, className: "transition-all duration-200 motion-reduce:transition-none" }), _jsx("text", { x: node.x, y: node.y + 5, textAnchor: "middle", fontSize: 13, fill: "rgb(var(--ink))", children: node.label })] }, node.id)))] }) }));
}
function GridPanelView({ grid }) {
    return (_jsx(Panel, { title: grid.caption ?? 'grid', children: _jsx("div", { className: "overflow-x-auto", children: _jsx("div", { className: "inline-block", children: grid.cells.map((row, r) => (_jsx("div", { className: "flex", children: row.map((cell, c) => (_jsx("div", { className: `m-px flex h-10 w-10 items-center justify-center rounded border text-xs tabular-nums transition-colors duration-200 motion-reduce:transition-none ${CELL_CLASSES[grid.states?.[r]?.[c] ?? 'idle']}`, children: String(cell) }, c))) }, r))) }) }) }));
}
function TablePanelView({ table }) {
    return (_jsx(Panel, { title: table.caption ?? 'table', children: _jsx("div", { className: "overflow-x-auto rounded-lg border border-line", children: _jsxs("table", { className: "w-full text-left text-xs", children: [_jsx("thead", { className: "bg-surface-sunken text-ink-muted", children: _jsx("tr", { children: table.columns.map((column) => (_jsx("th", { className: "whitespace-nowrap px-3 py-2 font-medium", children: column }, column))) }) }), _jsx("tbody", { children: table.rows.map((row, r) => (_jsx("tr", { className: "border-t border-line", children: row.map((cell, c) => (_jsx("td", { className: `whitespace-nowrap px-3 py-1.5 tabular-nums ${table.cursor && table.cursor[0] === r && table.cursor[1] === c
                                    ? 'bg-brand/15 font-semibold text-ink'
                                    : 'text-ink-muted'}`, children: String(cell) }, c))) }, r))) })] }) }) }));
}
function StackPanelView({ items, caption }) {
    return (_jsx(Panel, { title: caption ?? 'stack', children: _jsx("div", { className: "flex w-32 flex-col-reverse gap-1 rounded-lg border border-line bg-surface-sunken p-2", children: items.length === 0 ? (_jsx("div", { className: "py-3 text-center text-xs text-ink-faint", children: "empty" })) : (items.map((item, index) => (_jsxs("div", { className: `rounded border px-2 py-1.5 text-center text-sm ${index === items.length - 1 ? CELL_CLASSES.match : CELL_CLASSES.idle}`, children: [String(item), index === items.length - 1 ? _jsx("span", { className: "ml-1 text-[10px] text-ink-faint", children: "top" }) : null] }, index)))) }) }));
}
function QueuePanelView({ queue }) {
    const isCircular = queue.capacity !== undefined;
    return (_jsx(Panel, { title: queue.caption ?? 'queue', children: _jsxs("div", { className: "flex items-center gap-2 overflow-x-auto pb-1", children: [!isCircular ? _jsx("span", { className: "shrink-0 text-[10px] text-ink-faint", children: "front" }) : null, _jsx("div", { className: "flex gap-1", children: queue.items.length === 0 ? (_jsx("div", { className: "rounded border border-dashed border-line px-4 py-2 text-xs text-ink-faint", children: "empty" })) : (queue.items.map((item, index) => {
                        const isHead = isCircular && index === queue.head;
                        const isTail = isCircular && index === queue.tail;
                        return (_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: `flex h-11 w-14 items-center justify-center rounded border text-sm ${String(item) === '' ? 'border-dashed border-line text-ink-faint' : CELL_CLASSES.idle}`, children: String(item) === '' ? '·' : String(item) }), isCircular ? (_jsxs("div", { className: "h-4 text-[10px] leading-tight", children: [isHead ? _jsx("span", { className: "text-good", children: "head" }) : null, isHead && isTail ? ' ' : null, isTail ? _jsx("span", { className: "text-warn", children: "tail" }) : null] })) : null] }, index));
                    })) }), !isCircular ? _jsx("span", { className: "shrink-0 text-[10px] text-ink-faint", children: "rear" }) : null] }) }));
}
function BoxesPanelView({ boxes }) {
    return (_jsx(Panel, { title: boxes.caption ?? 'memory', children: _jsx("div", { className: "flex flex-wrap gap-2", children: boxes.boxes.map((box) => (_jsxs("div", { className: `min-w-[128px] rounded-lg border p-2 ${CELL_CLASSES[box.state ?? 'idle']}`, children: [_jsx("div", { className: "font-mono text-xs text-ink-muted", children: box.address }), _jsx("div", { className: "text-sm font-semibold", children: String(box.value) }), _jsxs("div", { className: "text-[11px] text-ink-muted", children: [box.type ? _jsxs("span", { className: "font-mono", children: [box.type, " "] }) : null, box.name, box.reference ? _jsx("span", { className: "ml-1 text-info", children: "(ref)" }) : null] })] }, box.name))) }) }));
}
function BoardPanelView({ board }) {
    const conflicts = new Set((board.conflicts ?? []).map(([r, c]) => `${r},${c}`));
    return (_jsx(Panel, { title: board.caption ?? 'board', children: _jsx("div", { className: "inline-block rounded-lg border border-line p-1", children: Array.from({ length: board.size }, (_, r) => (_jsx("div", { className: "flex", children: Array.from({ length: board.size }, (_, c) => {
                    const hasQueen = board.queens[r] === c;
                    const isConflict = conflicts.has(`${r},${c}`);
                    const dark = (r + c) % 2 === 1;
                    return (_jsx("div", { className: `flex h-9 w-9 items-center justify-center text-lg ${dark ? 'bg-surface-sunken' : 'bg-surface-raised'} ${isConflict ? 'ring-2 ring-inset ring-bad/70' : ''}`, children: hasQueen ? _jsx("span", { className: "text-good", children: "\u265B" }) : isConflict ? _jsx("span", { className: "text-xs text-bad", children: "\u2715" }) : null }, c));
                }) }, r))) }) }));
}
function FramesPanelView({ frames }) {
    return (_jsx(Panel, { title: frames.caption ?? 'call stack', children: _jsx("div", { className: "flex w-full max-w-xs flex-col-reverse gap-1 rounded-lg border border-line bg-surface-sunken p-2", children: frames.frames.length === 0 ? (_jsx("div", { className: "py-2 text-center text-xs text-ink-faint", children: "empty" })) : (frames.frames.map((frame, index) => (_jsxs("div", { className: `rounded border px-2 py-1 font-mono text-xs ${CELL_CLASSES[frame.state ?? 'idle']}`, style: { marginLeft: index * 6 }, children: [frame.label, frame.detail ? _jsx("span", { className: "ml-1 text-ink-faint", children: frame.detail }) : null] }, index)))) }) }));
}
function BucketsPanelView({ buckets }) {
    const single = buckets.buckets.length === 1;
    return (_jsx(Panel, { title: buckets.caption ?? 'map', children: _jsx("div", { className: single ? 'flex flex-wrap gap-1' : 'space-y-1', children: buckets.buckets.map((bucket) => single ? (bucket.entries.length === 0 ? (_jsx("div", { className: "rounded border border-dashed border-line px-3 py-1 text-xs text-ink-faint", children: "empty" }, "empty")) : (bucket.entries.map((entry) => (_jsxs("div", { className: `rounded border px-2 py-1 font-mono text-xs ${CELL_CLASSES[entry.state ?? 'idle']}`, children: [entry.key, " \u2192 ", String(entry.value)] }, entry.key))))) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-8 shrink-0 rounded bg-surface-sunken px-1 py-0.5 text-center font-mono text-[11px] text-ink-faint", children: bucket.index }), _jsx("div", { className: "flex flex-wrap gap-1", children: bucket.entries.length === 0 ? (_jsx("span", { className: "text-[11px] text-ink-faint", children: "\u2014" })) : (bucket.entries.map((entry, index) => (_jsxs("div", { className: "flex items-center gap-1", children: [index > 0 ? _jsx("span", { className: "text-ink-faint", children: "\u2192" }) : null, _jsxs("span", { className: `rounded border px-2 py-0.5 font-mono text-xs ${CELL_CLASSES[entry.state ?? 'idle']}`, children: [entry.key, ":", String(entry.value)] })] }, entry.key)))) })] }, bucket.index))) }) }));
}
export function SceneView({ scene }) {
    const hasAnything = scene.array || scene.list || scene.tree || scene.graph || scene.grid || scene.table ||
        scene.stack || scene.queue || scene.boxes || scene.board || scene.frames || scene.buckets ||
        (scene.output && scene.output.length > 0);
    if (!hasAnything) {
        return _jsx("div", { className: "py-8 text-center text-sm text-ink-faint", children: "Nothing to draw at this step." });
    }
    return (_jsxs("div", { className: "space-y-5", children: [scene.array ? (_jsx(ArrayPanelView, { values: scene.array.values, states: scene.array.states, labels: scene.array.labels, caption: scene.array.caption, asText: scene.array.asText, pointers: scene.pointers, ranges: scene.ranges })) : null, scene.secondaryArray ? (_jsx(ArrayPanelView, { values: scene.secondaryArray.values, states: scene.secondaryArray.states, labels: scene.secondaryArray.labels, caption: scene.secondaryArray.caption, asText: scene.secondaryArray.asText })) : null, scene.list ? _jsx(ListPanelView, { list: scene.list }) : null, scene.tree ? _jsx(TreePanelView, { tree: scene.tree }) : null, scene.graph ? _jsx(GraphPanelView, { graph: scene.graph }) : null, scene.grid ? _jsx(GridPanelView, { grid: scene.grid }) : null, scene.board ? _jsx(BoardPanelView, { board: scene.board }) : null, (scene.stack || scene.queue || scene.frames || scene.buckets) ? (_jsxs("div", { className: "flex flex-wrap gap-6", children: [scene.stack ? _jsx(StackPanelView, { items: scene.stack.items, caption: scene.stack.caption }) : null, scene.queue ? _jsx(QueuePanelView, { queue: scene.queue }) : null, scene.frames ? _jsx(FramesPanelView, { frames: scene.frames }) : null, scene.buckets ? _jsx(BucketsPanelView, { buckets: scene.buckets }) : null] })) : null, scene.boxes ? _jsx(BoxesPanelView, { boxes: scene.boxes }) : null, scene.table ? _jsx(TablePanelView, { table: scene.table }) : null, scene.output && scene.output.length > 0 ? (_jsx(Panel, { title: "output", children: _jsx("div", { className: "max-h-40 overflow-y-auto rounded-lg border border-line bg-surface-sunken p-2 font-mono text-xs text-ink-muted", children: scene.output.map((line, index) => (_jsx("div", { children: line }, index))) }) })) : null] }));
}
