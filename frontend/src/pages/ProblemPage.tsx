import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Callout, Card, CodeBlock, ErrorBox, Loading, SectionHeading } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { StudyControls } from '../components/learning';
import { Visualizer } from '../visualizers/Visualizer';
import type { Problem } from '../types';

/**
 * A problem page is a staged reveal, not a solution dump.
 *
 * You see the statement and are asked to think. Then the brute force, then why it is slow,
 * then which pattern the signals point at — and only then the optimised solution. Skipping to
 * the answer is possible but deliberate.
 */
export default function ProblemPage() {
  const { id = '' } = useParams();
  const { progress, refreshProgress } = useAppState();
  const { data: problem, loading, error, reload } = useAsync<Problem>(() => platform.problem(id), [id]);

  const [stage, setStage] = useState(0);
  const [confidence, setConfidence] = useState(3);

  useEffect(() => {
    setStage(0);
    window.scrollTo({ top: 0 });
  }, [id]);

  if (loading) return <Loading label="Loading problem" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!problem) return null;

  const attempt = progress?.problems[problem.id];

  const record = async (solved: boolean) => {
    await platform.recordAttempt(problem.id, solved, confidence);
    await refreshProgress();
  };

  const stages = [
    'Think about it first',
    'Brute force',
    'Why it is slow',
    'Which pattern?',
    'Optimised solution',
  ];

  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-16">
      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <Link to="/problems" className="text-brand hover:underline">
            Problems
          </Link>
          {problem.patternId ? (
            <>
              <span className="text-ink-faint">/</span>
              <Link to={`/dsa/${problem.patternId}`} className="text-brand hover:underline">
                {problem.patternId.replace(/-/g, ' ')}
              </Link>
            </>
          ) : null}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-ink">{problem.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={problem.difficulty}>{problem.difficulty}</Badge>
          {problem.tags?.map((tag) => <Badge key={tag}>{tag}</Badge>)}
          {attempt?.solved ? <Badge tone="beginner">solved</Badge> : null}
        </div>
      </header>

      <StudyControls contentId={problem.id} contentType="problem" />

      <section>
        <SectionHeading title="The problem" />
        <Card>
          <Markdown>{problem.statement}</Markdown>

          {problem.examples && problem.examples.length > 0 ? (
            <div className="mt-4 space-y-2">
              {problem.examples.map((example, index) => (
                <div key={index} className="rounded-lg bg-surface-sunken p-3 font-mono text-xs">
                  <p className="text-ink">
                    <span className="text-ink-faint">Input: </span>
                    {example.input}
                  </p>
                  <p className="text-ink">
                    <span className="text-ink-faint">Output: </span>
                    {example.output}
                  </p>
                  {example.explanation ? (
                    <p className="mt-1 font-sans text-ink-muted">{example.explanation}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {problem.constraints && problem.constraints.length > 0 ? (
            <div className="mt-4">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-faint">Constraints</p>
              <ul className="space-y-0.5 font-mono text-xs text-ink-muted">
                {problem.constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs italic text-ink-faint">
                Read the constraints before designing — they tell you which complexity is intended.
              </p>
            </div>
          ) : null}
        </Card>
      </section>

      {problem.realWorld ? (
        <Callout tone="info" title="Where this actually shows up">
          {problem.realWorld}
        </Callout>
      ) : null}

      {/* Staged reveal */}
      <section>
        <SectionHeading
          title="Work through it"
          subtitle={`Step ${Math.min(stage + 1, stages.length)} of ${stages.length}: ${stages[Math.min(stage, stages.length - 1)]}`}
        />

        {stage === 0 ? (
          <div className="rounded-xl border border-dashed border-brand/50 bg-brand/[0.03] p-6 text-center">
            <p className="mx-auto max-w-prose text-sm text-ink-muted">
              Spend a few minutes on it before reading on. Even an approach you reject teaches you more than reading
              the answer does — and being able to describe a brute force is worth real marks in an interview.
            </p>
            <button
              type="button"
              onClick={() => setStage(1)}
              className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              I've thought about it →
            </button>
          </div>
        ) : null}

        <div className="space-y-4">
          {stage >= 1 && problem.bruteForce ? (
            <Card>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-faint">Brute force</p>
              <Markdown>{problem.bruteForce.idea}</Markdown>
              <div className="mt-3">
                <CodeBlock code={problem.bruteForce.code} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>Time {problem.bruteForce.complexity.time}</Badge>
                <Badge>Space {problem.bruteForce.complexity.space}</Badge>
              </div>
              {stage === 1 ? (
                <button
                  type="button"
                  onClick={() => setStage(2)}
                  className="mt-4 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-sunken"
                >
                  Why is that not good enough? →
                </button>
              ) : null}
            </Card>
          ) : null}

          {stage >= 2 && problem.bruteForce ? (
            <>
              <Callout tone="warn" title="Why it is too slow">
                {problem.bruteForce.whySlow}
              </Callout>
              {stage === 2 ? (
                <button
                  type="button"
                  onClick={() => setStage(3)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-sunken"
                >
                  Which pattern does this need? →
                </button>
              ) : null}
            </>
          ) : null}

          {stage >= 3 && problem.patternIdentification ? (
            <>
              <Callout tone="info" title="Identifying the pattern">
                {problem.patternIdentification}
              </Callout>
              {stage === 3 ? (
                <button
                  type="button"
                  onClick={() => setStage(4)}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
                >
                  Show the optimised solution →
                </button>
              ) : null}
            </>
          ) : null}

          {stage >= 4 && problem.optimized ? (
            <Card>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-good">Optimised</p>
              <Markdown>{problem.optimized.idea}</Markdown>
              <div className="mt-3">
                <CodeBlock code={problem.optimized.code} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="beginner">Time {problem.optimized.complexity.time}</Badge>
                <Badge tone="beginner">Space {problem.optimized.complexity.space}</Badge>
              </div>
            </Card>
          ) : null}
        </div>
      </section>

      {stage >= 4 && problem.visualization ? (
        <section>
          <SectionHeading title="See it run" />
          <Visualizer
            spec={{
              engine: problem.visualization.engine,
              input: problem.visualization.input,
              code: problem.visualization.code,
              codeLineOffset: problem.visualization.codeLineOffset,
            }}
          />
        </section>
      ) : null}

      {stage >= 4 && problem.commonMistakes && problem.commonMistakes.length > 0 ? (
        <section>
          <SectionHeading title="Common mistakes" />
          <ul className="space-y-1.5">
            {problem.commonMistakes.map((mistake) => (
              <li key={mistake} className="card flex gap-2 px-4 py-2.5 text-sm text-ink-muted">
                <span className="text-bad">✕</span>
                <Markdown className="flex-1">{mistake}</Markdown>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Self-assessment — the data behind the weak-areas report */}
      <section>
        <SectionHeading
          title="How did that go?"
          subtitle="Honest answers here are what make the weak-areas report on your dashboard useful."
        />
        <Card>
          <label className="block text-xs text-ink-muted">
            Confidence: <span className="font-medium text-ink">{confidence} / 5</span>
            <input
              type="range"
              min={1}
              max={5}
              value={confidence}
              onChange={(event) => setConfidence(Number(event.target.value))}
              className="mt-1 w-full max-w-xs accent-brand"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void record(true)}
              className="rounded-lg bg-good/15 px-3 py-1.5 text-sm font-medium text-good hover:bg-good/25"
            >
              ✓ I solved it
            </button>
            <button
              type="button"
              onClick={() => void record(false)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken"
            >
              Not yet — I'll come back
            </button>
            {attempt ? (
              <span className="self-center text-xs text-ink-faint">
                {attempt.attempts} attempt{attempt.attempts === 1 ? '' : 's'} recorded
              </span>
            ) : null}
          </div>
        </Card>
      </section>

      {/* Reading is not practising. This is the door out to a judge, and it belongs after the
          solution rather than before it — you go and type it once you have understood it. */}
      {problem.practice ? (
        <section>
          <SectionHeading
            title="Now go and type it"
            subtitle="Understanding the pattern and being able to write it under a clock are different skills. Only one of them is trained here."
          />
          <Card>
            {problem.practice.leetcode ? (
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={problem.practice.leetcode.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  LeetCode {problem.practice.leetcode.id}. {problem.practice.leetcode.title} ↗
                </a>
                {problem.practice.leetcode.premium ? (
                  <span className="rounded-lg border border-warn/50 bg-warn/10 px-2 py-1 text-xs text-warn">
                    Premium-only — the pattern is the same on the free problems linked below
                  </span>
                ) : null}
              </div>
            ) : null}
            {problem.practice.note ? (
              <p className="mt-3 text-sm text-ink-muted">{problem.practice.note}</p>
            ) : null}
          </Card>
        </section>
      ) : null}

      {problem.similar && problem.similar.length > 0 ? (
        <section>
          <SectionHeading title="Same idea, different clothes" />
          <div className="flex flex-wrap gap-2">
            {problem.similar.map((similarId) => (
              <Link
                key={similarId}
                to={`/problems/${similarId}`}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:border-brand hover:text-brand"
              >
                {similarId.replace(/-/g, ' ')}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
