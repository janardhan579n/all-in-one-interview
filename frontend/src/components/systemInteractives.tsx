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
function hash32(text: string): number {
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

interface RingPoint {
  position: number;
  node: string;
}

export function buildRing(nodes: string[], virtualNodes: number): RingPoint[] {
  const points: RingPoint[] = [];
  for (const node of nodes) {
    for (let replica = 0; replica < virtualNodes; replica++) {
      points.push({ position: hash32(`${node}#${replica}`), node });
    }
  }
  return points.sort((a, b) => a.position - b.position);
}

/** Walk clockwise to the first point at or after the key — the whole trick, in four lines. */
export function ownerOnRing(ring: RingPoint[], position: number): string {
  let low = 0;
  let high = ring.length - 1;
  if (ring.length === 0) return '';
  if (position > ring[high].position) return ring[0].node; // wrapped past the last point
  while (low < high) {
    const mid = (low + high) >> 1;
    if (ring[mid].position < position) low = mid + 1;
    else high = mid;
  }
  return ring[low].node;
}

export function assign(nodes: string[], virtualNodes: number, mode: 'ring' | 'modulo'): Record<string, string> {
  const result: Record<string, string> = {};
  if (nodes.length === 0) return result;
  if (mode === 'modulo') {
    for (const key of RING_KEYS) result[key] = nodes[hash32(key) % nodes.length];
    return result;
  }
  const ring = buildRing(nodes, virtualNodes);
  for (const key of RING_KEYS) result[key] = ownerOnRing(ring, hash32(key));
  return result;
}

export function ConsistentHashingRing() {
  const [nodes, setNodes] = useState(['node-A', 'node-B', 'node-C', 'node-D']);
  const [virtualNodes, setVirtualNodes] = useState(80);
  const [mode, setMode] = useState<'ring' | 'modulo'>('ring');
  const [lastMove, setLastMove] = useState<{ label: string; moved: number; total: number } | null>(null);

  const assignment = useMemo(() => assign(nodes, virtualNodes, mode), [nodes, virtualNodes, mode]);

  const counts = useMemo(() => {
    const tally = new Map(nodes.map((node) => [node, 0]));
    for (const key of RING_KEYS) tally.set(assignment[key], (tally.get(assignment[key]) ?? 0) + 1);
    return tally;
  }, [assignment, nodes]);

  /** The ring drawn as 240 arcs, each coloured by whoever owns that position. */
  const segments = useMemo(() => {
    if (mode === 'modulo' || nodes.length === 0) return [];
    const ring = buildRing(nodes, virtualNodes);
    return Array.from({ length: 240 }, (_, index) => ownerOnRing(ring, (index / 240) * RING_SPACE));
  }, [nodes, virtualNodes, mode]);

  const colourOf = (node: string) => NODE_COLOURS[Math.max(0, nodes.indexOf(node)) % NODE_COLOURS.length];

  const change = (nextNodes: string[], label: string) => {
    const before = assignment;
    const after = assign(nextNodes, virtualNodes, mode);
    let moved = 0;
    for (const key of RING_KEYS) if (before[key] !== after[key]) moved++;
    setLastMove({ label, moved, total: RING_KEYS.length });
    setNodes(nextNodes);
  };

  const addNode = () => {
    if (nodes.length >= 6) return;
    const name = `node-${String.fromCharCode(65 + nodes.length)}`;
    change([...nodes, name], `added ${name} (${nodes.length} → ${nodes.length + 1} nodes)`);
  };

  const removeNode = () => {
    if (nodes.length <= 2) return;
    const dying = nodes[nodes.length - 1];
    change(nodes.slice(0, -1), `removed ${dying} (${nodes.length} → ${nodes.length - 1} nodes)`);
  };

  const spread = [...counts.values()];
  const imbalance = spread.length
    ? Math.round(((Math.max(...spread) - Math.min(...spread)) / (RING_KEYS.length / spread.length)) * 100)
    : 0;

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-ink">The ring, and what a new node actually costs you</h3>
      <p className="mb-3 text-xs text-ink-muted">
        600 real keys, really hashed. Switch to <strong className="text-ink">hash % N</strong>, add a node, and read the
        number that comes back — that is the cache you just threw away.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as typeof mode)}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          aria-label="Placement strategy"
        >
          <option value="ring">Consistent hashing (ring)</option>
          <option value="modulo">Naive hash % N</option>
        </select>
        <button
          type="button"
          onClick={addNode}
          disabled={nodes.length >= 6}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          + Add a node
        </button>
        <button
          type="button"
          onClick={removeNode}
          disabled={nodes.length <= 2}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken disabled:opacity-40"
        >
          − Remove a node
        </button>
      </div>

      {mode === 'ring' && (
        <label className="mt-3 flex items-center gap-3 text-xs text-ink-muted">
          <span className="w-32 shrink-0">Virtual nodes: {virtualNodes}</span>
          <input
            type="range"
            min={1}
            max={200}
            value={virtualNodes}
            onChange={(event) => setVirtualNodes(Number(event.target.value))}
            className="flex-1"
            aria-label="Virtual nodes per physical node"
          />
        </label>
      )}

      {lastMove && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            lastMove.moved / lastMove.total > 0.5
              ? 'border-bad/50 bg-bad/10 text-bad'
              : 'border-good/50 bg-good/10 text-good'
          }`}
          role="status"
        >
          <strong>{lastMove.label}:</strong> {lastMove.moved} of {lastMove.total} keys changed owner (
          {Math.round((lastMove.moved / lastMove.total) * 100)}%).{' '}
          {lastMove.moved / lastMove.total > 0.5
            ? 'Every one of those is a cache miss you caused by adding capacity.'
            : 'Only the keys in the new node’s arc moved — the rest never noticed.'}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr]">
        <div className="flex items-center justify-center">
          {mode === 'ring' ? (
            <svg viewBox="0 0 200 200" className="h-44 w-44" role="img" aria-label="Hash ring ownership by position">
              {segments.map((node, index) => {
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
                return (
                  <path
                    key={index}
                    d={`M${x1} ${y1} A${outer} ${outer} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${inner} ${inner} 0 0 0 ${x4} ${y4} Z`}
                    fill={colourOf(node)}
                  />
                );
              })}
              <text x="100" y="104" textAnchor="middle" fontSize={10} fill="rgb(var(--ink))">
                {virtualNodes === 1 ? '1 point each' : `${virtualNodes} points each`}
              </text>
            </svg>
          ) : (
            <p className="max-w-[180px] text-center text-xs text-ink-muted">
              There is no ring. <code>hash(key) % N</code> computes an owner from scratch every time, which is exactly
              why changing N rewrites almost every answer.
            </p>
          )}
        </div>

        <div className="space-y-2">
          {nodes.map((node) => {
            const count = counts.get(node) ?? 0;
            return (
              <div key={node} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-medium text-ink">{node}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-surface-sunken">
                  <div
                    className="h-full transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${(count / RING_KEYS.length) * 100}%`, background: colourOf(node) }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-ink-muted">
                  {count} ({Math.round((count / RING_KEYS.length) * 100)}%)
                </span>
              </div>
            );
          })}
          <p className="pt-1 text-xs text-ink-muted">
            Spread between the busiest and quietest node: <strong className="text-ink">{imbalance}%</strong> of a fair
            share.{' '}
            {mode === 'ring' && virtualNodes <= 4
              ? 'With this few points per node the ring is carved into a handful of uneven arcs — this is the problem virtual nodes exist to fix. Drag the slider up.'
              : mode === 'ring'
                ? 'Many small arcs per node average out, which is the second job virtual nodes do.'
                : 'Modulo distributes evenly — evenness was never the thing it got wrong.'}
          </p>
        </div>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ bloom filter

