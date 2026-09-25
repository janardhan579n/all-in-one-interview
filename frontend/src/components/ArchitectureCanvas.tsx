import { useEffect, useRef, useState } from 'react';
import type { Architecture, DiagramNode } from '../types';
import { Callout } from './ui';

/**
 * Interactive architecture diagram.
 *
 * Hand-rolled SVG rather than a flow library (ADR-005): we need request packets travelling
 * along edges and diffs between evolution stages, and both are easier to do directly than to
 * bend a general-purpose library into. Coordinates are authored in the content JSON on a
 * 1000×600 canvas and scaled to fit.
 */

const NODE_STYLE: Record<string, { glyph: string; fill: string; stroke: string }> = {
  client: { glyph: '🖥', fill: 'var(--info)', stroke: 'var(--info)' },
  dns: { glyph: '🧭', fill: 'var(--info)', stroke: 'var(--info)' },
  cdn: { glyph: '🌍', fill: 'var(--good)', stroke: 'var(--good)' },
  lb: { glyph: '⚖', fill: 'var(--brand)', stroke: 'var(--brand)' },
  proxy: { glyph: '🚦', fill: 'var(--brand)', stroke: 'var(--brand)' },
  server: { glyph: '⚙', fill: 'var(--brand)', stroke: 'var(--brand)' },
  worker: { glyph: '🔧', fill: 'var(--brand)', stroke: 'var(--brand)' },
  cache: { glyph: '⚡', fill: 'var(--warn)', stroke: 'var(--warn)' },
  db: { glyph: '🗄', fill: 'var(--good)', stroke: 'var(--good)' },
  replica: { glyph: '🗄', fill: 'var(--good)', stroke: 'var(--good)' },
  queue: { glyph: '📥', fill: 'var(--warn)', stroke: 'var(--warn)' },
  storage: { glyph: '📦', fill: 'var(--good)', stroke: 'var(--good)' },
  search: { glyph: '🔍', fill: 'var(--info)', stroke: 'var(--info)' },
  monitor: { glyph: '📡', fill: 'var(--bad)', stroke: 'var(--bad)' },
};

const NODE_WIDTH = 148;
const NODE_HEIGHT = 62;

function styleFor(type: string) {
  return NODE_STYLE[type] ?? { glyph: '◆', fill: 'var(--ink-faint)', stroke: 'var(--line)' };
}

/** Trim the line so it stops at the node's edge rather than under it. */
function trim(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const padFrom = Math.min(NODE_WIDTH / 2 + 6, distance / 2);
  const padTo = Math.min(NODE_WIDTH / 2 + 12, distance / 2);
  return {
    x1: from.x + (dx / distance) * padFrom,
    y1: from.y + (dy / distance) * padFrom,
    x2: to.x - (dx / distance) * padTo,
    y2: to.y - (dy / distance) * padTo,
  };
}

