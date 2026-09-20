import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as platform from '../services/platform';
import { Badge, Card, ErrorBox, Loading, ProgressBar } from '../components/ui';
import type { PracticeQuestion } from '../types';

/**
 * "Identify the Pattern".
 *
 * The drill the whole platform is built around: read a problem statement, name the pattern,
 * then see the signals that gave it away. It trains recognition rather than recall of
 * solutions — which is the difference between solving a problem you have seen and solving one
 * you have not.
 */
export default function PracticePage() {
  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<platform.PracticeResult | null>(null);
  const [count, setCount] = useState(8);

  const load = (howMany: number) => {
    setQuestions(null);
    setError(null);
    setAnswers({});
    setResult(null);
    setIndex(0);
    platform
      .practiceQuestions(howMany)
      .then(setQuestions)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  };

  useEffect(() => {
    load(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <ErrorBox message={error} onRetry={() => load(count)} />;
  if (!questions) return <Loading label="Loading practice questions" />;

  const question = questions[index];
  const answered = Object.keys(answers).length;
  const allAnswered = answered === questions.length;

  const submit = async () => {
    setResult(await platform.evaluatePractice(answers));
  };

  if (result) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-16">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Pattern recognition — results</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {result.score} of {result.total} correct. The signals below are what you should be reading for next time.
          </p>
        </header>

        <Card>
          <ProgressBar percent={result.percent} label="Score" tone={result.percent >= 70 ? 'good' : 'warn'} />
        </Card>

        <div className="space-y-3">
          {result.results.map((row) => {
            const original = questions.find((item) => item.id === row.id);
            return (
              <Card key={row.id} className={row.correct ? 'border-good/40' : 'border-warn/40'}>
                <p className="text-sm text-ink">{original?.prompt}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className={row.correct ? 'text-good' : 'text-bad'}>
                    {row.correct ? '✓' : '✕'} you said {row.given.replace(/-/g, ' ')}
                  </span>
                  {!row.correct ? (
                    <span className="text-good">→ {row.answer.replace(/-/g, ' ')}</span>
                  ) : null}
                  <Link to={`/dsa/${row.answer}`} className="ml-auto text-brand hover:underline">
                    open the lesson →
                  </Link>
                </div>
                {row.signals.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.signals.map((signal) => (
                      <Badge key={signal} tone="pattern">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 text-sm text-ink-muted">{row.explanation}</p>
              </Card>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => load(count)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          Another round
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Identify the pattern</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          You are not asked to solve these. You are asked to say which pattern each one needs — the decision that, in a
          real interview, happens in the first two minutes and determines everything after it.
        </p>
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-ink-muted">
          Questions:
          <select
            value={count}
            onChange={(event) => {
              const next = Number(event.target.value);
              setCount(next);
              load(next);
            }}
            className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink"
          >
            {[5, 8, 12, 20].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </header>

      <ProgressBar percent={Math.round((answered / questions.length) * 100)} label={`${answered} of ${questions.length} answered`} />

      {question ? (
        <Card>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
            Question {index + 1} of {questions.length}
          </p>
          <p className="text-base text-ink">{question.prompt}</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => {
              const selected = answers[question.id] === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selected ? 'border-brand bg-brand/10 font-medium text-ink' : 'border-line text-ink-muted hover:bg-surface-sunken'
                  }`}
                >
                  {option.replace(/-/g, ' ')}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40"
            >
              ← Previous
            </button>

            {index < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setIndex((value) => value + 1)}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!allAnswered}
                className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {allAnswered ? 'See results' : `${questions.length - answered} left`}
              </button>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
