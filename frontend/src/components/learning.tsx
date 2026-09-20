import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import type { DecisionTree, QuizQuestion, QuizResult, Tradeoff } from '../types';
import { Badge, Callout, Card, Loading, SectionHeading } from './ui';
import { Markdown } from './Markdown';

/**
 * Quiz.
 *
 * Answers are never in the payload when the backend is running — marking is a round trip, and
 * the explanation arrives with the result. That keeps the quiz honest and, more importantly,
 * means the explanation is read at the moment the learner is most receptive to it.
 */
export function Quiz({ contentId }: { contentId: string }) {
  const { refreshProgress } = useAppState();
  const { data: questions, loading } = useAsync<QuizQuestion[]>(
    () => platform.quizQuestions(contentId),
    [contentId],
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAnswers({});
    setResult(null);
  }, [contentId]);

  if (loading) return <Loading label="Loading quiz" />;
  if (!questions || questions.length === 0) return null;

  const allAnswered = questions.every((question) => answers[question.id] !== undefined);

  const submit = async () => {
    setSubmitting(true);
    try {
      const outcome = await platform.evaluateQuiz(contentId, answers);
      setResult(outcome);
      await refreshProgress();
    } finally {
      setSubmitting(false);
    }
  };

  const resultFor = (questionId: string) => result?.results.find((row) => row.questionId === questionId);

  return (
    <section aria-labelledby="quiz-heading">
      <SectionHeading
        id="quiz-heading"
        title="Check your understanding"
        subtitle={
          result
            ? `${result.score} / ${result.total} correct`
            : 'Answer every question, then submit to see the explanations.'
        }
      />

      <div className="space-y-4">
        {questions.map((question, index) => {
          const outcome = resultFor(question.id);
          return (
            <Card key={question.id}>
              <fieldset>
                <legend className="mb-3 text-sm font-medium text-ink">
                  <span className="mr-2 text-ink-faint">{index + 1}.</span>
                  <span className="whitespace-pre-wrap">{question.question}</span>
                </legend>

                <div className="space-y-1.5">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[question.id] === optionIndex;
                    const isCorrect = outcome && outcome.correctIndex === optionIndex;
                    const isWrongPick = outcome && selected && !outcome.correct;

                    return (
                      <label
                        key={optionIndex}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          isCorrect
                            ? 'border-good bg-good/10'
                            : isWrongPick
                              ? 'border-bad bg-bad/10'
                              : selected
                                ? 'border-brand bg-brand/5'
                                : 'border-line hover:bg-surface-sunken'
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          checked={selected}
                          disabled={Boolean(result)}
                          onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                          className="mt-0.5 accent-brand"
                        />
                        <span className="text-ink-muted">{option}</span>
                        {isCorrect ? <span className="ml-auto shrink-0 text-good">✓</span> : null}
                      </label>
                    );
                  })}
                </div>

                {outcome ? (
                  <div className="mt-3 rounded-lg bg-surface-sunken p-3 text-sm">
                    <p className={`mb-1 font-medium ${outcome.correct ? 'text-good' : 'text-warn'}`}>
                      {outcome.correct ? 'Correct' : 'Not quite'}
                    </p>
                    <p className="text-ink-muted">{outcome.explanation}</p>
                  </div>
                ) : null}
              </fieldset>
            </Card>
          );
        })}
      </div>

      {!result ? (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!allAnswered || submitting}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Marking…' : allAnswered ? 'Submit answers' : `Answer all ${questions.length} questions`}
        </button>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <Badge tone={result.passed ? 'beginner' : 'intermediate'}>
            {result.percent}% {result.passed ? '· passed' : '· keep going'}
          </Badge>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setResult(null);
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken"
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
}

/** Interactive decision tree: answer questions, arrive at a recommendation. */
export function DecisionTreeWalker({ treeId }: { treeId: string }) {
  const { data: tree, loading, error } = useAsync<DecisionTree>(() => platform.decisionTree(treeId), [treeId]);
  const [path, setPath] = useState<string[]>([]);

  useEffect(() => setPath([]), [treeId]);

  if (loading) return <Loading label="Loading decision tree" />;
  if (error || !tree) return null;

  const currentId = path.length === 0 ? tree.start : path[path.length - 1];
  const current = tree.nodes[currentId];
  if (!current) return null;

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{tree.title}</h3>
        {path.length > 0 ? (
          <button
            type="button"
            onClick={() => setPath([])}
            className="shrink-0 text-xs text-brand hover:underline"
          >
            Start over
          </button>
        ) : null}
      </div>

      {path.length > 1 ? (
        <ol className="mb-3 space-y-1 text-xs text-ink-faint">
          {path.slice(0, -1).map((nodeId, index) => (
            <li key={`${nodeId}-${index}`}>↳ {tree.nodes[nodeId]?.text}</li>
          ))}
        </ol>
      ) : null}

      {current.type === 'question' ? (
        <div>
          <Markdown className="mb-3 text-sm">{current.text}</Markdown>
          <div className="flex flex-wrap gap-2">
            {current.options?.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setPath((value) => [...value, option.next])}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-brand hover:bg-brand/5"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-good/40 bg-good/5 p-4">
          <p className="text-sm font-semibold text-ink">→ {current.text}</p>
          {current.detail ? <Markdown className="mt-1 text-sm">{current.detail}</Markdown> : null}
          {current.lessonId ? (
            <Link
              to={`/dsa/${current.lessonId}`}
              className="mt-3 inline-block text-xs font-medium text-brand hover:underline"
            >
              Open the lesson →
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setPath((value) => value.slice(0, -1))}
            className="ml-3 mt-3 inline-block text-xs text-ink-muted hover:underline"
          >
            ← back
          </button>
        </div>
      )}
    </Card>
  );
}