export function ArchitectureCanvas({
  architecture,
  highlightNodes = [],
  title,
}: {
  architecture: Architecture;
  /** Node ids introduced at this stage — drawn with an emphasised outline. */
  highlightNodes?: string[];
  title?: string;
}) {
  const [selected, setSelected] = useState<DiagramNode | null>(null);
  const [flowing, setFlowing] = useState(false);
  const [t, setT] = useState(0);
  const frame = useRef<number | null>(null);

  const byId = new Map(architecture.nodes.map((node) => [node.id, node]));
  const solidEdges = architecture.edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to));

  useEffect(() => {
    setSelected(null);
    setFlowing(false);
    setT(0);
  }, [architecture]);

  useEffect(() => {
    if (!flowing) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setFlowing(false);
      return undefined;
    }

    let start: number | null = null;
    const duration = solidEdges.length * 900;

    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = (now - start) / duration;
      if (progress >= 1) {
        setT(0);
        setFlowing(false);
        return;
      }
      setT(progress);
      frame.current = window.requestAnimationFrame(tick);
    };

    frame.current = window.requestAnimationFrame(tick);
    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, [flowing, solidEdges.length]);

  // Position of the travelling request packet along the edge sequence.
  let packet: { x: number; y: number } | null = null;
  if (flowing && solidEdges.length > 0) {
    const scaled = t * solidEdges.length;
    const index = Math.min(Math.floor(scaled), solidEdges.length - 1);
    const local = scaled - index;
    const edge = solidEdges[index];
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (from && to) {
      packet = { x: from.x + (to.x - from.x) * local, y: from.y + (to.y - from.y) * local };
    }
  }

  const highlighted = new Set(highlightNodes);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h4 className="text-sm font-medium text-ink">{title ?? 'Architecture'}</h4>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-ink-faint sm:inline">Click any component to see why it is there</span>
          <button
            type="button"
            onClick={() => {
              setT(0);
              setFlowing(true);
            }}
            disabled={flowing || solidEdges.length === 0}
            className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-surface-sunken disabled:opacity-50"
          >
            ▶ Send a request
          </button>
        </div>
      </div>

      {/*
        The canvas is hand-authored in content JSON at fixed node coordinates on a 1120×600
        grid. Rather than forcing a min-width and letting the diagram spill into a horizontally
        scrolling strip (unusable on a phone, where you cannot see the whole system at once),
        the viewBox lets the SVG scale down as one image to whatever width it is given — labels
        get small on a phone, same as the rest of a zoomed-out diagram would, but every node and
        edge stays visible and tapping a node still opens the full-text detail panel below.
      */}
      <div className="bg-surface-sunken/40">
        <svg
          viewBox="0 0 1120 600"
          className="aspect-[1120/600] w-full"
          role="img"
          aria-label={title ?? 'architecture diagram'}
        >
          <defs>
            <marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--ink-faint))" />
            </marker>
          </defs>

          {solidEdges.map((edge, index) => {
            const from = byId.get(edge.from) as DiagramNode;
            const to = byId.get(edge.to) as DiagramNode;
            const line = trim(from, to);
            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="rgb(var(--ink-faint))"
                  strokeWidth={1.6}
                  strokeDasharray={edge.dashed ? '6 5' : undefined}
                  markerEnd="url(#arch-arrow)"
                  opacity={0.7}
                />
                {edge.label ? (
                  <text
                    x={(line.x1 + line.x2) / 2}
                    y={(line.y1 + line.y2) / 2 - 7}
                    textAnchor="middle"
                    fontSize={11}
                    fill="rgb(var(--ink-faint))"
                  >
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {architecture.nodes.map((node) => {
            const style = styleFor(node.type);
            const isSelected = selected?.id === node.id;
            const isNew = highlighted.has(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x - NODE_WIDTH / 2}, ${node.y - NODE_HEIGHT / 2})`}
                onClick={() => setSelected(isSelected ? null : node)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelected(isSelected ? null : node);
                  }
                }}
                aria-label={`${node.label}${node.note ? `. ${node.note}` : ''}`}
              >
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={10}
                  fill={`rgb(${style.fill} / ${isSelected ? 0.28 : 0.12})`}
                  stroke={`rgb(${style.stroke})`}
                  strokeWidth={isSelected ? 3 : isNew ? 2.5 : 1.5}
                  strokeDasharray={isNew && !isSelected ? '7 4' : undefined}
                />
                <text x={14} y={NODE_HEIGHT / 2 + 6} fontSize={17}>
                  {style.glyph}
                </text>
                {node.label.split('\\n').map((line, index, all) => (
                  <text
                    key={index}
                    x={40}
                    y={NODE_HEIGHT / 2 + 5 - (all.length - 1) * 7 + index * 14}
                    fontSize={12}
                    fill="rgb(var(--ink))"
                    fontWeight={500}
                  >
                    {line}
                  </text>
                ))}
                {isNew ? (
                  <text x={NODE_WIDTH - 8} y={14} textAnchor="end" fontSize={10} fill="rgb(var(--brand))" fontWeight={700}>
                    NEW
                  </text>
                ) : null}
              </g>
            );
          })}

          {packet ? <circle cx={packet.x} cy={packet.y} r={7} fill="rgb(var(--brand))" opacity={0.9} /> : null}
        </svg>
      </div>

      {selected ? (
        <div className="border-t border-line p-4">
          <div className="flex items-start justify-between gap-3">
            <h5 className="font-medium text-ink">{selected.label.replace(/\\n/g, ' ')}</h5>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-ink-faint hover:text-ink"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>
          {selected.note ? <p className="mt-1 text-sm text-ink-muted">{selected.note}</p> : null}

          {selected.why ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-lg border border-bad/30 bg-bad/5 p-3 text-sm">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-bad">Without it</p>
                <ul className="space-y-1 text-ink-muted">
                  {selected.why.without.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-good/30 bg-good/5 p-3 text-sm">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-good">With it</p>
                <ul className="space-y-1 text-ink-muted">
                  {selected.why.with.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-2">
                <Callout tone="info">{selected.why.conclusion}</Callout>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
