import { type CSSProperties, type ReactNode } from 'react';
import type {
  BoardPanel,
  BoxPanel,
  BucketPanel,
  CellState,
  CellValue,
  FramePanel,
  GraphPanel,
  GridPanel,
  Scene,
  TablePanel,
  TreeNodeView,
} from './types';

/**
 * One renderer for every visualisation.
 *
 * Engines produce a Scene; this draws whichever panels are present. That is what keeps 41
 * engines from needing 41 renderers, and it is why a new engine usually needs no new UI code
 * at all — it composes the panels that already exist.
 */

const CELL_CLASSES: Record<CellState, string> = {
  idle: 'bg-surface-raised border-line text-ink',
  active: 'bg-brand/15 border-brand text-ink ring-2 ring-brand/40',
  inWindow: 'bg-info/15 border-info/60 text-ink',
  visited: 'bg-surface-sunken border-line text-ink-muted',
  match: 'bg-good/20 border-good text-ink font-semibold',
  reject: 'bg-surface-sunken border-line/60 text-ink-faint line-through decoration-ink-faint/60',
  target: 'bg-warn/15 border-warn text-ink',
};

const TONE_CLASSES: Record<string, string> = {
  brand: 'text-brand',
  good: 'text-good',
  warn: 'text-warn',
  bad: 'text-bad',
  info: 'text-info',
};

const NODE_FILL: Record<CellState, string> = {
  idle: 'rgb(var(--surface-raised))',
  active: 'rgb(var(--brand) / 0.25)',
  inWindow: 'rgb(var(--info) / 0.25)',
  visited: 'rgb(var(--surface-sunken))',
  match: 'rgb(var(--good) / 0.3)',
  reject: 'rgb(var(--surface-sunken))',
  target: 'rgb(var(--warn) / 0.25)',
};

const NODE_STROKE: Record<CellState, string> = {
  idle: 'rgb(var(--line))',
  active: 'rgb(var(--brand))',
  inWindow: 'rgb(var(--info))',
  visited: 'rgb(var(--line))',
  match: 'rgb(var(--good))',
  reject: 'rgb(var(--line))',
  target: 'rgb(var(--warn))',
};

function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      {title ? (
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">{title}</h4>
      ) : null}
      {children}
    </section>
  );
}

