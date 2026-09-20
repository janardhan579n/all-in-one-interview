import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, Empty, ErrorBox, Loading, SectionHeading } from '../components/ui';
import { QuestionCard } from '../components/interview';
import type { InterviewLevel } from '../types';

const LEVELS: (InterviewLevel | 'all')[] = ['all', 'junior', 'mid', 'senior'];
const COUNTS = [5, 10, 20];

/**
 * A mock round: a randomised set you work through one at a time.
 *
 * One question on screen at a time, deliberately. A scrollable list invites skimming, and the
 * skill being practised is producing an answer under a blank page — which a list of twenty
 * visible questions quietly removes.
 */
export default function PrepDrillPage() {
  const [params, setParams] = useSearchParams();
  const track = params.get('track') ?? undefined;
  const level = (params.get('level') as InterviewLevel | null) ?? undefined;
  const count = Number(params.get('count') ?? 10);
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / 86_400_000));
  const [position, setPosition] = useState(0);

  const tracks = useAsync(() => platform.interviewTracks(), []);
  const drill = useAsync(
    () => platform.interviewDrill({ track, level, count, seed }),
    [track, level, count, seed],
  );

  const questions = useMemo(() => drill.data ?? [], [drill.data]);
  const current = questions[Math.min(position, Math.max(0, questions.length - 1))];

  const update = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPosition(0);
  };

  const reshuffle = () => {
    setSeed(Math.floor(Math.random() * 1_000_000));
    setPosition(0);
  };

  if (tracks.error) return <ErrorBox message={tracks.error} onRetry={tracks.reload} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <header>
        <Link to="/interview/tracks" className="text-xs font-medium text-brand hover:underline">
          ← Interview preparation
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Mock round</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          One question at a time, in random order. Say your answer out loud before revealing — the set is stable if
          you reload, so you can leave one and come back to it.
        </p>
      </header>

      <Card>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Filter label="Track">
            <Chip active={!track} onClick={() => update('track')}>
              All
            </Chip>
            {(tracks.data ?? []).map((row) => (
              <Chip key={row.id} active={track === row.id} onClick={() => update('track', row.id)}>
                {row.icon} {row.shortTitle}
              </Chip>
            ))}
          </Filter>

          <Filter label="Level">
            {LEVELS.map((option) => (
              <Chip
                key={option}
                active={option === 'all' ? !level : level === option}
                onClick={() => update('level', option === 'all' ? undefined : option)}
              >
                <span className="capitalize">{option}</span>
              </Chip>
            ))}
          </Filter>

          <Filter label="Questions">
            {COUNTS.map((option) => (
              <Chip key={option} active={count === option} onClick={() => update('count', String(option))}>
                {option}
              </Chip>
            ))}
          </Filter>

          <button
            type="button"
            onClick={reshuffle}
            className="ml-auto rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            ⟲ Reshuffle
          </button>
        </div>
      </Card>

      {drill.loading ? <Loading label="Building your set" /> : null}
      {drill.error ? <ErrorBox message={drill.error} onRetry={drill.reload} /> : null}

      {!drill.loading && questions.length === 0 ? (
        <Empty title="No questions match" hint="Widen the track or level filter." />
      ) : null}

      {current ? (
        <>
          <SectionHeading
            title={`Question ${position + 1} of ${questions.length}`}
            subtitle={`${current.trackId} · ${current.topic}`}
          />

          <QuestionCard key={current.id} question={current} />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPosition((p) => Math.max(0, p - 1))}
              disabled={position === 0}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40"
            >
              ← Previous
            </button>

            <div className="flex flex-wrap justify-center gap-1">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setPosition(index)}
                  aria-label={`Go to question ${index + 1}`}
                  aria-current={index === position ? 'true' : undefined}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === position ? 'bg-brand' : 'bg-surface-sunken hover:bg-ink-faint'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPosition((p) => Math.min(questions.length - 1, p + 1))}
              disabled={position >= questions.length - 1}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-faint">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
