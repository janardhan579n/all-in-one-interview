import { Link } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, ErrorBox, Loading } from '../components/ui';
import type { PatternMapNode } from '../types';

/**
 * The pattern map.
 *
 * Rendered as a column-per-group tree rather than a force-directed graph: the value is being
 * able to see the whole territory at once and spot the gaps in your own coverage, and a layout
 * that reflows on every render makes that harder, not easier.
 */
export default function PatternMapPage() {
  const { isCompleted, progress } = useAppState();
  const { data, loading, error, reload } = useAsync(() => platform.patternMap(), []);

  if (loading) return <Loading label="Loading the pattern map" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  const groups = data.root.children ?? [];

  const statusOf = (id: string) => {
    if (isCompleted(id)) return 'done';
    if (progress?.lessons[id]) return 'started';
    return 'new';
  };

  const counts = groups.map((group) => ({
    group,
    done: (group.children ?? []).filter((child) => isCompleted(child.id)).length,
    total: (group.children ?? []).length,
  }));

  const totalDone = counts.reduce((sum, entry) => sum + entry.done, 0);
  const totalAll = counts.reduce((sum, entry) => sum + entry.total, 0);

  return (
    <div className="space-y-6 pb-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{data.title}</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">{data.description}</p>
        <p className="mt-2 text-xs text-ink-faint">
          {totalDone} of {totalAll} topics completed
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-good bg-good/25" /> completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-brand bg-brand/15" /> started
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-line bg-surface-raised" /> not started
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {counts.map(({ group, done, total }) => (
          <Card key={group.id} className="flex flex-col">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-semibold text-ink">{group.label}</h2>
              <span className="text-[11px] tabular-nums text-ink-faint">
                {done}/{total}
              </span>
            </div>

            <ul className="space-y-1.5">
              {(group.children ?? []).map((child: PatternMapNode) => {
                const status = statusOf(child.id);
                return (
                  <li key={child.id}>
                    <Link
                      to={`/dsa/${child.id}`}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        status === 'done'
                          ? 'border-good bg-good/10 text-ink'
                          : status === 'started'
                            ? 'border-brand bg-brand/10 text-ink'
                            : 'border-line text-ink-muted hover:border-brand/60 hover:text-ink'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{child.label}</span>
                      {child.kind === 'pattern' ? (
                        <span className="shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] text-ink-faint">
                          pattern
                        </span>
                      ) : null}
                      {status === 'done' ? <span className="shrink-0 text-good">✓</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-sm text-ink-muted">
          The map is deliberately shallow. Depth comes from the problems under each pattern — and from being able to
          look at an unseen problem and land on the right column here within a minute or two.{' '}
          <Link to="/practice" className="text-brand hover:underline">
            Practise exactly that →
          </Link>
        </p>
      </Card>
    </div>
  );
}
