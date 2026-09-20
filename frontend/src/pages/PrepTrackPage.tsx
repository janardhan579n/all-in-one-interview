import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, ErrorBox, Loading, SectionHeading } from '../components/ui';
import { LevelBar } from './PrepTracksPage';

/** One track: its topics in curriculum order, each a question set you can work through. */
export default function PrepTrackPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useAsync(() => platform.interviewTrack(id), [id]);

  if (loading) return <Loading label="Loading track" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <header>
        <Link to="/interview/tracks" className="text-xs font-medium text-brand hover:underline">
          ← All tracks
        </Link>
        <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight text-ink">
          <span aria-hidden="true">{data.icon}</span>
          {data.title}
        </h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">{data.summary}</p>
        <p className="mt-2 text-xs text-ink-faint">{data.audience}</p>
      </header>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[220px] flex-1">
            <p className="mb-2 text-sm font-medium text-ink">
              {data.questionCount} questions across {data.topics.length} topics
            </p>
            <LevelBar levels={data.levels} total={data.questionCount} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/interview/drill?track=${data.id}`}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Drill this track →
            </Link>
            <Link
              to={`/interview/drill?track=${data.id}&level=senior`}
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              Senior only
            </Link>
          </div>
        </div>
      </Card>

      <section>
        <SectionHeading title="Topics" subtitle="In the order they build on each other." />
        <ol className="space-y-2">
          {data.topics.map((topic, index) => (
            <li key={topic.setId}>
              <Link
                to={`/interview/sets/${topic.setId}`}
                className="card flex items-start gap-3 px-4 py-3 transition-colors hover:border-brand/60"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-[11px] font-semibold text-ink-faint">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{topic.title}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{topic.summary}</p>
                  <div className="mt-2 max-w-xs">
                    <LevelBar levels={topic.levels} total={topic.questions} />
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium tabular-nums text-ink-muted">
                  {topic.questions}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
