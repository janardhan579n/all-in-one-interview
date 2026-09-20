import { Link } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, ErrorBox, Loading, SectionHeading } from '../components/ui';
import type { InterviewLevel, InterviewTrack } from '../types';

const LEVEL_LABEL: Record<InterviewLevel, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
};

/** A three-segment bar showing how a track's questions are spread across levels. */
export function LevelBar({ levels, total }: { levels: Record<InterviewLevel, number>; total: number }) {
  if (total === 0) return null;
  const segments: { level: InterviewLevel; tone: string }[] = [
    { level: 'junior', tone: 'bg-good' },
    { level: 'mid', tone: 'bg-brand' },
    { level: 'senior', tone: 'bg-warn' },
  ];

  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        {segments.map(({ level, tone }) => {
          const count = levels[level] ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={level}
              className={tone}
              style={{ width: `${(100 * count) / total}%` }}
              title={`${count} ${LEVEL_LABEL[level]}`}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-ink-faint">
        {segments
          .map(({ level }) => `${levels[level] ?? 0} ${LEVEL_LABEL[level].toLowerCase()}`)
          .join(' · ')}
      </p>
    </div>
  );
}

export default function PrepTracksPage() {
  const { data, loading, error, reload } = useAsync(() => platform.interviewTracks(), []);

  if (loading) return <Loading label="Loading interview tracks" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  const total = data.reduce((sum, track) => sum + track.questionCount, 0);

  return (
    <div className="space-y-8 pb-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Interview preparation</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          {total} questions across {data.length} tracks, from first job to tech lead. Every answer says what the
          interviewer is listening for, what follow-up is coming, and which answers lose marks — because knowing the
          right answer and knowing what a strong answer <em>sounds</em> like are different skills.
        </p>
      </header>

      <section>
        <SectionHeading
          title="Tracks"
          subtitle="Pick the stack you are interviewing for. Scenarios apply to every stack."
          action={
            <Link to="/interview/drill" className="text-xs font-medium text-brand hover:underline">
              Mixed drill →
            </Link>
          }
        />
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="How to use this" />
        <Card>
          <ul className="space-y-2.5 text-sm text-ink-muted">
            <li>
              <strong className="text-ink">Answer out loud before you reveal.</strong> Reading a model answer feels
              productive and teaches very little. The gap between what you said and what the answer covers is the
              only information here worth having.
            </li>
            <li>
              <strong className="text-ink">Read the follow-ups.</strong> Real interviews are a conversation. The
              follow-up is usually where a candidate is actually assessed, because it cannot be memorised.
            </li>
            <li>
              <strong className="text-ink">Mark yourself honestly.</strong> Flag the ones you fumbled as "review"
              and they come back in your weak areas. A track marked all-green that you cannot explain is worth
              nothing on the day.
            </li>
            <li>
              <strong className="text-ink">Scenarios are the senior filter.</strong> Mid-level rounds ask what
              something is; senior rounds hand you a broken system and watch how you think.
            </li>
          </ul>
        </Card>
      </section>
    </div>
  );
}

function TrackCard({ track }: { track: InterviewTrack }) {
  return (
    <Link
      to={`/interview/tracks/${track.id}`}
      className="card flex flex-col gap-3 p-4 transition-colors hover:border-brand/60"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden="true">
          {track.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">{track.title}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">{track.summary}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium tabular-nums text-ink-muted">
          {track.questionCount}
        </span>
      </div>
      <LevelBar levels={track.levels} total={track.questionCount} />
      <p className="text-xs italic text-ink-faint">{track.audience}</p>
    </Link>
  );
}
