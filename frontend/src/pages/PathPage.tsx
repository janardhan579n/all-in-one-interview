import { Link, useParams } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, ErrorBox, Loading, ProgressBar } from '../components/ui';

const ROUTES: Record<string, (id: string) => string> = {
  lesson: (id) => `/dsa/${id}`,
  problem: (id) => `/problems/${id}`,
  concept: (id) => `/system-design/${id}`,
  'case-study': (id) => `/system-design/case-studies/${id}`,
};

export default function PathPage() {
  const { id = '' } = useParams();
  const { progress } = useAppState();
  const { data, loading, error, reload } = useAsync(() => platform.path(id), [id, progress]);

  if (loading) return <Loading label="Loading learning path" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  const totalMinutes = data.steps.reduce((sum, step) => sum + (step.estimatedMinutes ?? 0), 0);
  const nextStep = data.steps.find((step) => step.status !== 'completed');

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{data.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{data.description}</p>
        <p className="mt-2 text-xs text-ink-faint">
          For: {data.audience} · {data.total} steps · about {Math.round(totalMinutes / 60)} hours of material
        </p>
      </header>

      <Card>
        <ProgressBar label={`${data.completed} of ${data.total} complete`} percent={data.percent} />
        {nextStep ? (
          <Link
            to={(ROUTES[nextStep.kind] ?? ROUTES.lesson)(nextStep.ref)}
            className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            {data.completed === 0 ? 'Start' : 'Continue'}: {nextStep.title} →
          </Link>
        ) : (
          <p className="mt-3 text-sm text-good">Path complete. Try the interview simulator next.</p>
        )}
      </Card>

      <ol className="space-y-2">
        {data.steps.map((step, index) => {
          const to = (ROUTES[step.kind] ?? ROUTES.lesson)(step.ref);
          const done = step.status === 'completed';
          const inProgress = step.status === 'in_progress';

          return (
            <li key={`${step.ref}-${index}`}>
              <Link
                to={to}
                className={`card flex items-start gap-3 px-4 py-3 transition-colors hover:border-brand/60 ${
                  done ? 'opacity-70' : ''
                }`}
              >
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                    done
                      ? 'bg-good/20 text-good'
                      : inProgress
                        ? 'bg-brand/20 text-brand'
                        : 'bg-surface-sunken text-ink-faint'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{step.title}</p>
                  {step.summary ? <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{step.summary}</p> : null}
                </div>

                <div className="shrink-0 text-right">
                  <span className="block text-[11px] text-ink-faint">{step.kind}</span>
                  {step.estimatedMinutes ? (
                    <span className="block text-[11px] text-ink-faint">{step.estimatedMinutes} min</span>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
