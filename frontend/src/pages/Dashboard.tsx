import { Link } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Card, ContentCard, ErrorBox, Loading, ProgressBar, SectionHeading } from '../components/ui';

export default function Dashboard() {
  const { progress, connection } = useAppState();

  const summary = useAsync(() => platform.progressSummary(), [progress]);
  const next = useAsync(() => platform.nextUp(), [progress]);
  const daily = useAsync(() => platform.dailyProblem(), []);
  const paths = useAsync(() => platform.paths(), []);

  if (summary.loading && !summary.data) return <Loading label="Loading your dashboard" />;
  if (summary.error) return <ErrorBox message={summary.error} onRetry={summary.reload} />;
  if (!summary.data) return null;

  const data = summary.data;
  const started = data.dsa.completed + data.systemDesign.completed > 0 || data.problemsSolved > 0;

  const routeFor = (type: string | undefined, id: string) => {
    switch (type) {
      case 'problem': return `/problems/${id}`;
      case 'concept': return `/system-design/${id}`;
      case 'case-study': return `/system-design/case-studies/${id}`;
      default: return `/dsa/${id}`;
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {started ? 'Welcome back 👋' : 'Start here 👋'}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {started
            ? `${data.streak > 0 ? `${data.streak}-day streak. ` : ''}Understanding over memorisation — every pattern starts with the problem it solves.`
            : 'You can start from zero. The first lesson assumes you have never written a line of code.'}
        </p>
      </header>

      {/* Continue learning — the single most useful thing on the page */}
      {next.data && next.data.lessonId ? (
        <Card className="border-brand/40 bg-brand/[0.04]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand">Continue learning</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{next.data.title}</h2>
              {next.data.summary ? <p className="mt-1 max-w-prose text-sm text-ink-muted">{next.data.summary}</p> : null}
              <p className="mt-2 text-xs italic text-ink-faint">{next.data.reason}</p>
            </div>
            <Link
              to={routeFor(next.data.type, next.data.lessonId)}
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Continue →
            </Link>
          </div>
        </Card>
      ) : null}

      {/* Progress at a glance */}
      <section>
        <SectionHeading
          title="Where you are"
          subtitle="Completion is self-marked — the numbers are only as honest as you are."
          action={
            <Link to="/progress" className="text-xs font-medium text-brand hover:underline">
              Full breakdown →
            </Link>
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <ProgressBar label="DSA lessons" percent={data.dsa.percent} />
            <p className="mt-2 text-xs text-ink-muted">
              {data.dsa.completed} of {data.dsa.total} complete
            </p>
          </Card>
          <Card>
            <ProgressBar label="System Design" percent={data.systemDesign.percent} tone="good" />
            <p className="mt-2 text-xs text-ink-muted">
              {data.systemDesign.completed} of {data.systemDesign.total} complete
            </p>
          </Card>
          <Card>
            <ProgressBar label="Patterns mastered" percent={data.patterns.percent} tone="warn" />
            <p className="mt-2 text-xs text-ink-muted">
              {data.patterns.completed} of {data.patterns.total} patterns · {data.problemsSolved} problems solved
            </p>
          </Card>
        </div>
      </section>

      {/* Readiness + daily challenge */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <SectionHeading title="Interview readiness" subtitle={data.readiness.band} />
          <div className="flex items-center gap-5">
            <div className="relative grid h-24 w-24 shrink-0 place-items-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(var(--surface-sunken))" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgb(var(--brand))"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(data.readiness.score / 100) * 264} 264`}
                />
              </svg>
              <span className="text-xl font-semibold tabular-nums text-ink">{data.readiness.score}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <ProgressBar label="DSA lessons" percent={data.readiness.breakdown.dsaLessons} />
              <ProgressBar label="System design" percent={data.readiness.breakdown.systemDesign} tone="good" />
              <ProgressBar label="Problem practice" percent={data.readiness.breakdown.problemPractice} tone="warn" />
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Weighted towards problems and patterns rather than lessons read, because recognising a pattern under
            pressure is what an interview actually tests.
          </p>
        </Card>

        <Card>
          <SectionHeading title="Daily challenge" />
          {daily.data ? (
            <>
              <Link to={`/problems/${daily.data.id}`} className="font-medium text-ink hover:text-brand">
                {daily.data.title}
              </Link>
              <p className="mt-1 line-clamp-3 text-sm text-ink-muted">{daily.data.summary}</p>
              <div className="mt-3 flex gap-1.5">
                <Badge tone={daily.data.difficulty}>{daily.data.difficulty}</Badge>
                {daily.data.patternId ? <Badge tone="pattern">{daily.data.patternId}</Badge> : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Loading…</p>
          )}
        </Card>
      </div>

      {/* Weak areas — only shown when there is evidence for them */}
      {data.weakAreas.length > 0 ? (
        <section>
          <SectionHeading
            title="Worth revisiting"
            subtitle="Patterns you have attempted more than once with a low solve rate."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.weakAreas.map((area) => (
              <Card key={area.patternId}>
                <Link to={`/dsa/${area.patternId}`} className="font-medium text-ink hover:text-brand">
                  {area.title}
                </Link>
                <p className="mt-1 text-xs text-ink-muted">
                  {area.solved} of {area.attempts} attempts solved ({area.solveRate}%)
                </p>
                <div className="mt-2">
                  <ProgressBar percent={area.solveRate} tone="warn" />
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Recent activity */}
      {data.recent.length > 0 ? (
        <section>
          <SectionHeading title="Recently studied" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.recent.map((item) => (
              <ContentCard
                key={item.id}
                to={routeFor(item.type, item.id)}
                title={item.title}
                summary={item.status === 'completed' ? 'Completed' : `${item.percent}% through`}
                badges={[{ label: item.type }]}
                completed={item.status === 'completed'}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Learning paths */}
      <section>
        <SectionHeading title="Learning paths" subtitle="A route through the material, in order." />
        <div className="grid gap-3 md:grid-cols-3">
          {paths.data?.map((path) => (
            <ContentCard
              key={path.id}
              to={`/paths/${path.id}`}
              title={path.title}
              summary={path.description}
              badges={[{ label: `${path.steps} steps` }]}
              meta={path.audience.length > 60 ? `${path.audience.slice(0, 57)}…` : path.audience}
            />
          ))}
        </div>
      </section>

      {connection === 'offline' ? (
        <p className="rounded-xl border border-warn/40 bg-warn/5 p-3 text-xs text-ink-muted">
          <strong className="text-ink">Working offline.</strong> The backend is not reachable, so lessons are served
          from the bundled content and your progress is stored in this browser. Start the backend (
          <code className="font-mono">./mvnw spring-boot:run</code>) to store progress in SQLite instead — you can move
          what you have across with Export on the Progress page.
        </p>
      ) : null}
    </div>
  );
}
