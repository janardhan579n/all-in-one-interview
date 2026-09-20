import { Link } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { ContentCard, ErrorBox, Loading, SectionHeading } from '../components/ui';

const GROUP_ORDER = [
  'Foundations',
  'Performance',
  'Data',
  'Reliability',
  'Security',
  'Architecture',
  'Distributed',
];

const GROUP_BLURB: Record<string, string> = {
  Foundations: 'What the pieces are and how they talk to each other. Start here.',
  Performance: 'Making it faster, and knowing which kind of fast you are buying.',
  Data: 'Where state lives, how many copies there are, and who is allowed to be wrong.',
  Reliability: 'Staying up when something inevitably breaks.',
  Security: 'Proving who someone is, and deciding what they are allowed to do.',
  Architecture: 'How the system is cut into pieces — and what every cut costs you.',
  Distributed: 'What changes once the work is spread across machines that can lose each other.',
};

export default function SystemDesignIndex() {
  const { isCompleted } = useAppState();
  const { data, loading, error, reload } = useAsync(() => platform.concepts(), []);

  if (loading) return <Loading label="Loading system design concepts" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const byGroup = new Map<string, typeof data>();
  (data ?? []).forEach((concept) => {
    const group = concept.group ?? 'Other';
    byGroup.set(group, [...(byGroup.get(group) ?? []), concept]);
  });

  const groups = [...byGroup.keys()].sort((a, b) => {
    const rankA = GROUP_ORDER.indexOf(a);
    const rankB = GROUP_ORDER.indexOf(b);
    return (rankA < 0 ? 99 : rankA) - (rankB < 0 ? 99 : rankB);
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">System Design</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Building blocks first, whole systems later. Every concept answers the same question:{' '}
          <strong className="text-ink">what problem forced this to exist?</strong> — because a component you cannot
          justify is one you will add in the wrong place.
        </p>
        <div className="mt-3">
          <Link
            to="/system-design/case-studies"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken"
          >
            🏛 Case studies
          </Link>
        </div>
      </header>

      {groups.map((group) => (
        <section key={group}>
          <SectionHeading title={group} subtitle={GROUP_BLURB[group]} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(byGroup.get(group) ?? []).map((concept) => (
              <ContentCard
                key={concept.id}
                to={`/system-design/${concept.id}`}
                title={concept.title}
                summary={concept.summary}
                completed={isCompleted(concept.id)}
                badges={concept.interactive ? [{ label: 'interactive', tone: 'pattern' }] : []}
                meta={concept.estimatedMinutes ? `${concept.estimatedMinutes} min` : undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
