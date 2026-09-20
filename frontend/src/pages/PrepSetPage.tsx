import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Empty, ErrorBox, Loading } from '../components/ui';
import { QuestionCard } from '../components/interview';
import type { InterviewLevel } from '../types';

const LEVELS: (InterviewLevel | 'all')[] = ['all', 'junior', 'mid', 'senior'];

/** One topic's question bank, filterable by level. */
export default function PrepSetPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useAsync(() => platform.questionSet(id), [id]);
  const [level, setLevel] = useState<InterviewLevel | 'all'>('all');

  const visible = useMemo(
    () => (data ? data.questions.filter((q) => level === 'all' || q.level === level) : []),
    [data, level],
  );

  if (loading) return <Loading label="Loading questions" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <header>
        <Link to={`/interview/tracks/${data.trackId}`} className="text-xs font-medium text-brand hover:underline">
          ← {data.trackId}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{data.title}</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">{data.summary}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-faint">Level</span>
        {LEVELS.map((option) => {
          const count =
            option === 'all'
              ? data.questions.length
              : data.questions.filter((q) => q.level === option).length;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setLevel(option)}
              aria-pressed={level === option}
              disabled={count === 0}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:opacity-40 ${
                level === option
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              {option} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <Empty title="Nothing at this level yet" hint="Try another level, or clear the filter." />
      ) : (
        <div className="space-y-4">
          {visible.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