/** Trade-off cards: never "X is better", always "here is what each costs you". */
export function TradeoffCards({ tradeoffs }: { tradeoffs: Tradeoff[] }) {
  if (!tradeoffs || tradeoffs.length === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {tradeoffs.map((tradeoff) => (
        <Card key={tradeoff.option} className="flex flex-col">
          <h4 className="mb-3 font-medium text-ink">{tradeoff.option}</h4>
          <div className="space-y-3 text-sm">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-good">Advantages</p>
              <ul className="space-y-1">
                {tradeoff.pros.map((pro) => (
                  <li key={pro} className="flex gap-2 text-ink-muted">
                    <span className="text-good">+</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-bad">Costs</p>
              <ul className="space-y-1">
                {tradeoff.cons.map((con) => (
                  <li key={con} className="flex gap-2 text-ink-muted">
                    <span className="text-bad">−</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
            {tradeoff.examples ? (
              <p className="border-t border-line pt-2 text-xs text-ink-faint">e.g. {tradeoff.examples}</p>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Notes, bookmark and completion controls — the per-item study toolbar. */
export function StudyControls({ contentId, contentType }: { contentId: string; contentType: string }) {
  const { progress, refreshProgress } = useAppState();
  const [note, setNote] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  const completed = progress?.lessons[contentId]?.status === 'completed';

  useEffect(() => {
    void platform.note(contentId).then(setNote).catch(() => setNote(''));
    void platform
      .bookmarks()
      .then((rows) => setBookmarked(rows.some((row) => row.contentId === contentId)))
      .catch(() => setBookmarked(false));
  }, [contentId]);

  const toggleComplete = async () => {
    await platform.updateLessonProgress(contentId, completed ? 'in_progress' : 'completed', completed ? 50 : 100);
    await refreshProgress();
  };

  const toggleBookmark = async () => {
    const next = !bookmarked;
    setBookmarked(next);
    await platform.toggleBookmark(contentId, next);
  };

  const saveNote = async () => {
    await platform.saveNote(contentId, note);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void toggleComplete()}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            completed ? 'bg-good/15 text-good' : 'bg-brand text-white hover:opacity-90'
          }`}
        >
          {completed ? '✓ Completed' : 'Mark as complete'}
        </button>

        <button
          type="button"
          onClick={() => void toggleBookmark()}
          aria-pressed={bookmarked}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken"
        >
          {bookmarked ? '🔖 Bookmarked' : '🔖 Bookmark'}
        </button>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken"
        >
          📝 {note ? 'Edit note' : 'Add note'}
        </button>

        <span className="ml-auto text-[11px] text-ink-faint">{contentType}</span>
      </div>

      {open ? (
        <div className="mt-3">
          <label className="sr-only" htmlFor={`note-${contentId}`}>
            Your note
          </label>
          <textarea
            id={`note-${contentId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="What clicked for you here? Write it in your own words — that is what makes it stick."
            className="w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void saveNote()}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white"
            >
              Save note
            </button>
            {saved ? <span className="text-xs text-good">Saved</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** "Why does this exist?" — the WHY-mode panel used across System Design. */
export function WhyPanel({ why }: { why: { without: string[]; with: string[]; conclusion: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-semibold text-ink">Why does this exist?</span>
        <span className="text-xs text-brand">{open ? 'hide' : 'show me'}</span>
      </button>

      {open ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-bad/30 bg-bad/5 p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-bad">Without it</p>
            <ul className="space-y-1 text-sm text-ink-muted">
              {why.without.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-good/30 bg-good/5 p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-good">With it</p>
            <ul className="space-y-1 text-sm text-ink-muted">
              {why.with.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <Callout tone="info">{why.conclusion}</Callout>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
