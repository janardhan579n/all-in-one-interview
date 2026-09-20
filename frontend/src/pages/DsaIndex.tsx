import { Link, useSearchParams } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { ContentCard, ErrorBox, Loading, SectionHeading } from '../components/ui';

const KINDS = [
  { value: '', label: 'Everything' },
  { value: 'foundation', label: 'Foundations' },
  { value: 'pattern', label: 'Patterns' },
  { value: 'data-structure', label: 'Data Structures' },
];

const LEVELS = [
  { value: '', label: 'All levels' },
  { value: '0', label: 'Level 0 — absolute beginner' },
  { value: '1', label: 'Level 1 — foundations' },
  { value: '2', label: 'Level 2 — core patterns' },
  { value: '3', label: 'Level 3 — advanced' },
];

export default function DsaIndex() {
  const [params, setParams] = useSearchParams();
  const { isCompleted } = useAppState();

  const kind = params.get('kind') ?? '';
  const level = params.get('level') ?? '';

  const { data, loading, error, reload } = useAsync(
    () => platform.dsaGroups(),
    [],
  );

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  if (loading) return <Loading label="Loading the DSA library" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const groups = (data ?? [])
    .map((group) => ({
      ...group,
      lessons: group.lessons
        .filter((lesson) => (kind ? lesson.kind === kind : true))
        .filter((lesson) => (level ? String(lesson.level) === level : true)),
    }))
    .filter((group) => group.lessons.length > 0);

  const total = groups.reduce((sum, group) => sum + group.lessons.length, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Data Structures &amp; Algorithms</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Organised by <strong className="text-ink">pattern</strong> rather than by data structure, because the skill
          that transfers to an unseen problem is recognising which pattern it needs.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/pattern-map" className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken">
            🗺 Pattern map
          </Link>
          <Link to="/problems" className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken">
            🎯 Problems by pattern
          </Link>
          <Link to="/practice" className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken">
            🧪 Identify the pattern
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <label className="text-xs text-ink-muted">
          <span className="mb-1 block">Type</span>
          <select
            value={kind}
            onChange={(event) => update('kind', event.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          >
            {KINDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-muted">
          <span className="mb-1 block">Level</span>
          <select
            value={level}
            onChange={(event) => update('level', event.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          >
            {LEVELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="self-end pb-2 text-xs text-ink-faint">{total} lessons</p>
      </div>

      {groups.map((group) => (
        <section key={group.group}>
          <SectionHeading title={group.group} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.lessons.map((lesson) => (
              <ContentCard
                key={lesson.id}
                to={`/dsa/${lesson.id}`}
                title={lesson.title}
                summary={lesson.summary}
                completed={isCompleted(lesson.id)}
                badges={[
                  { label: lesson.kind ?? 'lesson', tone: lesson.kind },
                  { label: lesson.difficulty ?? '', tone: lesson.difficulty },
                ].filter((badge) => badge.label)}
                meta={lesson.estimatedMinutes ? `${lesson.estimatedMinutes} min` : undefined}
              />
            ))}
          </div>
        </section>
      ))}

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
          No lessons match those filters.
        </p>
      ) : null}
    </div>
  );
}
