import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Callout, Card, CodeBlock, ErrorBox, Loading, SectionHeading, TranslationNotice } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { DecisionTreeWalker, Quiz, StudyControls } from '../components/learning';
import { Interactive } from '../components/interactives';
import { Visualizer } from '../visualizers/Visualizer';
import type { Lesson } from '../types';

/**
 * The lesson page — the platform's core teaching surface.
 *
 * The order of sections is the pedagogy, not a layout choice:
 * analogy → the problem → brute force → why it is slow → the observation → the leap →
 * how it works → visualise it → recognise it → implement it → complexity → mistakes → quiz.
 *
 * The solution is never shown before the problem it solves (§42 of the brief).
 */
export default function LessonPage() {
  const { id = '' } = useParams();
  const { explanationMode, refreshProgress, t, language } = useAppState();
  const { data: lesson, loading, error, reload } = useAsync<Lesson>(() => platform.lesson(id), [id, language]);
  const [implementation, setImplementation] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // The practice set needs each problem's LeetCode number, which the lesson only knows as ids.
  // One grouped call rather than n document fetches, and it fails soft: if it does not load, the
  // section still lists the problems, just without their numbers.
  const { data: byPattern } = useAsync(() => platform.problemsByPattern(), []);
  const practiceSet = (lesson?.practiceProblems ?? []).map((problemId) => {
    const summary = (byPattern ?? [])
      .flatMap((group) => group.tiers.flatMap((tier) => tier.problems))
      .find((problem) => problem.id === problemId);
    return { id: problemId, title: summary?.title, number: summary?.leetcodeId, premium: summary?.leetcodePremium };
  });
  const leetcodeNumbers = practiceSet.filter((entry) => entry.number).map((entry) => entry.number);

  useEffect(() => {
    setImplementation(0);
    setRevealed(false);
    window.scrollTo({ top: 0 });
  }, [id]);

  // Opening a lesson marks it in progress, so "continue learning" has something to point at.
  useEffect(() => {
    if (!lesson) return;
    void platform.updateLessonProgress(lesson.id, 'in_progress', 10).then(refreshProgress);
  }, [lesson, refreshProgress]);

  if (loading) return <Loading label="Loading lesson" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!lesson) return null;

  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-16">
      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <Link to="/dsa" className="text-brand hover:underline">
            DSA
          </Link>
          <span className="text-ink-faint">/</span>
          <span className="text-ink-muted">{lesson.group}</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-ink">{lesson.title}</h1>
        <p className="mt-2 max-w-prose text-base text-ink-muted">{lesson.summary}</p>
        <TranslationNotice translation={lesson.translation} message={t('common.notTranslated')} />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={lesson.kind}>{lesson.kind}</Badge>
          <Badge tone={lesson.difficulty}>{lesson.difficulty}</Badge>
          <Badge>Level {lesson.level}</Badge>
          {lesson.estimatedMinutes ? <Badge>{lesson.estimatedMinutes} min</Badge> : null}
        </div>

        {lesson.prerequisites && lesson.prerequisites.length > 0 ? (
          <p className="mt-3 text-xs text-ink-muted">
            Assumes you have done:{' '}
            {lesson.prerequisites.map((prerequisite, index) => (
              <span key={prerequisite}>
                {index > 0 ? ', ' : ''}
                <Link to={`/dsa/${prerequisite}`} className="text-brand hover:underline">
                  {prerequisite.replace(/-/g, ' ')}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </header>

      <StudyControls contentId={lesson.id} contentType="lesson" />

      {/* 1. Analogy, in the reader's chosen register */}
      <section>
        <SectionHeading
          title="The idea, in plain terms"
          subtitle={explanationMode === 'beginner' ? 'Beginner mode' : 'Interview mode'}
        />
        <Callout tone="info">{lesson.analogy[explanationMode]}</Callout>
      </section>

      {/* 2. Why it exists */}
      {lesson.intuition ? (
        <section>
          <SectionHeading title="Why this exists" />
          <Markdown>{lesson.intuition}</Markdown>
        </section>
      ) : null}

      {/* 3. The problem-first journey — the signature feature */}
      {lesson.problemFirst ? (
        <section>
          <SectionHeading
            title="Start with the problem"
            subtitle="Brute force → why it is slow → the observation → the leap"
          />

          <div className="space-y-4">
            <Card>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-faint">The problem</p>
              <Markdown>{lesson.problemFirst.motivatingProblem}</Markdown>
            </Card>

            <Card>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                First instinct — brute force
              </p>
              <Markdown>{lesson.problemFirst.bruteForce.idea}</Markdown>
              <div className="mt-3">
                <CodeBlock code={lesson.problemFirst.bruteForce.code} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge>Time {lesson.problemFirst.bruteForce.complexity.time}</Badge>
                <Badge>Space {lesson.problemFirst.bruteForce.complexity.space}</Badge>
              </div>
            </Card>

            <Callout tone="warn" title="Why that is not good enough">
              {lesson.problemFirst.bruteForce.whySlow}
            </Callout>

            {!revealed ? (
              <div className="rounded-xl border border-dashed border-brand/50 bg-brand/[0.03] p-5 text-center">
                <p className="text-sm text-ink-muted">
                  Before reading on — what is being repeated here that could be remembered instead?
                </p>
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
                >
                  Show me the insight
                </button>
              </div>
            ) : (
              <>
                <Callout tone="info" title="The observation">
                  {lesson.problemFirst.observation}
                </Callout>
                <Callout tone="good" title="The leap">
                  {lesson.problemFirst.leap}
                </Callout>
                {lesson.problemFirst.optimizedSketch ? (
                  <CodeBlock code={lesson.problemFirst.optimizedSketch} title="The idea in code" />
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : null}

      {/* 4. Mechanics */}
      {lesson.howItWorks && lesson.howItWorks.length > 0 ? (
        <section>
          <SectionHeading title="How it works" />
          <ol className="space-y-2">
            {lesson.howItWorks.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand">
                  {index + 1}
                </span>
                <Markdown className="flex-1">{step}</Markdown>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* 5. Visualisations */}
      {lesson.visualizations && lesson.visualizations.length > 0 ? (
        <section>
          <SectionHeading
            title="See it run"
            subtitle="Step through it. The highlighted code line is the line being executed."
          />
          <div className="space-y-6">
            {lesson.visualizations.map((visualization, index) => (
              <Visualizer
                key={visualization.id ?? index}
                spec={{
                  id: visualization.id,
                  title: visualization.title,
                  engine: visualization.engine,
                  input: visualization.input,
                  code: visualization.code,
                  codeLineOffset: visualization.codeLineOffset,
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* 6. Interactive widget, where the lesson has one */}
      {lesson.interactive ? (
        <section>
          <SectionHeading title="Try it yourself" />
          <Interactive id={lesson.interactive} />
        </section>
      ) : null}

      {/* 7. Recognition — the skill the platform is built around */}
      {lesson.patternRecognition ? (
        <section>
          <SectionHeading
            title="How do I recognise this?"
            subtitle="The signals that should make you reach for this pattern — and the ones that should stop you."
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-good">Reach for it when</p>
              <ul className="space-y-1.5 text-sm">
                {lesson.patternRecognition.signals.map((signal) => (
                  <li key={signal} className="flex gap-2">
                    <span className="text-good">✓</span>
                    <Markdown className="flex-1">{signal}</Markdown>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-bad">Do not, when</p>
              <ul className="space-y-1.5 text-sm">
                {lesson.patternRecognition.antiSignals.length === 0 ? (
                  <li className="text-ink-faint">No specific anti-signals for this one.</li>
                ) : (
                  lesson.patternRecognition.antiSignals.map((signal) => (
                    <li key={signal} className="flex gap-2">
                      <span className="text-bad">✕</span>
                      <Markdown className="flex-1">{signal}</Markdown>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          </div>

          {lesson.patternRecognition.decisionTreeId ? (
            <div className="mt-3">
              <DecisionTreeWalker treeId={lesson.patternRecognition.decisionTreeId} />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 8. Implementations */}
      {lesson.implementations && lesson.implementations.length > 0 ? (
        <section>
          <SectionHeading title="The code" subtitle="Simple first, then the version you would write in an interview." />
          <div className="mb-3 flex gap-1">
            {lesson.implementations.map((item, index) => (
              <button
                key={item.label ?? index}
                type="button"
                onClick={() => setImplementation(index)}
                aria-pressed={implementation === index}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  implementation === index ? 'bg-brand text-white' : 'border border-line text-ink-muted hover:bg-surface-sunken'
                }`}
              >
                {item.label ?? `Version ${index + 1}`}
              </button>
            ))}
          </div>
          {lesson.implementations[implementation] ? (
            <div>
              {lesson.implementations[implementation].explanation ? (
                <Markdown className="mb-3">{lesson.implementations[implementation].explanation}</Markdown>
              ) : null}
              <CodeBlock code={lesson.implementations[implementation].code} />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 9. Complexity, with the reasoning */}
      {lesson.complexity ? (
        <section>
          <SectionHeading title="Complexity" subtitle="The number matters less than the reason." />
          <Card>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="pattern">Time {lesson.complexity.time}</Badge>
              <Badge tone="pattern">Space {lesson.complexity.space}</Badge>
            </div>
            {lesson.complexity.why ? <Markdown>{lesson.complexity.why}</Markdown> : null}
          </Card>
        </section>
      ) : null}

      {/* 10. Mistakes */}
      {lesson.commonMistakes && lesson.commonMistakes.length > 0 ? (
        <section>
          <SectionHeading title="Common mistakes" subtitle="Each of these has cost somebody an interview." />
          <div className="space-y-2">
            {lesson.commonMistakes.map((mistake) => (
              <details key={mistake.mistake} className="card group px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-ink marker:hidden">
                  <span className="mr-2 text-bad">✕</span>
                  <Markdown className="inline">{mistake.mistake}</Markdown>
                </summary>
                <div className="mt-2 border-l-2 border-good/50 pl-3">
                  <Markdown className="text-sm">{mistake.fix}</Markdown>
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {/* 11. Where it shows up */}
      {(lesson.realWorldUses?.length || lesson.interviewNotes?.length) ? (
        <section className="grid gap-3 md:grid-cols-2">
          {lesson.realWorldUses?.length ? (
            <Card>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">In real systems</p>
              <ul className="space-y-1.5 text-sm text-ink-muted">
                {lesson.realWorldUses.map((use) => (
                  <li key={use}>• {use}</li>
                ))}
              </ul>
            </Card>
          ) : null}
          {lesson.interviewNotes?.length ? (
            <Card>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">In interviews</p>
              <ul className="space-y-1.5 text-sm text-ink-muted">
                {lesson.interviewNotes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </section>
      ) : null}

      {/* 12. Quiz */}
      <Quiz contentId={lesson.id} />

      {/* 13. Practice and related */}
      {lesson.practiceProblems && lesson.practiceProblems.length > 0 ? (
        <section>
          <SectionHeading
            title="Now practise it"
            subtitle="Ordered from easiest to hardest. Read the write-up here, then go and type it on a judge — that second half is the part this app cannot do for you."
          />
          <div className="space-y-1.5">
            {practiceSet.map((entry) => (
              <Link
                key={entry.id}
                to={`/problems/${entry.id}`}
                className="card flex items-center gap-3 px-4 py-2.5 transition-colors hover:border-brand/60"
              >
                <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-ink-faint">
                  {entry.number ? `${entry.number}${entry.premium ? '*' : ''}` : '—'}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {entry.title ?? entry.id.replace(/-/g, ' ')}
                </span>
                <span className="text-ink-faint">→</span>
              </Link>
            ))}
          </div>
          {leetcodeNumbers.length > 0 ? (
            <p className="mt-3 text-xs text-ink-muted">
              The LeetCode set for this pattern:{' '}
              <span className="font-mono text-ink">{leetcodeNumbers.join(', ')}</span>
              {practiceSet.some((entry) => entry.premium) ? ' — * marks a Premium problem.' : '.'}
            </p>
          ) : null}
        </section>
      ) : null}

      {lesson.related && lesson.related.length > 0 ? (
        <section>
          <SectionHeading title="Related" />
          <div className="flex flex-wrap gap-2">
            {lesson.related.map((relatedId) => (
              <Link key={relatedId} to={`/dsa/${relatedId}`} className="text-sm text-brand hover:underline">
                {relatedId.replace(/-/g, ' ')}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
