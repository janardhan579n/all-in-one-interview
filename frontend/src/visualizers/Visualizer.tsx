import { useMemo, useRef } from 'react';
import { ENGINES } from './registry';
import { SceneView } from './Scene';
import { PlayerControls, usePlayer, usePlayerShortcuts } from './Player';
import type { Step } from './types';

export interface VisualizationSpec {
  id?: string;
  title?: string;
  engine: string;
  input?: Record<string, unknown>;
  code?: string[];
  /**
   * Added to every step's codeLine before highlighting. Needed when a lesson reuses another
   * lesson's engine under a code listing that starts with an extra comment line.
   */
  codeLineOffset?: number;
}

/** The code listing, with the current step's line highlighted. */
function CodePane({ code, activeLine }: { code: string[]; activeLine?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-sunken">
      <div className="border-b border-line px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
        Java
      </div>
      <pre className="overflow-x-auto py-2 text-xs leading-relaxed">
        <code>
          {code.map((line, index) => {
            const lineNumber = index + 1;
            const isActive = activeLine === lineNumber;
            return (
              <div
                key={index}
                className={`flex px-3 transition-colors duration-200 motion-reduce:transition-none ${
                  isActive ? 'bg-brand/15' : ''
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={`w-7 shrink-0 select-none text-right tabular-nums ${
                    isActive ? 'font-bold text-brand' : 'text-ink-faint'
                  }`}
                >
                  {lineNumber}
                </span>
                <span className={`whitespace-pre pl-3 font-mono ${isActive ? 'text-ink' : 'text-ink-muted'}`}>
                  {line || ' '}
                </span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

/** The variable inspector — what a debugger would show at this instant. */
function VariablePane({ step }: { step: Step }) {
  const entries = Object.entries(step.vars ?? {});
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-line bg-surface-sunken p-3">
      <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">Variables</h4>
      <dl className="space-y-1">
        {entries.map(([name, value]) => (
          <div key={name} className="flex items-baseline justify-between gap-3 text-xs">
            <dt className="font-mono text-ink-muted">{name}</dt>
            <dd className="font-mono font-semibold tabular-nums text-ink">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Visualizer({ spec }: { spec: VisualizationSpec }) {
  const container = useRef<HTMLDivElement>(null);

  const steps = useMemo<Step[]>(() => {
    const engine = ENGINES[spec.engine];
    if (!engine) return [];
    try {
      return engine(spec.input ?? {});
    } catch (error) {
      // A broken engine must degrade to a message, never take the lesson page down.
      console.error(`Visualisation engine "${spec.engine}" failed`, error);
      return [];
    }
  }, [spec.engine, spec.input]);

  const player = usePlayer(steps.length || 1);
  usePlayerShortcuts(container, {
    onToggle: player.toggle,
    onNext: player.next,
    onPrevious: player.previous,
    onReset: player.reset,
  });

  if (steps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-6 text-sm text-ink-muted">
        <p className="font-medium text-ink">Visualisation unavailable</p>
        <p className="mt-1">
          No engine is registered under <code className="font-mono text-xs">{spec.engine}</code>. This is a content
          error rather than a runtime one — see <code className="font-mono text-xs">visualizers/registry.ts</code>.
        </p>
      </div>
    );
  }

  const step = steps[Math.min(player.index, steps.length - 1)];
  const activeLine = step.codeLine !== undefined ? step.codeLine + (spec.codeLineOffset ?? 0) : undefined;

  return (
    <div
      ref={container}
      tabIndex={0}
      className="overflow-hidden rounded-xl border border-line bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      aria-label={spec.title ? `Visualisation: ${spec.title}` : 'Visualisation'}
    >
      {spec.title ? (
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">{spec.title}</h3>
        </div>
      ) : null}

      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <SceneView scene={step.scene} />
        </div>

        <div className="space-y-3">
          {spec.code && spec.code.length > 0 ? <CodePane code={spec.code} activeLine={activeLine} /> : null}
          <VariablePane step={step} />
        </div>
      </div>

      {/* The transcript is the accessible equivalent of the animation: every step's
          explanation is announced, so the visualisation is usable without seeing it. */}
      <div className="border-t border-line bg-surface-sunken px-4 py-3">
        <p className="text-sm text-ink" aria-live="polite" aria-atomic="true">
          <span className="mr-2 rounded bg-surface-raised px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-ink-faint">
            {player.index + 1}
          </span>
          {step.explain}
          {step.done ? <span className="ml-2 text-xs font-medium text-good">done</span> : null}
        </p>
      </div>

      <PlayerControls
        index={player.index}
        total={steps.length}
        playing={player.playing}
        speed={player.speed}
        onToggle={player.toggle}
        onNext={player.next}
        onPrevious={player.previous}
        onReset={player.reset}
        onSpeed={player.setSpeed}
        onScrub={player.goTo}
      />
    </div>
  );
}
