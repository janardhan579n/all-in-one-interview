import { Link } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, ErrorBox, Loading, SectionHeading } from '../components/ui';

const TIER_LABEL: Record<string, string> = {
  beginner: '🟢 Beginner',
  intermediate: '🟡 Intermediate',
  advanced: '🔴 Advanced',
};

export default function ProblemsPage() {
  const { progress } = useAppState();
  const { data, loading, error, reload } = useAsync(() => platform.problemsByPattern(), []);

  if (loading) return <Loading label="Loading problems" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const solved = (id: string) => progress?.problems[id]?.solved === true;
  const attempted = (id: string) => (progress?.problems[id]?.attempts ?? 0) > 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Problems</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Grouped <strong className="text-ink">pattern → difficulty → problem</strong>, not as a flat list. The point is
          not to accumulate a solved count; it is to see the same idea recur at three levels of difficulty.
        </p>
        <p className="mt-2 max-w-prose text-xs text-ink-faint">
          The number on the left is the LeetCode problem number, so you can read the pattern here and then go and type
          it there. <span className="font-mono">*</span> marks a LeetCode Premium problem; <span className="font-mono">—</span>{' '}
          marks one with no equivalent on a judge, which its page explains.
        </p>
      </header>

      {(data ?? []).map((group) => (
        <section key={group.patternId}>
          <SectionHeading
            title={group.patternTitle}
            subtitle={group.group}
            action={
              <Link to={`/dsa/${group.patternId}`} className="shrink-0 text-xs font-medium text-brand hover:underline">
                Read the pattern →
              </Link>
            }
          />
          <div className="space-y-3">
            {group.tiers.map((tier) => (
              <div key={tier.difficulty}>
                <p className="mb-1.5 text-xs font-medium text-ink-muted">{TIER_LABEL[tier.difficulty] ?? tier.difficulty}</p>
                <ul className="space-y-1.5">
                  {tier.problems.map((problem) => (
                    <li key={problem.id}>
                      <Link
                        to={`/problems/${problem.id}`}
                        className="card flex items-center gap-3 px-4 py-2.5 transition-colors hover:border-brand/60"
                      >
                        {problem.leetcodeId ? (
                          <span
                            className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-ink-faint"
                            title={`LeetCode ${problem.leetcodeId}${problem.leetcodePremium ? ' (premium)' : ''}`}
                          >
                            {problem.leetcodeId}
                            {problem.leetcodePremium ? '*' : ''}
                          </span>
                        ) : (
                          <span className="w-12 shrink-0 text-right font-mono text-xs text-ink-faint">—</span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{problem.title}</span>
                        {solved(problem.id) ? (
                          <Badge tone="beginner">solved</Badge>
                        ) : attempted(problem.id) ? (
                          <Badge tone="intermediate">attempted</Badge>
                        ) : null}
                        <span className="text-ink-faint">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