export const BLOOM_BITS = 64;
const BLOOM_SEED = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];

/** Double hashing: k indices from two base hashes, the standard way to avoid k real hash functions. */
export function bloomIndices(value: string, k: number): number[] {
  const h1 = hash32(value);
  const h2 = hash32(`${value}#salt`) | 1;
  return Array.from({ length: k }, (_, i) => (((h1 + Math.imul(i, h2)) >>> 0) % BLOOM_BITS));
}

export function BloomFilterSim() {
  const [k, setK] = useState(3);
  const [inserted, setInserted] = useState<string[]>(BLOOM_SEED);
  const [input, setInput] = useState('foxtrot');
  const [probe, setProbe] = useState<{ value: string; indices: number[]; present: boolean; truth: boolean } | null>(null);

  const bits = useMemo(() => {
    const array = new Uint8Array(BLOOM_BITS);
    for (const value of inserted) for (const index of bloomIndices(value, k)) array[index] = 1;
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
      if (members.has(candidate)) continue;
      trials++;
      if (bloomIndices(candidate, k).every((position) => bits[position] === 1)) positives++;
    }
    return trials === 0 ? 0 : positives / trials;
  }, [bits, inserted, k]);

  const theoretical = (1 - Math.exp((-k * inserted.length) / BLOOM_BITS)) ** k;

  const add = () => {
    const value = input.trim();
    if (!value || inserted.includes(value)) return;
    setInserted([...inserted, value]);
    setProbe(null);
  };

  const query = () => {
    const value = input.trim();
    if (!value) return;
    const indices = bloomIndices(value, k);
    setProbe({
      value,
      indices,
      present: indices.every((index) => bits[index] === 1),
      truth: inserted.includes(value),
    });
  };

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-ink">A real {BLOOM_BITS}-bit filter</h3>
      <p className="mb-3 text-xs text-ink-muted">
        Keep adding words to {BLOOM_BITS} bits and watch a word you never inserted come back “maybe present”. The filter
        is not broken when that happens — that is the deal you signed.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') query();
          }}
          className="w-40 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          aria-label="Word to insert or look up"
          placeholder="a word"
        />
        <button type="button" onClick={add} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">
          Insert
        </button>
        <button
          type="button"
          onClick={query}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken"
        >
          Look up
        </button>
        <button
          type="button"
          onClick={() => {
            setInserted(BLOOM_SEED);
            setProbe(null);
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken"
        >
          Reset
        </button>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          k = {k}
          <input
            type="range"
            min={1}
            max={6}
            value={k}
            onChange={(event) => {
              setK(Number(event.target.value));
              setProbe(null);
            }}
            aria-label="Number of hash functions"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-1" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
        {Array.from(bits).map((bit, index) => {
          const probed = probe?.indices.includes(index);
          return (
            <div
              key={index}
              title={`bit ${index}`}
              className={`flex h-6 items-center justify-center rounded text-[10px] tabular-nums ${
                bit ? 'bg-brand text-white' : 'bg-surface-sunken text-ink-faint'
              } ${probed ? 'outline outline-2 outline-offset-1 outline-warn' : ''}`}
            >
              {bit}
            </div>
          );
        })}
      </div>

      {probe && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            !probe.present
              ? 'border-good/50 bg-good/10 text-good'
              : probe.truth
                ? 'border-info/50 bg-info/10 text-info'
                : 'border-bad/50 bg-bad/10 text-bad'
          }`}
          role="status"
        >
          <strong>“{probe.value}”</strong> probes bits {probe.indices.join(', ')} →{' '}
          {!probe.present ? (
            <>
              <strong>definitely not present.</strong> One of those bits is 0, and an inserted key would have set all of
              them. This answer is never wrong — that is the guarantee you are buying.
            </>
          ) : probe.truth ? (
            <>
              <strong>maybe present</strong> — and it really was inserted. Note the filter cannot tell you that part.
            </>
          ) : (
            <>
              <strong>maybe present — and this one is a false positive.</strong> It was never inserted; other keys
              happened to set all {k} of its bits. Now you do a lookup that finds nothing, which costs you time but
              never correctness.
            </>
          )}
        </div>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-muted sm:grid-cols-4">
        <div>
          <dt className="text-ink-faint">Inserted</dt>
          <dd className="tabular-nums text-ink">{inserted.length} keys</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Bits set</dt>
          <dd className="tabular-nums text-ink">
            {setCount}/{BLOOM_BITS}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">False positives (measured)</dt>
          <dd className="tabular-nums text-ink">{(measured * 100).toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Predicted (1−e^(−kn/m))^k</dt>
          <dd className="tabular-nums text-ink">{(theoretical * 100).toFixed(1)}%</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-ink-muted">
        The measured and predicted rates track each other, which is how you size one: pick the rate you can live with,
        then solve for bits per element. Raising k helps until the array fills up, after which more probes only make a
        saturated filter say “maybe” faster.
      </p>
    </Card>
  );
}

// --------------------------------------------------------------- circuit breaker

type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
type Outcome = 'success' | 'failure' | 'rejected';

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
  const [state, setState] = useState<BreakerState>('CLOSED');
  const [recent, setRecent] = useState<Outcome[]>([]);
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
      } else {
        // Fail fast. No connection, no thread, no wait — an error the caller can handle now.
        setTotals((t) => ({ ...t, rejected: t.rejected + 1 }));
        setRecent((w) => [...w, 'rejected' as Outcome].slice(-WINDOW_SIZE));
        return;
      }
    }

    const succeeded = healthyRef.current ? Math.random() > 0.05 : Math.random() > 0.9;
    const outcome: Outcome = succeeded ? 'success' : 'failure';
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
    if (!running) return undefined;
    const interval = window.setInterval(step, 400);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const calls = recent.filter((item) => item !== 'rejected');
  const failures = calls.filter((item) => item === 'failure').length;
  const rate = calls.length ? failures / calls.length : 0;

  const badge =
    state === 'CLOSED'
      ? 'border-good/50 bg-good/10 text-good'
      : state === 'OPEN'
        ? 'border-bad/50 bg-bad/10 text-bad'
        : 'border-warn/50 bg-warn/10 text-warn';

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-ink">The state machine, running</h3>
      <p className="mb-3 text-xs text-ink-muted">
        Start the traffic, then break the dependency. Watch the breaker trip on the failure <em>rate</em>, fail fast
        while it is open, and send exactly {HALF_OPEN_TRIALS} trial calls before it trusts the thing again.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((value) => !value)}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white"
        >
          {running ? '⏸ Pause traffic' : '▶ Start traffic'}
        </button>
        <button
          type="button"
          onClick={() => setHealthy((value) => !value)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            healthy ? 'border-good/50 bg-good/10 text-good' : 'border-bad/50 bg-bad/10 text-bad'
          }`}
        >
          Dependency: {healthy ? 'healthy ●' : 'failing ✕'}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setState('CLOSED');
            setRecent([]);
            setTotals({ success: 0, failure: 0, rejected: 0 });
            setHealthy(true);
            cooldownRef.current = 0;
            trialsRef.current = 0;
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken"
        >
          Reset
        </button>
        <span className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${badge}`} role="status">
          {state}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1" aria-label="Recent call outcomes, oldest first">
        {recent.length === 0 && <span className="text-xs text-ink-faint">No calls yet.</span>}
        {recent.map((outcome, index) => (
          <span
            key={index}
            title={outcome}
            className={`h-5 w-5 rounded text-center text-[11px] leading-5 ${
              outcome === 'success'
                ? 'bg-good/25 text-good'
                : outcome === 'failure'
                  ? 'bg-bad/25 text-bad'
                  : 'bg-surface-sunken text-ink-faint'
            }`}
          >
            {outcome === 'success' ? '✓' : outcome === 'failure' ? '✕' : '–'}
          </span>
        ))}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-muted sm:grid-cols-4">
        <div>
          <dt className="text-ink-faint">Window failure rate</dt>
          <dd className="tabular-nums text-ink">
            {Math.round(rate * 100)}% of {calls.length} calls
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">Trips at</dt>
          <dd className="tabular-nums text-ink">
            ≥{TRIP_RATE * 100}% over ≥{MIN_VOLUME}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">Served / failed</dt>
          <dd className="tabular-nums text-ink">
            {totals.success} / {totals.failure}
          </dd>
        </div>
        <div>
          <dt className="text-ink-faint">Failed fast</dt>
          <dd className="tabular-nums text-ink">{totals.rejected}</dd>
        </div>
      </dl>

      <p className="mt-2 text-xs text-ink-muted">
        {totals.rejected > 0 ? (
          <>
            Those {totals.rejected} rejected calls each returned immediately. Without the breaker they would have sat on
            a thread for the dependency’s timeout — at {SLOW_FAILURE_MS / 1000}s apiece that is{' '}
            <strong className="text-ink">
              {((totals.rejected * SLOW_FAILURE_MS) / 1000).toLocaleString()} thread-seconds
            </strong>{' '}
            not spent waiting on something already known to be broken. That is the capacity that keeps the rest of your
            service answering.
          </>
        ) : (
          <>
            The minimum volume matters: 2 failures out of 2 is noise, 10 out of 20 is a signal. A breaker that trips on a
            raw count makes a quiet endpoint flap on a blip, which costs you availability rather than protecting it.
          </>
        )}
      </p>
    </Card>
  );
}
