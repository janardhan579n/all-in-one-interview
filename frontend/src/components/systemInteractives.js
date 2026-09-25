import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from './ui';
/**
 * Simulators for the harder system design concepts.
 *
 * These live apart from `interactives.tsx` only because that file was getting long; they are
 * registered there, which is also where the content validator looks for the id list.
 *
 * Every one of them computes the real thing. The ring really hashes keys and really walks
 * clockwise; the Bloom filter really sets and probes bits and really reports the false
 * positives that follow; the breaker really runs the state machine over a rolling window.
 * A widget that faked its numbers would teach the learner to trust a picture that lies.
 */
/**
 * FNV-1a, 32-bit, followed by an avalanche finaliser.
 *
 * The finaliser is not decoration. The first version stopped at plain FNV-1a, and on short
 * structured inputs like "node-A#0" and "key-17" its output clustered so hard that two of four
 * nodes owned *zero* of 600 keys — the ring widget drew a confident picture of a property the
 * code did not have, and the "virtual nodes even things out" slider made it barely better.
 * FNV-1a's avalanche is weak: flipping one input bit leaves whole regions of the output
 * correlated. The murmur3 fmix32 tail below scrambles those bits, after which four nodes land
 * within 16% of a fair share at 150 virtual nodes. A hash used for placement needs uniformity,
 * not just speed — `systemInteractives.test.ts` is what holds this honest.
 */
