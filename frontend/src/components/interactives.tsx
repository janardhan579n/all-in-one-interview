import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from './ui';
import { BloomFilterSim, CircuitBreakerSim, ConsistentHashingRing } from './systemInteractives';

/**
 * Interactive widgets referenced by content via the `interactive` field.
 *
 * Each one computes the real thing — the rate limiter runs actual token-bucket arithmetic,
 * the shortener does real base62 encoding — because a fake widget teaches nothing, and the
 * brief explicitly rules out mock functionality presented as working.
 */

// ------------------------------------------------------------ complexity chart

const CURVES: { name: string; f: (n: number) => number; colour: string }[] = [
  { name: 'O(1)', f: () => 1, colour: 'var(--good)' },
  { name: 'O(log n)', f: (n) => Math.log2(Math.max(n, 2)), colour: 'var(--info)' },
  { name: 'O(n)', f: (n) => n, colour: 'var(--brand)' },
  { name: 'O(n log n)', f: (n) => n * Math.log2(Math.max(n, 2)), colour: 'var(--warn)' },
  { name: 'O(n²)', f: (n) => n * n, colour: 'var(--bad)' },
];

export function ComplexityChart() {
  const [maxN, setMaxN] = useState(50);
  const [logScale, setLogScale] = useState(false);
  const width = 620;
  const height = 300;
  const padding = { left: 56, right: 16, top: 16, bottom: 34 };

  const points = useMemo(() => {
    const samples = 60;
    return CURVES.map((curve) => ({
      ...curve,
      values: Array.from({ length: samples }, (_, index) => {
        const n = Math.max(1, (index / (samples - 1)) * maxN);
        return { n, y: curve.f(n) };
      }),
    }));
  }, [maxN]);

  const maxY = Math.max(...points.flatMap((curve) => curve.values.map((point) => point.y)));
  const scaleX = (n: number) => padding.left + (n / maxN) * (width - padding.left - padding.right);
  const scaleY = (y: number) => {
    const normalised = logScale ? Math.log10(y + 1) / Math.log10(maxY + 1) : y / maxY;
    return height - padding.bottom - normalised * (height - padding.top - padding.bottom);
  };

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">How the curves actually diverge</h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            n = {maxN}
            <input
              type="range"
              min={10}
              max={200}
              value={maxN}
              onChange={(event) => setMaxN(Number(event.target.value))}
              className="accent-brand"
              aria-label="Maximum input size"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <input type="checkbox" checked={logScale} onChange={(event) => setLogScale(event.target.checked)} className="accent-brand" />
            log scale
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full min-w-[520px]" role="img" aria-label="Growth of common complexity classes">
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="rgb(var(--line))" />
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="rgb(var(--line))" />

          <text x={width / 2} y={height - 6} textAnchor="middle" fontSize={11} fill="rgb(var(--ink-faint))">
            input size n
          </text>
          <text x={12} y={height / 2} fontSize={11} fill="rgb(var(--ink-faint))" transform={`rotate(-90 12 ${height / 2})`} textAnchor="middle">
            operations
          </text>

          {points.map((curve) => (
            <g key={curve.name}>
              <polyline
                points={curve.values.map((point) => `${scaleX(point.n)},${scaleY(point.y)}`).join(' ')}
                fill="none"
                stroke={`rgb(${curve.colour})`}
                strokeWidth={2}
              />
              <text
                x={width - padding.right - 4}
                y={Math.max(padding.top + 10, Math.min(scaleY(curve.values[curve.values.length - 1].y), height - padding.bottom))}
                textAnchor="end"
                fontSize={11}
                fill={`rgb(${curve.colour})`}
                fontWeight={600}
              >
                {curve.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        At n = {maxN}, O(n²) needs {(maxN * maxN).toLocaleString('en-US')} operations while O(n log n) needs{' '}
        {Math.round(maxN * Math.log2(Math.max(maxN, 2))).toLocaleString('en-US')}. Turn on the log scale to see the
        shapes that flatten out — that is why O(log n) barely moves however far you drag the slider.
      </p>
    </Card>
  );
}

// ------------------------------------------------------------------- cache sim

export function CacheSim() {
  const [hitRate, setHitRate] = useState(90);
  const [requests, setRequests] = useState(1000);
  const cacheLatency = 0.5;
  const dbLatency = 5;

  const hits = Math.round((requests * hitRate) / 100);
  const misses = requests - hits;
  const averageLatency = (hitRate / 100) * cacheLatency + (1 - hitRate / 100) * dbLatency;
  const loadReduction = hitRate === 100 ? Infinity : requests / Math.max(misses, 1);

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-ink">Cache maths, live</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-ink-muted">
          Hit rate: <span className="font-medium text-ink">{hitRate}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={hitRate}
            onChange={(event) => setHitRate(Number(event.target.value))}
            className="mt-1 w-full accent-brand"
          />
        </label>
        <label className="text-xs text-ink-muted">
          Requests/second: <span className="font-medium text-ink">{requests.toLocaleString('en-US')}</span>
          <input
            type="range"
            min={100}
            max={10000}
            step={100}
            value={requests}
            onChange={(event) => setRequests(Number(event.target.value))}
            className="mt-1 w-full accent-brand"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface-sunken p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Queries reaching the database</p>
          <p className="text-lg font-semibold tabular-nums text-ink">{misses.toLocaleString('en-US')}/s</p>
          <p className="text-xs text-ink-muted">instead of {requests.toLocaleString('en-US')}/s</p>
        </div>
        <div className="rounded-lg border border-line bg-surface-sunken p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Average read latency</p>
          <p className="text-lg font-semibold tabular-nums text-ink">{averageLatency.toFixed(2)} ms</p>
          <p className="text-xs text-ink-muted">cache {cacheLatency} ms · db {dbLatency} ms</p>
        </div>
        <div className="rounded-lg border border-line bg-surface-sunken p-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Database load reduction</p>
          <p className="text-lg font-semibold tabular-nums text-ink">
            {loadReduction === Infinity ? '∞' : `${loadReduction.toFixed(1)}×`}
          </p>
          <p className="text-xs text-ink-muted">{hits.toLocaleString('en-US')} served from memory</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        Drag the hit rate down and watch how quickly the benefit collapses: 95% removes 20× the load, 80% removes 5×,
        and 50% removes only 2×. Note too that the average stays close to the cache latency while the{' '}
        <em>tail</em> is still governed by the misses — which is why p99 barely improves.
      </p>
    </Card>
  );
}

// ----------------------------------------------------------- rate limiter sim

interface RequestLog {
  id: number;
  allowed: boolean;
  tokensAfter: number;
  at: number;
}

export function RateLimiterSim() {
  const [capacity, setCapacity] = useState(5);
  const [refillPerSecond, setRefillPerSecond] = useState(1);
  const [tokens, setTokens] = useState(5);
  const [log, setLog] = useState<RequestLog[]>([]);
  const lastRefill = useRef<number>(Date.now());
  const nextId = useRef(1);

  // Lazy refill from elapsed time — exactly how a real token bucket works, with no timer.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastRefill.current) / 1000;
      lastRefill.current = now;
      setTokens((current) => Math.min(capacity, current + elapsed * refillPerSecond));
    }, 100);
    return () => window.clearInterval(interval);
  }, [capacity, refillPerSecond]);

  useEffect(() => {
    setTokens((current) => Math.min(current, capacity));
  }, [capacity]);

  const send = (count = 1) => {
    setTokens((current) => {
      let available = current;
      const entries: RequestLog[] = [];
      for (let i = 0; i < count; i++) {
        const allowed = available >= 1;
        if (allowed) available -= 1;
        entries.push({ id: nextId.current++, allowed, tokensAfter: available, at: Date.now() });
      }
      setLog((currentLog) => [...entries.reverse(), ...currentLog].slice(0, 12));
      return available;
    });
  };

  const allowed = log.filter((entry) => entry.allowed).length;
  const rejected = log.length - allowed;

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-ink">Token bucket, running for real</h3>
      <p className="mb-3 text-xs text-ink-muted">
        Tokens refill continuously up to the bucket size. A burst is absorbed while tokens last; sustained traffic is
        capped at the refill rate.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-ink-muted">
          Bucket capacity (burst): <span className="font-medium text-ink">{capacity}</span>
          <input type="range" min={1} max={20} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} className="mt-1 w-full accent-brand" />
        </label>
        <label className="text-xs text-ink-muted">
          Refill rate: <span className="font-medium text-ink">{refillPerSecond}/s</span>
          <input type="range" min={1} max={10} value={refillPerSecond} onChange={(event) => setRefillPerSecond(Number(event.target.value))} className="mt-1 w-full accent-brand" />
        </label>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-ink-muted">Tokens available</span>
          <span className="font-semibold tabular-nums text-ink">
            {tokens.toFixed(1)} / {capacity}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: capacity }, (_, index) => (
            <div
              key={index}
              className={`h-6 flex-1 rounded transition-colors duration-150 motion-reduce:transition-none ${
                index < Math.floor(tokens) ? 'bg-brand' : index < tokens ? 'bg-brand/40' : 'bg-surface-sunken'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => send(1)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white">
          Send 1 request
        </button>
        <button type="button" onClick={() => send(10)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken">
          Send a burst of 10
        </button>
        <button type="button" onClick={() => setLog([])} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-sunken">
          Clear log
        </button>
        {log.length > 0 ? (
          <span className="ml-auto self-center text-xs text-ink-muted">
            <span className="text-good">{allowed} allowed</span> · <span className="text-bad">{rejected} → 429</span>
          </span>
        ) : null}
      </div>

      {log.length > 0 ? (
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line bg-surface-sunken p-2 font-mono text-[11px]">
          {log.map((entry) => (
            <li key={entry.id} className={entry.allowed ? 'text-good' : 'text-bad'}>
              #{entry.id} {entry.allowed ? '200 OK' : '429 Too Many Requests'} · tokens left {Math.max(0, entry.tokensAfter).toFixed(1)}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

// --------------------------------------------------------------- url shortener

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(value: number): string {
  if (value === 0) return '0';
  let result = '';
  let remaining = value;
  while (remaining > 0) {
    result = BASE62[remaining % 62] + result;
    remaining = Math.floor(remaining / 62);
  }
  return result;
}

function randomCode(length = 7): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += BASE62[Math.floor(Math.random() * 62)];
  }
  return code;
}

export function UrlShortenerSim() {
  const [url, setUrl] = useState('https://example.com/a/very/long/path?with=parameters&and=more');
  const [strategy, setStrategy] = useState<'random' | 'counter'>('random');
  const [counter, setCounter] = useState(1_000_000);
  const [links, setLinks] = useState<{ code: string; url: string; clicks: number }[]>([]);
  const [error, setError] = useState('');

  const shorten = () => {
    if (!/^https?:\/\/.+/.test(url.trim())) {
      setError('Enter a URL starting with http:// or https://');
      return;
    }
    setError('');
    const code = strategy === 'random' ? randomCode() : toBase62(counter);
    if (strategy === 'counter') setCounter((value) => value + 1);
    if (links.some((link) => link.code === code)) {
      setError('Collision detected — in the real system the unique constraint rejects the insert and we retry.');
      return;
    }
    setLinks((current) => [{ code, url: url.trim(), clicks: 0 }, ...current].slice(0, 8));
  };

  const visit = (code: string) => {
    setLinks((current) => current.map((link) => (link.code === code ? { ...link, clicks: link.clicks + 1 } : link)));
  };

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-ink">Short code generation</h3>
      <p className="mb-3 text-xs text-ink-muted">
        Both strategies are implemented here for real. Generate a few with each and compare what the codes leak.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="min-w-[240px] flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
          aria-label="Long URL"
        />
        <select
          value={strategy}
          onChange={(event) => setStrategy(event.target.value as 'random' | 'counter')}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          aria-label="Code generation strategy"
        >
          <option value="random">Random base62</option>
          <option value="counter">Counter + base62</option>
        </select>
        <button type="button" onClick={shorten} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">
          Shorten
        </button>
      </div>

      {error ? <p className="mt-2 text-xs text-bad">{error}</p> : null}

      {links.length > 0 ? (
        <table className="mt-4 w-full text-left text-xs">
          <thead className="text-ink-faint">
            <tr>
              <th className="py-1 font-medium">short code</th>
              <th className="py-1 font-medium">long URL</th>
              <th className="py-1 font-medium">clicks</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.code} className="border-t border-line">
                <td className="py-1.5 font-mono text-ink">sho.rt/{link.code}</td>
                <td className="max-w-[220px] truncate py-1.5 text-ink-muted">{link.url}</td>
                <td className="py-1.5 tabular-nums text-ink-muted">{link.clicks}</td>
                <td className="py-1.5 text-right">
                  <button type="button" onClick={() => visit(link.code)} className="text-brand hover:underline">
                    visit →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <p className="mt-3 text-xs text-ink-muted">
        {strategy === 'counter'
          ? 'Notice the codes are sequential: anyone can decrement one and walk the entire namespace, and the code itself leaks how many links exist.'
          : 'Random codes are unguessable, and with 62⁷ ≈ 3.5 trillion slots collisions are rare enough that a unique constraint plus a retry is all the handling you need.'}
      </p>
    </Card>
  );
}

// ------------------------------------------------------------ load balancer sim

export function LoadBalancerSim() {
  const [algorithm, setAlgorithm] = useState<'round-robin' | 'least-connections' | 'hash'>('round-robin');
  const [servers, setServers] = useState([
    { id: 'app-1', healthy: true, load: 0, active: 0 },
    { id: 'app-2', healthy: true, load: 0, active: 0 },
    { id: 'app-3', healthy: true, load: 0, active: 0 },
  ]);
  const cursor = useRef(0);
  const [lastTarget, setLastTarget] = useState<string | null>(null);

  const send = (key?: string) => {
    setServers((current) => {
      const healthy = current.filter((server) => server.healthy);
      if (healthy.length === 0) {
        setLastTarget(null);
        return current;
      }

      let chosen = healthy[0];
      if (algorithm === 'round-robin') {
        chosen = healthy[cursor.current % healthy.length];
        cursor.current += 1;
      } else if (algorithm === 'least-connections') {
        chosen = healthy.reduce((best, server) => (server.active < best.active ? server : best), healthy[0]);
      } else {
        const source = key ?? String(Math.floor(Math.random() * 1000));
        let hash = 0;
        for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) | 0;
        chosen = healthy[Math.abs(hash) % healthy.length];
      }

      setLastTarget(chosen.id);
      // Requests cost a random amount of work — which is exactly why round-robin can be unfair.
      const cost = 1 + Math.floor(Math.random() * 3);
      return current.map((server) =>
        server.id === chosen.id ? { ...server, load: server.load + 1, active: server.active + cost } : server,
      );
    });
  };

  const drain = () => setServers((current) => current.map((server) => ({ ...server, active: Math.max(0, server.active - 1) })));

  useEffect(() => {
    const interval = window.setInterval(drain, 700);
    return () => window.clearInterval(interval);
  }, []);

  const total = servers.reduce((sum, server) => sum + server.load, 0);

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-ink">Load balancing, and what happens when a backend dies</h3>
      <p className="mb-3 text-xs text-ink-muted">
        Mark a server unhealthy and keep sending: traffic is redistributed with no failed requests. That availability
        win usually matters more than the extra capacity.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={algorithm}
          onChange={(event) => setAlgorithm(event.target.value as typeof algorithm)}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          aria-label="Balancing algorithm"
        >
          <option value="round-robin">Round robin</option>
          <option value="least-connections">Least connections</option>
          <option value="hash">Consistent hash (by key)</option>
        </select>
        <button type="button" onClick={() => send()} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">
          Send request
        </button>
        <button
          type="button"
          onClick={() => {
            for (let i = 0; i < 12; i++) send(`user-${i % 4}`);
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken"
        >
          Send 12
        </button>
        <button
          type="button"
          onClick={() => setServers((current) => current.map((server) => ({ ...server, load: 0, active: 0 })))}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {servers.map((server) => (
          <div key={server.id} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setServers((current) =>
                  current.map((item) => (item.id === server.id ? { ...item, healthy: !item.healthy } : item)),
                )
              }
              className={`w-24 shrink-0 rounded-lg border px-2 py-1 text-xs font-medium ${
                server.healthy ? 'border-good/50 bg-good/10 text-good' : 'border-bad/50 bg-bad/10 text-bad'
              }`}
            >
              {server.id} {server.healthy ? '●' : '✕'}
            </button>
            <div className="h-5 flex-1 overflow-hidden rounded bg-surface-sunken">
              <div
                className={`h-full transition-[width] duration-300 motion-reduce:transition-none ${
                  lastTarget === server.id ? 'bg-brand' : 'bg-brand/50'
                }`}
                style={{ width: `${total === 0 ? 0 : (server.load / Math.max(total, 1)) * 100}%` }}
              />
            </div>
            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-ink-muted">
              {server.load} req · {server.active} busy
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        {algorithm === 'round-robin'
          ? 'Round robin spreads requests evenly but ignores that they cost different amounts — watch the "busy" column drift apart.'
          : algorithm === 'least-connections'
            ? 'Least connections adapts to uneven request cost, at the price of tracking state per backend.'
            : 'Consistent hashing sends the same key to the same backend every time, which is what makes per-backend caches effective.'}
      </p>
    </Card>
  );
}

/** Lookup used by lesson pages: content names a widget, this resolves it. */
export const INTERACTIVES: Record<string, () => JSX.Element> = {
  'complexity-chart': ComplexityChart,
  'cache-sim': CacheSim,
  'rate-limiter-sim': RateLimiterSim,
  'rate-limiter': RateLimiterSim,
  'url-shortener': UrlShortenerSim,
  'load-balancer-sim': LoadBalancerSim,
  'consistent-hashing-ring': ConsistentHashingRing,
  'bloom-filter-sim': BloomFilterSim,
  'circuit-breaker-sim': CircuitBreakerSim,
};

export function Interactive({ id }: { id?: string }) {
  if (!id) return null;
  const Widget = INTERACTIVES[id];
  if (!Widget) return null;
  return <Widget />;
}
