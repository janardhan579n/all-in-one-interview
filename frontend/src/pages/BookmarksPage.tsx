import { Link } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, Empty, ErrorBox, Loading, SectionHeading } from '../components/ui';
import { Markdown } from '../components/Markdown';

const ROUTES: Record<string, (id: string) => string> = {
  lesson: (id) => `/dsa/${id}`,
  problem: (id) => `/problems/${id}`,
  concept: (id) => `/system-design/${id}`,
  'case-study': (id) => `/system-design/case-studies/${id}`,
};

function routeFor(type: string, id: string) {
  return (ROUTES[type] ?? ROUTES.lesson)(id);
}

export default function BookmarksPage() {
  const bookmarks = useAsync(() => platform.bookmarks(), []);
  const notes = useAsync(() => platform.notes(), []);

  if (bookmarks.loading || notes.loading) return <Loading label="Loading your saved items" />;
  if (bookmarks.error) return <ErrorBox message={bookmarks.error} onRetry={bookmarks.reload} />;
  if (notes.error) return <ErrorBox message={notes.error} onRetry={notes.reload} />;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Bookmarks &amp; notes</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your own words are the part that sticks. Notes are included in the progress export.
        </p>
      </header>

      <section>
        <SectionHeading title="Bookmarks" subtitle={`${bookmarks.data?.length ?? 0} saved`} />
        {(bookmarks.data?.length ?? 0) === 0 ? (
          <Empty title="No bookmarks yet" hint="Use the 🔖 button on any lesson, problem or concept." />
        ) : (
          <ul className="space-y-2">
            {bookmarks.data?.map((row) => (
              <li key={row.contentId}>
                <Link
                  to={routeFor(row.contentType, row.contentId)}
                  className="card flex items-center gap-3 px-4 py-2.5 transition-colors hover:border-brand/60"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{row.title}</span>
                  <span className="shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] text-ink-faint">
                    {row.contentType}
                  </span>
                  {row.missing ? <span className="text-xs text-warn">content moved</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading title="Notes" subtitle={`${notes.data?.length ?? 0} written`} />
        {(notes.data?.length ?? 0) === 0 ? (
          <Empty title="No notes yet" hint="Use 📝 Add note on any lesson to write down what clicked." />
        ) : (
          <div className="space-y-3">
            {notes.data?.map((row) => (
              <Card key={row.contentId}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Link
                    to={routeFor(row.contentType, row.contentId)}
                    className="font-medium text-ink hover:text-brand"
                  >
                    {row.title}
                  </Link>
                  <span className="shrink-0 text-[11px] text-ink-faint">
                    {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : ''}
                  </span>
                </div>
                <Markdown className="text-sm">{row.body}</Markdown>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
