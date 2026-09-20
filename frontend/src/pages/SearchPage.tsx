import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Empty, ErrorBox, Loading } from '../components/ui';

const ROUTES: Record<string, (id: string) => string> = {
  lesson: (id) => `/dsa/${id}`,
  problem: (id) => `/problems/${id}`,
  concept: (id) => `/system-design/${id}`,
  'case-study': (id) => `/system-design/case-studies/${id}`,
};

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const { data, loading, error, reload } = useAsync(() => platform.search(query, 40), [query]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Search</h1>
        {query ? (
          <p className="mt-1 text-sm text-ink-muted">
            {loading ? 'Searching' : `${data?.length ?? 0} result${data?.length === 1 ? '' : 's'}`} for “{query}”
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">
            Search across lessons, problems, system design concepts and case studies. Every word must match — so two
            words narrow rather than widen.
          </p>
        )}
      </header>

      {loading ? <Loading /> : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {!loading && query && (data?.length ?? 0) === 0 ? (
        <Empty
          title="Nothing matched"
          hint="Try a single keyword — 'window', 'cache', 'shard' — or browse the pattern map."
        />
      ) : null}

      <ul className="space-y-2">
        {(data ?? []).map((hit) => (
          <li key={hit.id}>
            <Link
              to={(ROUTES[hit.type] ?? ROUTES.lesson)(hit.id)}
              className="card block px-4 py-3 transition-colors hover:border-brand/60"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{hit.title}</span>
                <Badge>{hit.type}</Badge>
                {hit.group ? <span className="text-xs text-ink-faint">{hit.group}</span> : null}
              </div>
              {hit.snippet ? <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{hit.snippet}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