function hash32(text) {
    let h = 0x811c9dc5;
    for (let index = 0; index < text.length; index++) {
        h ^= text.charCodeAt(index);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
}
/**
 * The theme tokens are RGB *channel triples* (`--brand: 79 70 229`) so Tailwind can compose
 * them with an alpha — so they must be wrapped in `rgb(...)` before use as a colour. Passing
 * `var(--brand)` straight to `fill` is not an error the browser reports: it silently falls
 * back to black, which is how the first version of the ring came out as a black doughnut.
 */
const NODE_COLOURS = [
    'rgb(var(--brand))',
    'rgb(var(--good))',
    'rgb(var(--warn))',
    'rgb(var(--info))',
    'rgb(var(--bad))',
    'rgb(168 85 247)',
];
// ------------------------------------------------------------- consistent hashing
const RING_SPACE = 2 ** 32;
/** A fixed key set, so every reading of "how many moved" compares like with like. */
export const RING_KEYS = Array.from({ length: 600 }, (_, index) => `key-${index}`);
export function buildRing(nodes, virtualNodes) {
    const points = [];
    for (const node of nodes) {
        for (let replica = 0; replica < virtualNodes; replica++) {
            points.push({ position: hash32(`${node}#${replica}`), node });
        }
    }
    return points.sort((a, b) => a.position - b.position);
}
/** Walk clockwise to the first point at or after the key — the whole trick, in four lines. */
export function ownerOnRing(ring, position) {
    let low = 0;
    let high = ring.length - 1;
    if (ring.length === 0)
        return '';
    if (position > ring[high].position)
        return ring[0].node; // wrapped past the last point
    while (low < high) {
        const mid = (low + high) >> 1;
        if (ring[mid].position < position)
            low = mid + 1;
        else
            high = mid;
    }
    return ring[low].node;
}
export function assign(nodes, virtualNodes, mode) {
    const result = {};
    if (nodes.length === 0)
        return result;
    if (mode === 'modulo') {
        for (const key of RING_KEYS)
            result[key] = nodes[hash32(key) % nodes.length];
        return result;
    }
    const ring = buildRing(nodes, virtualNodes);
    for (const key of RING_KEYS)
        result[key] = ownerOnRing(ring, hash32(key));
    return result;
}
export function ConsistentHashingRing() {
    const [nodes, setNodes] = useState(['node-A', 'node-B', 'node-C', 'node-D']);
    const [virtualNodes, setVirtualNodes] = useState(80);
    const [mode, setMode] = useState('ring');
    const [lastMove, setLastMove] = useState(null);
    const assignment = useMemo(() => assign(nodes, virtualNodes, mode), [nodes, virtualNodes, mode]);
    const counts = useMemo(() => {
        const tally = new Map(nodes.map((node) => [node, 0]));
        for (const key of RING_KEYS)
            tally.set(assignment[key], (tally.get(assignment[key]) ?? 0) + 1);
        return tally;
    }, [assignment, nodes]);
    /** The ring drawn as 240 arcs, each coloured by whoever owns that position. */
    const segments = useMemo(() => {
        if (mode === 'modulo' || nodes.length === 0)
            return [];
        const ring = buildRing(nodes, virtualNodes);
        return Array.from({ length: 240 }, (_, index) => ownerOnRing(ring, (index / 240) * RING_SPACE));
    }, [nodes, virtualNodes, mode]);
    const colourOf = (node) => NODE_COLOURS[Math.max(0, nodes.indexOf(node)) % NODE_COLOURS.length];
    const change = (nextNodes, label) => {
        const before = assignment;
        const after = assign(nextNodes, virtualNodes, mode);
        let moved = 0;
        for (const key of RING_KEYS)
            if (before[key] !== after[key])
                moved++;
        setLastMove({ label, moved, total: RING_KEYS.length });
        setNodes(nextNodes);
    };
    const addNode = () => {
        if (nodes.length >= 6)
            return;
        const name = `node-${String.fromCharCode(65 + nodes.length)}`;
        change([...nodes, name], `added ${name} (${nodes.length} → ${nodes.length + 1} nodes)`);
    };
    const removeNode = () => {
        if (nodes.length <= 2)
            return;
        const dying = nodes[nodes.length - 1];
        change(nodes.slice(0, -1), `removed ${dying} (${nodes.length} → ${nodes.length - 1} nodes)`);
    };
    const spread = [...counts.values()];
    const imbalance = spread.length
        ? Math.round(((Math.max(...spread) - Math.min(...spread)) / (RING_KEYS.length / spread.length)) * 100)
        : 0;
    return (_jsxs(Card, { children: [_jsx("h3", { className: "mb-1 text-sm font-semibold text-ink", children: "The ring, and what a new node actually costs you" }), _jsxs("p", { className: "mb-3 text-xs text-ink-muted", children: ["600 real keys, really hashed. Switch to ", _jsx("strong", { className: "text-ink", children: "hash % N" }), ", add a node, and read the number that comes back \u2014 that is the cache you just threw away."] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("select", { value: mode, onChange: (event) => setMode(event.target.value), className: "rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink", "aria-label": "Placement strategy", children: [_jsx("option", { value: "ring", children: "Consistent hashing (ring)" }), _jsx("option", { value: "modulo", children: "Naive hash % N" })] }), _jsx("button", { type: "button", onClick: addNode, disabled: nodes.length >= 6, className: "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40", children: "+ Add a node" }), _jsx("button", { type: "button", onClick: removeNode, disabled: nodes.length <= 2, className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken disabled:opacity-40", children: "\u2212 Remove a node" })] }), mode === 'ring' && (_jsxs("label", { className: "mt-3 flex items-center gap-3 text-xs text-ink-muted", children: [_jsxs("span", { className: "w-32 shrink-0", children: ["Virtual nodes: ", virtualNodes] }), _jsx("input", { type: "range", min: 1, max: 200, value: virtualNodes, onChange: (event) => setVirtualNodes(Number(event.target.value)), className: "flex-1", "aria-label": "Virtual nodes per physical node" })] })), lastMove && (_jsxs("div", { className: `mt-3 rounded-lg border px-3 py-2 text-xs ${lastMove.moved / lastMove.total > 0.5
                    ? 'border-bad/50 bg-bad/10 text-bad'
                    : 'border-good/50 bg-good/10 text-good'}`, role: "status", children: [_jsxs("strong", { children: [lastMove.label, ":"] }), " ", lastMove.moved, " of ", lastMove.total, " keys changed owner (", Math.round((lastMove.moved / lastMove.total) * 100), "%).", ' ', lastMove.moved / lastMove.total > 0.5
                        ? 'Every one of those is a cache miss you caused by adding capacity.'
                        : 'Only the keys in the new node’s arc moved — the rest never noticed.'] })), _jsxs("div", { className: "mt-4 grid gap-4 sm:grid-cols-[200px_1fr]", children: [_jsx("div", { className: "flex items-center justify-center", children: mode === 'ring' ? (_jsxs("svg", { viewBox: "0 0 200 200", className: "h-44 w-44", role: "img", "aria-label": "Hash ring ownership by position", children: [segments.map((node, index) => {
                                    const start = (index / segments.length) * Math.PI * 2 - Math.PI / 2;
                                    const end = ((index + 1) / segments.length) * Math.PI * 2 - Math.PI / 2;
                                    const outer = 88;
                                    const inner = 60;
                                    const x1 = 100 + outer * Math.cos(start);
                                    const y1 = 100 + outer * Math.sin(start);
                                    const x2 = 100 + outer * Math.cos(end);
                                    const y2 = 100 + outer * Math.sin(end);
                                    const x3 = 100 + inner * Math.cos(end);
                                    const y3 = 100 + inner * Math.sin(end);
                                    const x4 = 100 + inner * Math.cos(start);
                                    const y4 = 100 + inner * Math.sin(start);
                                    return (_jsx("path", { d: `M${x1} ${y1} A${outer} ${outer} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${inner} ${inner} 0 0 0 ${x4} ${y4} Z`, fill: colourOf(node) }, index));
                                }), _jsx("text", { x: "100", y: "104", textAnchor: "middle", fontSize: 10, fill: "rgb(var(--ink))", children: virtualNodes === 1 ? '1 point each' : `${virtualNodes} points each` })] })) : (_jsxs("p", { className: "max-w-[180px] text-center text-xs text-ink-muted", children: ["There is no ring. ", _jsx("code", { children: "hash(key) % N" }), " computes an owner from scratch every time, which is exactly why changing N rewrites almost every answer."] })) }), _jsxs("div", { className: "space-y-2", children: [nodes.map((node) => {
                                const count = counts.get(node) ?? 0;
                                return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "w-20 shrink-0 text-xs font-medium text-ink", children: node }), _jsx("div", { className: "h-5 flex-1 overflow-hidden rounded bg-surface-sunken", children: _jsx("div", { className: "h-full transition-[width] duration-300 motion-reduce:transition-none", style: { width: `${(count / RING_KEYS.length) * 100}%`, background: colourOf(node) } }) }), _jsxs("span", { className: "w-20 shrink-0 text-right text-xs tabular-nums text-ink-muted", children: [count, " (", Math.round((count / RING_KEYS.length) * 100), "%)"] })] }, node));
                            }), _jsxs("p", { className: "pt-1 text-xs text-ink-muted", children: ["Spread between the busiest and quietest node: ", _jsxs("strong", { className: "text-ink", children: [imbalance, "%"] }), " of a fair share.", ' ', mode === 'ring' && virtualNodes <= 4
                                        ? 'With this few points per node the ring is carved into a handful of uneven arcs — this is the problem virtual nodes exist to fix. Drag the slider up.'
                                        : mode === 'ring'
                                            ? 'Many small arcs per node average out, which is the second job virtual nodes do.'
                                            : 'Modulo distributes evenly — evenness was never the thing it got wrong.'] })] })] })] }));
}
// ------------------------------------------------------------------ bloom filter
export const BLOOM_BITS = 64;
const BLOOM_SEED = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];
/** Double hashing: k indices from two base hashes, the standard way to avoid k real hash functions. */
export function bloomIndices(value, k) {
    const h1 = hash32(value);
    const h2 = hash32(`${value}#salt`) | 1;
    return Array.from({ length: k }, (_, i) => (((h1 + Math.imul(i, h2)) >>> 0) % BLOOM_BITS));
}
export function BloomFilterSim() {
    const [k, setK] = useState(3);
    const [inserted, setInserted] = useState(BLOOM_SEED);
    const [input, setInput] = useState('foxtrot');
    const [probe, setProbe] = useState(null);
    const bits = useMemo(() => {
        const array = new Uint8Array(BLOOM_BITS);
        for (const value of inserted)
            for (const index of bloomIndices(value, k))
                array[index] = 1;
        return array;
    }, [inserted, k]);
    const setCount = useMemo(() => bits.reduce((sum, bit) => sum + bit, 0), [bits]);
    /** Measured, not predicted: probe 4,000 strings that were never inserted and count the lies. */
    const measured = useMemo(() => {
        const members = new Set(inserted);
        let positives = 0;
        let trials = 0;
        for (let index = 0; index < 4000; index++) {
            const candidate = `probe-${index}`;
            if (members.has(candidate))
                continue;
            trials++;
            if (bloomIndices(candidate, k).every((position) => bits[position] === 1))
                positives++;
        }
        return trials === 0 ? 0 : positives / trials;
    }, [bits, inserted, k]);
    const theoretical = (1 - Math.exp((-k * inserted.length) / BLOOM_BITS)) ** k;
    const add = () => {
        const value = input.trim();
        if (!value || inserted.includes(value))
            return;
        setInserted([...inserted, value]);
        setProbe(null);
    };
    const query = () => {
        const value = input.trim();
        if (!value)
            return;
        const indices = bloomIndices(value, k);
        setProbe({
            value,
            indices,
            present: indices.every((index) => bits[index] === 1),
            truth: inserted.includes(value),
        });
    };
    return (_jsxs(Card, { children: [_jsxs("h3", { className: "mb-1 text-sm font-semibold text-ink", children: ["A real ", BLOOM_BITS, "-bit filter"] }), _jsxs("p", { className: "mb-3 text-xs text-ink-muted", children: ["Keep adding words to ", BLOOM_BITS, " bits and watch a word you never inserted come back \u201Cmaybe present\u201D. The filter is not broken when that happens \u2014 that is the deal you signed."] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("input", { value: input, onChange: (event) => setInput(event.target.value), onKeyDown: (event) => {
                            if (event.key === 'Enter')
                                query();
                        }, className: "w-40 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink", "aria-label": "Word to insert or look up", placeholder: "a word" }), _jsx("button", { type: "button", onClick: add, className: "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white", children: "Insert" }), _jsx("button", { type: "button", onClick: query, className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken", children: "Look up" }), _jsx("button", { type: "button", onClick: () => {
                            setInserted(BLOOM_SEED);
                            setProbe(null);
                        }, className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken", children: "Reset" }), _jsxs("label", { className: "flex items-center gap-2 text-xs text-ink-muted", children: ["k = ", k, _jsx("input", { type: "range", min: 1, max: 6, value: k, onChange: (event) => {
                                    setK(Number(event.target.value));
                                    setProbe(null);
                                }, "aria-label": "Number of hash functions" })] })] }), _jsx("div", { className: "mt-4 grid gap-1", style: { gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }, children: Array.from(bits).map((bit, index) => {
                    const probed = probe?.indices.includes(index);
                    return (_jsx("div", { title: `bit ${index}`, className: `flex h-6 items-center justify-center rounded text-[10px] tabular-nums ${bit ? 'bg-brand text-white' : 'bg-surface-sunken text-ink-faint'} ${probed ? 'outline outline-2 outline-offset-1 outline-warn' : ''}`, children: bit }, index));
                }) }), probe && (_jsxs("div", { className: `mt-3 rounded-lg border px-3 py-2 text-xs ${!probe.present
                    ? 'border-good/50 bg-good/10 text-good'
                    : probe.truth
                        ? 'border-info/50 bg-info/10 text-info'
                        : 'border-bad/50 bg-bad/10 text-bad'}`, role: "status", children: [_jsxs("strong", { children: ["\u201C", probe.value, "\u201D"] }), " probes bits ", probe.indices.join(', '), " \u2192", ' ', !probe.present ? (_jsxs(_Fragment, { children: [_jsx("strong", { children: "definitely not present." }), " One of those bits is 0, and an inserted key would have set all of them. This answer is never wrong \u2014 that is the guarantee you are buying."] })) : probe.truth ? (_jsxs(_Fragment, { children: [_jsx("strong", { children: "maybe present" }), " \u2014 and it really was inserted. Note the filter cannot tell you that part."] })) : (_jsxs(_Fragment, { children: [_jsx("strong", { children: "maybe present \u2014 and this one is a false positive." }), " It was never inserted; other keys happened to set all ", k, " of its bits. Now you do a lookup that finds nothing, which costs you time but never correctness."] }))] })), _jsxs("dl", { className: "mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-muted sm:grid-cols-4", children: [_jsxs("div", { children: [_jsx("dt", { className: "text-ink-faint", children: "Inserted" }), _jsxs("dd", { className: "tabular-nums text-ink", children: [inserted.length, " keys"] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-ink-faint", children: "Bits set" }), _jsxs("dd", { className: "tabular-nums text-ink", children: [setCount, "/", BLOOM_BITS] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-ink-faint", children: "False positives (measured)" }), _jsxs("dd", { className: "tabular-nums text-ink", children: [(measured * 100).toFixed(1), "%"] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-ink-faint", children: "Predicted (1\u2212e^(\u2212kn/m))^k" }), _jsxs("dd", { className: "tabular-nums text-ink", children: [(theoretical * 100).toFixed(1), "%"] })] })] }), _jsx("p", { className: "mt-2 text-xs text-ink-muted", children: "The measured and predicted rates track each other, which is how you size one: pick the rate you can live with, then solve for bits per element. Raising k helps until the array fills up, after which more probes only make a saturated filter say \u201Cmaybe\u201D faster." })] }));
}
const WINDOW_SIZE = 20;
const MIN_VOLUME = 10;
const TRIP_RATE = 0.5;
const COOLDOWN_TICKS = 12;
const HALF_OPEN_TRIALS = 3;
/** What one call to a sick dependency costs a caller that has no breaker: a held thread. */
const SLOW_FAILURE_MS = 3000;
export function CircuitBreakerSim() {
    const [healthy, setHealthy] = useState(true);
    const [running, setRunning] = useState(false);
    const [state, setState] = useState('CLOSED');
    const [recent, setRecent] = useState([]);
    const [totals, setTotals] = useState({ success: 0, failure: 0, rejected: 0 });
    // Refs so the interval callback always sees current values without re-subscribing.
    const healthyRef = useRef(healthy);
    const stateRef = useRef(state);
    const recentRef = useRef(recent);
    const cooldownRef = useRef(0);
    const trialsRef = useRef(0);
    healthyRef.current = healthy;
    stateRef.current = state;
    recentRef.current = recent;
    const step = () => {
        let current = stateRef.current;
        if (current === 'OPEN') {
            cooldownRef.current -= 1;
            if (cooldownRef.current <= 0) {
                current = 'HALF_OPEN';
                trialsRef.current = 0;
                setState('HALF_OPEN');
            }
            else {
                // Fail fast. No connection, no thread, no wait — an error the caller can handle now.
                setTotals((t) => ({ ...t, rejected: t.rejected + 1 }));
                setRecent((w) => [...w, 'rejected'].slice(-WINDOW_SIZE));
                return;
            }
        }
        const succeeded = healthyRef.current ? Math.random() > 0.05 : Math.random() > 0.9;
        const outcome = succeeded ? 'success' : 'failure';
        setTotals((t) => ({ ...t, [outcome]: t[outcome] + 1 }));
        const next = [...recentRef.current, outcome].slice(-WINDOW_SIZE);
        setRecent(next);
        if (current === 'HALF_OPEN') {
            if (!succeeded) {
                // One failed trial is enough: the dependency is still sick, re-open immediately.
                setState('OPEN');
                cooldownRef.current = COOLDOWN_TICKS;
                return;
            }
            trialsRef.current += 1;
            if (trialsRef.current >= HALF_OPEN_TRIALS) {
                setState('CLOSED');
                setRecent([]);
            }
            return;
        }
        // CLOSED: trip on the failure *rate*, and only once the window is statistically meaningful.
        const calls = next.filter((item) => item !== 'rejected');
        const failures = calls.filter((item) => item === 'failure').length;
        if (calls.length >= MIN_VOLUME && failures / calls.length >= TRIP_RATE) {
            setState('OPEN');
            cooldownRef.current = COOLDOWN_TICKS;
        }
    };
    useEffect(() => {
        if (!running)
            return undefined;
        const interval = window.setInterval(step, 400);
        return () => window.clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [running]);
    const calls = recent.filter((item) => item !== 'rejected');
    const failures = calls.filter((item) => item === 'failure').length;
    const rate = calls.length ? failures / calls.length : 0;
    const badge = state === 'CLOSED'
        ? 'border-good/50 bg-good/10 text-good'
        : state === 'OPEN'
            ? 'border-bad/50 bg-bad/10 text-bad'
            : 'border-warn/50 bg-warn/10 text-warn';
    return (_jsxs(Card, { children: [_jsx("h3", { className: "mb-1 text-sm font-semibold text-ink", children: "The state machine, running" }), _jsxs("p", { className: "mb-3 text-xs text-ink-muted", children: ["Start the traffic, then break the dependency. Watch the breaker trip on the failure ", _jsx("em", { children: "rate" }), ", fail fast while it is open, and send exactly ", HALF_OPEN_TRIALS, " trial calls before it trusts the thing again."] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setRunning((value) => !value), className: "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white", children: running ? '⏸ Pause traffic' : '▶ Start traffic' }), _jsxs("button", { type: "button", onClick: () => setHealthy((value) => !value), className: `rounded-lg border px-3 py-1.5 text-sm font-medium ${healthy ? 'border-good/50 bg-good/10 text-good' : 'border-bad/50 bg-bad/10 text-bad'}`, children: ["Dependency: ", healthy ? 'healthy ●' : 'failing ✕'] }), _jsx("button", { type: "button", onClick: () => {
                            setRunning(false);
                            setState('CLOSED');
                            setRecent([]);
                            setTotals({ success: 0, failure: 0, rejected: 0 });
                            setHealthy(true);
                            cooldownRef.current = 0;
                            trialsRef.current = 0;
                        }, className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken", children: "Reset" }), _jsx("span", { className: `rounded-lg border px-3 py-1.5 text-sm font-semibold ${badge}`, role: "status", children: state })] }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-1", "aria-label": "Recent call outcomes, oldest first", children: [recent.length === 0 && _jsx("span", { className: "text-xs text-ink-faint", children: "No calls yet." }), recent.map((outcome, index) => (_jsx("span", { title: outcome, className: `h-5 w-5 rounded text-center text-[11px] leading-5 ${outcome === 'success'
                            ? 'bg-good/25 text-good'
                            : outcome === 'failure'
                                ? 'bg-bad/25 text-bad'
                                : 'bg-surface-sunken text-ink-faint'}`, children: outcome === 'success' ? '✓' : outcome === 'failure' ? '✕' : '–' }, index)))] }), _jsxs("dl", { className: "mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-muted sm:grid-cols-4", children: [_jsxs("div", { children: [_jsx("dt", { className: "text-ink-faint", children: "Window failure rate" }), _jsxs("dd", { className: "tabular-nums text-ink", children: [Math.round(rate * 100), "% of ", calls.length, " calls"] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-ink-faint", children: "Trips at" }), _jsxs("dd", { className: "tabular-nums text-ink", children: ["\u2265", TRIP_RATE * 100, "% over \u2265", MIN_VOLUME] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-ink-faint", children: "Served / failed" }), _jsxs("dd", { className: "tabular-nums text-ink", children: [totals.success, " / ", totals.failure] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-ink-faint", children: "Failed fast" }), _jsx("dd", { className: "tabular-nums text-ink", children: totals.rejected })] })] }), _jsx("p", { className: "mt-2 text-xs text-ink-muted", children: totals.rejected > 0 ? (_jsxs(_Fragment, { children: ["Those ", totals.rejected, " rejected calls each returned immediately. Without the breaker they would have sat on a thread for the dependency\u2019s timeout \u2014 at ", SLOW_FAILURE_MS / 1000, "s apiece that is", ' ', _jsxs("strong", { className: "text-ink", children: [((totals.rejected * SLOW_FAILURE_MS) / 1000).toLocaleString(), " thread-seconds"] }), ' ', "not spent waiting on something already known to be broken. That is the capacity that keeps the rest of your service answering."] })) : (_jsx(_Fragment, { children: "The minimum volume matters: 2 failures out of 2 is noise, 10 out of 20 is a signal. A breaker that trips on a raw count makes a quiet endpoint flap on a blip, which costs you availability rather than protecting it." })) })] }));
}