function ArrayPanelView({
  values,
  states,
  labels,
  caption,
  asText,
  pointers,
  ranges,
}: {
  values: CellValue[];
  states?: CellState[];
  labels?: string[];
  caption?: string;
  asText?: boolean;
  pointers?: { name: string; index: number; tone?: string }[];
  ranges?: { name: string; from: number; to: number; tone?: string }[];
}) {
  const pointersByIndex = new Map<number, { name: string; tone?: string }[]>();
  pointers?.forEach((pointer) => {
    const list = pointersByIndex.get(pointer.index) ?? [];
    list.push({ name: pointer.name, tone: pointer.tone });
    pointersByIndex.set(pointer.index, list);
  });

  return (
    <Panel title={caption}>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          {ranges && ranges.length > 0 ? (
            <div className="flex">
              {values.map((_, index) => {
                const range = ranges.find((r) => index >= r.from && index <= r.to);
                const isStart = range && index === range.from;
                return (
                  <div key={index} className="w-12 shrink-0 px-0.5">
                    <div
                      className={`h-4 rounded-t border-t-2 border-x-2 ${
                        range ? 'border-brand/70' : 'border-transparent'
                      } ${isStart ? '' : 'border-l-transparent'}`}
                    >
                      {isStart ? (
                        <span className="block -mt-[2px] text-[10px] font-medium text-brand">{range?.name}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="flex" role="list" aria-label={caption ?? 'array'}>
            {values.map((value, index) => (
              <div key={index} className="w-12 shrink-0 px-0.5" role="listitem">
                <div
                  className={`flex h-12 items-center justify-center rounded-lg border text-sm transition-colors duration-200 motion-reduce:transition-none ${
                    CELL_CLASSES[states?.[index] ?? 'idle']
                  } ${asText ? 'font-mono' : 'tabular-nums'}`}
                >
                  {String(value)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex">
            {values.map((_, index) => (
              <div key={index} className="w-12 shrink-0 px-0.5 text-center">
                <div className="text-[10px] text-ink-faint">{labels?.[index] ?? index}</div>
                <div className="min-h-[16px] space-y-px">
                  {(pointersByIndex.get(index) ?? []).map((pointer) => (
                    <div
                      key={pointer.name}
                      className={`text-[10px] font-semibold leading-tight ${TONE_CLASSES[pointer.tone ?? 'brand']}`}
                    >
                      ▲{pointer.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ListPanelView({ list }: { list: NonNullable<Scene['list']> }) {
  const pointersByNode = new Map<string, { name: string; tone?: string }[]>();
  list.pointers?.forEach((pointer) => {
    if (!pointer.nodeId) return;
    const existing = pointersByNode.get(pointer.nodeId) ?? [];
    existing.push({ name: pointer.name, tone: pointer.tone });
    pointersByNode.set(pointer.nodeId, existing);
  });

  return (
    <Panel title={list.caption}>
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex items-start gap-1">
          {list.nodes.map((node, index) => (
            <div key={node.id} className="flex items-start gap-1">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-12 w-14 items-center justify-center rounded-lg border text-sm tabular-nums transition-colors duration-200 motion-reduce:transition-none ${
                    CELL_CLASSES[node.state ?? 'idle']
                  }`}
                >
                  {String(node.value)}
                </div>
                <div className="min-h-[16px] pt-1">
                  {(pointersByNode.get(node.id) ?? []).map((pointer) => (
                    <div
                      key={pointer.name}
                      className={`text-[10px] font-semibold leading-tight ${TONE_CLASSES[pointer.tone ?? 'brand']}`}
                    >
                      ▲{pointer.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex h-12 items-center text-ink-faint">
                {index === list.nodes.length - 1 ? (
                  list.cycleTo !== null && list.cycleTo !== undefined ? (
                    <span className="whitespace-nowrap text-[11px] font-medium text-warn">↩ back to #{list.cycleTo}</span>
                  ) : (
                    <span className="text-xs">→ null</span>
                  )
                ) : (
                  <span aria-hidden="true">→</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/** Lay a tree out by in-order position (x) and depth (y). Deterministic, so nothing jumps. */
function layoutTree(root: TreeNodeView | null) {
  const placed: { node: TreeNodeView; x: number; y: number }[] = [];
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  let cursor = 0;

  const walk = (node: TreeNodeView | null | undefined, depth: number): { x: number; y: number } | null => {
    if (!node) return null;
    const left = walk(node.left, depth + 1);
    const x = cursor++;
    const position = { x, y: depth };
    placed.push({ node, x, y: depth });
    const right = walk(node.right, depth + 1);
    if (left) edges.push({ x1: x, y1: depth, x2: left.x, y2: depth + 1 });
    if (right) edges.push({ x1: x, y1: depth, x2: right.x, y2: depth + 1 });
    return position;
  };

  walk(root, 0);
  const width = Math.max(1, cursor);
  const height = placed.reduce((max, item) => Math.max(max, item.y), 0) + 1;
  return { placed, edges, width, height };
}

function TreePanelView({ tree }: { tree: TreeNodeView }) {
  const { placed, edges, width, height } = layoutTree(tree);
  const stepX = 76;
  const stepY = 74;
  const viewWidth = width * stepX;
  const viewHeight = height * stepY;
  const cx = (x: number) => x * stepX + stepX / 2;
  const cy = (y: number) => y * stepY + 28;

  return (
    <Panel title="tree">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          style={{ width: Math.max(viewWidth, 260), height: viewHeight }}
          role="img"
          aria-label="binary tree"
        >
          {edges.map((edge, index) => (
            <line
              key={index}
              x1={cx(edge.x1)}
              y1={cy(edge.y1)}
              x2={cx(edge.x2)}
              y2={cy(edge.y2)}
              stroke="rgb(var(--line))"
              strokeWidth={1.5}
            />
          ))}
          {placed.map(({ node, x, y }) => (
            <g key={node.id}>
              <circle
                cx={cx(x)}
                cy={cy(y)}
                r={20}
                fill={NODE_FILL[node.state ?? 'idle']}
                stroke={NODE_STROKE[node.state ?? 'idle']}
                strokeWidth={node.state === 'idle' ? 1.5 : 2.5}
                className="transition-all duration-200 motion-reduce:transition-none"
              />
              <text
                x={cx(x)}
                y={cy(y) + 4}
                textAnchor="middle"
                fontSize={13}
                fill="rgb(var(--ink))"
                className="tabular-nums"
              >
                {String(node.value)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Panel>
  );
}

function GraphPanelView({ graph }: { graph: GraphPanel }) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgeColor = (state?: string) => {
    if (state === 'tree') return 'rgb(var(--good))';
    if (state === 'back') return 'rgb(var(--bad))';
    if (state === 'active') return 'rgb(var(--brand))';
    return 'rgb(var(--line))';
  };

  return (
    <Panel title={graph.caption ?? 'graph'}>
      <svg viewBox="0 0 600 470" className="h-[320px] w-full" role="img" aria-label={graph.caption ?? 'graph'}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="26" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--ink-faint))" />
          </marker>
        </defs>
        {graph.edges.map((edge, index) => {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to) return null;
          return (
            <g key={`${edge.from}-${edge.to}-${index}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={edgeColor(edge.state)}
                strokeWidth={edge.state && edge.state !== 'idle' ? 3 : 1.5}
                strokeDasharray={edge.state === 'back' ? '5 4' : undefined}
                markerEnd={graph.directed ? 'url(#arrow)' : undefined}
                className="transition-all duration-200 motion-reduce:transition-none"
              />
              {edge.label ? (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 6}
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
        {graph.nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={22}
              fill={NODE_FILL[node.state ?? 'idle']}
              stroke={NODE_STROKE[node.state ?? 'idle']}
              strokeWidth={node.state === 'idle' ? 1.5 : 3}
              className="transition-all duration-200 motion-reduce:transition-none"
            />
            <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize={13} fill="rgb(var(--ink))">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </Panel>
  );
}

function GridPanelView({ grid }: { grid: GridPanel }) {
  return (
    <Panel title={grid.caption ?? 'grid'}>
      <div className="overflow-x-auto">
        <div className="inline-block">
          {grid.cells.map((row, r) => (
            <div key={r} className="flex">
              {row.map((cell, c) => (
                <div
                  key={c}
                  className={`m-px flex h-10 w-10 items-center justify-center rounded border text-xs tabular-nums transition-colors duration-200 motion-reduce:transition-none ${
                    CELL_CLASSES[grid.states?.[r]?.[c] ?? 'idle']
                  }`}
                >
                  {String(cell)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function TablePanelView({ table }: { table: TablePanel }) {
  return (
    <Panel title={table.caption ?? 'table'}>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-sunken text-ink-muted">
            <tr>
              {table.columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} className="border-t border-line">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={`whitespace-nowrap px-3 py-1.5 tabular-nums ${
                      table.cursor && table.cursor[0] === r && table.cursor[1] === c
                        ? 'bg-brand/15 font-semibold text-ink'
                        : 'text-ink-muted'
                    }`}
                  >
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function StackPanelView({ items, caption }: { items: CellValue[]; caption?: string }) {
  return (
    <Panel title={caption ?? 'stack'}>
      <div className="flex w-32 flex-col-reverse gap-1 rounded-lg border border-line bg-surface-sunken p-2">
        {items.length === 0 ? (
          <div className="py-3 text-center text-xs text-ink-faint">empty</div>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className={`rounded border px-2 py-1.5 text-center text-sm ${
                index === items.length - 1 ? CELL_CLASSES.match : CELL_CLASSES.idle
              }`}
            >
              {String(item)}
              {index === items.length - 1 ? <span className="ml-1 text-[10px] text-ink-faint">top</span> : null}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

function QueuePanelView({ queue }: { queue: NonNullable<Scene['queue']> }) {
  const isCircular = queue.capacity !== undefined;
  return (
    <Panel title={queue.caption ?? 'queue'}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {!isCircular ? <span className="shrink-0 text-[10px] text-ink-faint">front</span> : null}
        <div className="flex gap-1">
          {queue.items.length === 0 ? (
            <div className="rounded border border-dashed border-line px-4 py-2 text-xs text-ink-faint">empty</div>
          ) : (
            queue.items.map((item, index) => {
              const isHead = isCircular && index === queue.head;
              const isTail = isCircular && index === queue.tail;
              return (
                <div key={index} className="flex flex-col items-center">
                  <div
                    className={`flex h-11 w-14 items-center justify-center rounded border text-sm ${
                      String(item) === '' ? 'border-dashed border-line text-ink-faint' : CELL_CLASSES.idle
                    }`}
                  >
                    {String(item) === '' ? '·' : String(item)}
                  </div>
                  {isCircular ? (
                    <div className="h-4 text-[10px] leading-tight">
                      {isHead ? <span className="text-good">head</span> : null}
                      {isHead && isTail ? ' ' : null}
                      {isTail ? <span className="text-warn">tail</span> : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        {!isCircular ? <span className="shrink-0 text-[10px] text-ink-faint">rear</span> : null}
      </div>
    </Panel>
  );
}

function BoxesPanelView({ boxes }: { boxes: BoxPanel }) {
  return (
    <Panel title={boxes.caption ?? 'memory'}>
      <div className="flex flex-wrap gap-2">
        {boxes.boxes.map((box) => (
          <div
            key={box.name}
            className={`min-w-[128px] rounded-lg border p-2 ${CELL_CLASSES[box.state ?? 'idle']}`}
          >
            <div className="font-mono text-xs text-ink-muted">{box.address}</div>
            <div className="text-sm font-semibold">{String(box.value)}</div>
            <div className="text-[11px] text-ink-muted">
              {box.type ? <span className="font-mono">{box.type} </span> : null}
              {box.name}
              {box.reference ? <span className="ml-1 text-info">(ref)</span> : null}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function BoardPanelView({ board }: { board: BoardPanel }) {
  const conflicts = new Set((board.conflicts ?? []).map(([r, c]) => `${r},${c}`));
  return (
    <Panel title={board.caption ?? 'board'}>
      <div className="inline-block rounded-lg border border-line p-1">
        {Array.from({ length: board.size }, (_, r) => (
          <div key={r} className="flex">
            {Array.from({ length: board.size }, (_, c) => {
              const hasQueen = board.queens[r] === c;
              const isConflict = conflicts.has(`${r},${c}`);
              const dark = (r + c) % 2 === 1;
              return (
                <div
                  key={c}
                  className={`flex h-9 w-9 items-center justify-center text-lg ${
                    dark ? 'bg-surface-sunken' : 'bg-surface-raised'
                  } ${isConflict ? 'ring-2 ring-inset ring-bad/70' : ''}`}
                >
                  {hasQueen ? <span className="text-good">♛</span> : isConflict ? <span className="text-xs text-bad">✕</span> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FramesPanelView({ frames }: { frames: FramePanel }) {
  return (
    <Panel title={frames.caption ?? 'call stack'}>
      <div className="flex w-full max-w-xs flex-col-reverse gap-1 rounded-lg border border-line bg-surface-sunken p-2">
        {frames.frames.length === 0 ? (
          <div className="py-2 text-center text-xs text-ink-faint">empty</div>
        ) : (
          frames.frames.map((frame, index) => (
            <div
              key={index}
              className={`rounded border px-2 py-1 font-mono text-xs ${CELL_CLASSES[frame.state ?? 'idle']}`}
              style={{ marginLeft: index * 6 } as CSSProperties}
            >
              {frame.label}
              {frame.detail ? <span className="ml-1 text-ink-faint">{frame.detail}</span> : null}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

function BucketsPanelView({ buckets }: { buckets: BucketPanel }) {
  const single = buckets.buckets.length === 1;
  return (
    <Panel title={buckets.caption ?? 'map'}>
      <div className={single ? 'flex flex-wrap gap-1' : 'space-y-1'}>
        {buckets.buckets.map((bucket) =>
          single ? (
            bucket.entries.length === 0 ? (
              <div key="empty" className="rounded border border-dashed border-line px-3 py-1 text-xs text-ink-faint">
                empty
              </div>
            ) : (
              bucket.entries.map((entry) => (
                <div
                  key={entry.key}
                  className={`rounded border px-2 py-1 font-mono text-xs ${CELL_CLASSES[entry.state ?? 'idle']}`}
                >
                  {entry.key} → {String(entry.value)}
                </div>
              ))
            )
          ) : (
            <div key={bucket.index} className="flex items-center gap-2">
              <div className="w-8 shrink-0 rounded bg-surface-sunken px-1 py-0.5 text-center font-mono text-[11px] text-ink-faint">
                {bucket.index}
              </div>
              <div className="flex flex-wrap gap-1">
                {bucket.entries.length === 0 ? (
                  <span className="text-[11px] text-ink-faint">—</span>
                ) : (
                  bucket.entries.map((entry, index) => (
                    <div key={entry.key} className="flex items-center gap-1">
                      {index > 0 ? <span className="text-ink-faint">→</span> : null}
                      <span className={`rounded border px-2 py-0.5 font-mono text-xs ${CELL_CLASSES[entry.state ?? 'idle']}`}>
                        {entry.key}:{String(entry.value)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ),
        )}
      </div>
    </Panel>
  );
}

export function SceneView({ scene }: { scene: Scene }) {
  const hasAnything =
    scene.array || scene.list || scene.tree || scene.graph || scene.grid || scene.table ||
    scene.stack || scene.queue || scene.boxes || scene.board || scene.frames || scene.buckets ||
    (scene.output && scene.output.length > 0);

  if (!hasAnything) {
    return <div className="py-8 text-center text-sm text-ink-faint">Nothing to draw at this step.</div>;
  }

  return (
    <div className="space-y-5">
      {scene.array ? (
        <ArrayPanelView
          values={scene.array.values}
          states={scene.array.states}
          labels={scene.array.labels}
          caption={scene.array.caption}
          asText={scene.array.asText}
          pointers={scene.pointers}
          ranges={scene.ranges}
        />
      ) : null}

      {scene.secondaryArray ? (
        <ArrayPanelView
          values={scene.secondaryArray.values}
          states={scene.secondaryArray.states}
          labels={scene.secondaryArray.labels}
          caption={scene.secondaryArray.caption}
          asText={scene.secondaryArray.asText}
        />
      ) : null}

      {scene.list ? <ListPanelView list={scene.list} /> : null}
      {scene.tree ? <TreePanelView tree={scene.tree} /> : null}
      {scene.graph ? <GraphPanelView graph={scene.graph} /> : null}
      {scene.grid ? <GridPanelView grid={scene.grid} /> : null}
      {scene.board ? <BoardPanelView board={scene.board} /> : null}

      {(scene.stack || scene.queue || scene.frames || scene.buckets) ? (
        <div className="flex flex-wrap gap-6">
          {scene.stack ? <StackPanelView items={scene.stack.items} caption={scene.stack.caption} /> : null}
          {scene.queue ? <QueuePanelView queue={scene.queue} /> : null}
          {scene.frames ? <FramesPanelView frames={scene.frames} /> : null}
          {scene.buckets ? <BucketsPanelView buckets={scene.buckets} /> : null}
        </div>
      ) : null}

      {scene.boxes ? <BoxesPanelView boxes={scene.boxes} /> : null}
      {scene.table ? <TablePanelView table={scene.table} /> : null}

      {scene.output && scene.output.length > 0 ? (
        <Panel title="output">
          <div className="max-h-40 overflow-y-auto rounded-lg border border-line bg-surface-sunken p-2 font-mono text-xs text-ink-muted">
            {scene.output.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
