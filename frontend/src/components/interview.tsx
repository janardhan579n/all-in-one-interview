import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Card, CodeBlock } from './ui';
import { Markdown } from './Markdown';
import type { InterviewLevel, InterviewQuestion } from '../types';

const LEVEL_TONE: Record<InterviewLevel, string> = {
  junior: 'beginner',
  mid: 'intermediate',
  senior: 'advanced',
};

const TYPE_LABEL: Record<string, string> = {
  concept: 'Concept',
  code: 'Code',
  scenario: 'Scenario',
  tradeoff: 'Trade-off',
  behavioural: 'Behavioural',
};

/**
 * One interview question, answer hidden until you commit to an attempt.
 *
 * The gate is the whole point (§42 applied to interview prep): reading a model answer produces a
 * strong feeling of understanding and almost no ability to reproduce it under pressure. The
 * button is deliberately worded to prompt an attempt rather than a click.
 *
 * Self-marking writes through the ordinary content-flag endpoints, so a question you flag for
 * review appears in the same weak-area reporting as a lesson or a problem.
 */
export function QuestionCard({
  question,
  index,
  defaultOpen = false,
}: {
  question: InterviewQuestion;
  index?: number;
  defaultOpen?: boolean;
}) {
  const { progress, refreshProgress } = useAppState();
  const [revealed, setRevealed] = useState(defaultOpen);
  const [openFollowUps, setOpenFollowUps] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  const flags = progress?.flags?.[question.id];

  const mark = async (mastered: boolean) => {
    setSaving(true);
    try {
      await platform.setFlags(question.id, !mastered, mastered);
      await refreshProgress();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={flags?.mastered ? 'border-good/40' : flags?.difficult ? 'border-warn/40' : ''}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {index !== undefined ? (
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-[11px] font-semibold tabular-nums text-ink-faint">
              {index}
            </span>
          ) : null}
          <h3 className="min-w-0 text-base font-semibold leading-snug text-ink">{question.question}</h3>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Badge tone={LEVEL_TONE[question.level]}>{question.level}</Badge>
          <Badge tone="neutral">{TYPE_LABEL[question.type] ?? question.type}</Badge>
        </div>
      </div>

      {question.codeExample && !revealed ? (
        <div className="mt-4">
          <CodeBlock code={question.codeExample.code} title="Look at this before you answer" />
        </div>
      ) : null}

      {!revealed ? (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-surface-sunken/60 p-4 text-center">
          <p className="mx-auto max-w-prose text-sm text-ink-muted">
            Answer it out loud first — properly, as if someone were listening. What you can say is the only thing
            that transfers to the room.
          </p>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Show a strong answer
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {question.codeExample ? <CodeBlock code={question.codeExample.code} /> : null}

          <div className="prose-sm">
            <Markdown>{question.answer}</Markdown>
          </div>

          {question.keyPoints?.length ? (
            <section>
              <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                What the interviewer is listening for
              </h4>
              <ul className="space-y-1.5">
                {question.keyPoints.map((point) => (
                  <li key={point} className="flex gap-2 text-sm text-ink-muted">
                    <span className="mt-0.5 text-good" aria-hidden="true">
                      ✓
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {question.followUps?.length ? (
            <section>
              <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                Follow-ups you should expect
              </h4>
              <div className="space-y-2">
                {question.followUps.map((followUp, i) => (
                  <div key={followUp.q} className="rounded-lg border border-line">
                    <button
                      type="button"
                      onClick={() => setOpenFollowUps((current) => ({ ...current, [i]: !current[i] }))}
                      aria-expanded={Boolean(openFollowUps[i])}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken"
                    >
                      <span className="mt-0.5 text-xs text-ink-faint" aria-hidden="true">
                        {openFollowUps[i] ? '▾' : '▸'}
                      </span>
                      <span className="flex-1">{followUp.q}</span>
                    </button>
                    {openFollowUps[i] ? (
                      <div className="border-t border-line px-3 py-2 text-sm text-ink-muted">
                        <Markdown>{followUp.a}</Markdown>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {question.redFlags?.length ? (
            <section>
              <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-bad">
                Answers that lose marks
              </h4>
              <ul className="space-y-1.5">
                {question.redFlags.map((flag) => (
                  <li key={flag} className="flex gap-2 text-sm text-ink-muted">
                    <span className="mt-0.5 text-bad" aria-hidden="true">
                      ✗
                    </span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {question.related?.length ? (
            <section>
              <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                Read more on this
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {question.related.map((id) => (
                  <RelatedLink key={id} id={id} />
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="mr-1 text-xs text-ink-faint">How did that go?</span>
            <button
              type="button"
              disabled={saving}
              onClick={() => mark(true)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                flags?.mastered
                  ? 'border-good bg-good/10 text-good'
                  : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              ✓ I could answer this
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => mark(false)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                flags?.difficult
                  ? 'border-warn bg-warn/10 text-warn'
                  : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink'
              }`}
            >
              ↻ Review this again
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * A link to the lesson or concept behind a question.
 *
 * The route is resolved from the content type rather than guessed from the id, because the same
 * id shape is used across lessons, problems, concepts and case studies.
 */
function RelatedLink({ id }: { id: string }) {
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void platform.typeOf(id).then((type) => {
      if (cancelled) return;
      const routes: Record<string, string> = {
        problem: `/problems/${id}`,
        concept: `/system-design/${id}`,
        'case-study': `/system-design/case-studies/${id}`,
        'question-set': `/interview/sets/${id}`,
        lesson: `/dsa/${id}`,
      };
      setRoute(routes[type] ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!route) {
    return <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs text-ink-faint">{id}</span>;
  }

  return (
    <Link
      to={route}
      className="rounded-full border border-line px-2.5 py-1 text-xs text-brand transition-colors hover:bg-brand/10"
    >
      {id} →
    </Link>
  );
}
