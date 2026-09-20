import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { ContentCard, ErrorBox, Loading } from '../components/ui';

export default function CaseStudiesPage() {
  const { isCompleted } = useAppState();
  const { data, loading, error, reload } = useAsync(() => platform.caseStudies(), []);

  if (loading) return <Loading label="Loading case studies" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Case Studies</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Complete systems, built up stage by stage. The final architecture is never shown first — you watch each
          component get added in response to a specific pressure, which is the only way the diagram ever makes sense.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((study) => (
          <ContentCard
            key={study.id}
            to={`/system-design/case-studies/${study.id}`}
            title={study.title}
            summary={study.summary}
            completed={isCompleted(study.id)}
            badges={[
              { label: study.difficulty ?? '', tone: study.difficulty },
              ...(study.interactive ? [{ label: 'interactive', tone: 'pattern' }] : []),
            ].filter((badge) => badge.label)}
            meta={study.estimatedMinutes ? `${study.estimatedMinutes} min` : undefined}
          />
        ))}
      </div>
    </div>
  );
}
