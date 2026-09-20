import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, ErrorBox, Loading, ProgressBar, SectionHeading } from '../components/ui';

export default function ProgressPage() {
  const { progress, refreshProgress, connection } = useAppState();
  const summary = useAsync(() => platform.progressSummary(), [progress]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);

  const download = async () => {
    try {
      const blob = await platform.exportProgress();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'progress.json';
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage({ tone: 'good', text: 'Exported progress.json — keep it somewhere safe.' });
    } catch (error) {
      setMessage({ tone: 'bad', text: error instanceof Error ? error.message : String(error) });
    }
  };

  const upload = async (file: File) => {
    try {
      await platform.importProgress(await file.text());
      await refreshProgress();
      summary.reload();
      setMessage({ tone: 'good', text: 'Progress restored. Note that an import replaces what was here before.' });
    } catch (error) {
      setMessage({ tone: 'bad', text: error instanceof Error ? error.message : String(error) });
    }
  };

  if (summary.loading && !summary.data) return <Loading label="Loading your progress" />;
  if (summary.error) return <ErrorBox message={summary.error} onRetry={summary.reload} />;
  if (!summary.data) return null;

  const data = summary.data;

  return (
    <div className="space-y-8 pb-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Your progress</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Stored {connection === 'online' ? 'in SQLite by the backend' : 'in this browser'} — and exportable either
          way, so it is yours to move.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Streak</p>
          <p className="text-2xl font-semibold tabular-nums text-ink">{data.streak}</p>
          <p className="text-xs text-ink-muted">consecutive days</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Active days</p>
          <p className="text-2xl font-semibold tabular-nums text-ink">{data.activeDays}</p>
          <p className="text-xs text-ink-muted">total</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Problems solved</p>
          <p className="text-2xl font-semibold tabular-nums text-ink">
            {data.problemsSolved}
            <span className="text-sm text-ink-faint"> / {data.problemsTotal}</span>
          </p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Readiness</p>
          <p className="text-2xl font-semibold tabular-nums text-ink">{data.readiness.score}</p>
          <p className="text-xs text-ink-muted">{data.readiness.band}</p>
        </Card>
      </section>

      <section>
        <SectionHeading title="Coverage" />
        <Card className="space-y-4">
          <ProgressBar label={`DSA lessons (${data.dsa.completed}/${data.dsa.total})`} percent={data.dsa.percent} />
          <ProgressBar
            label={`System design (${data.systemDesign.completed}/${data.systemDesign.total})`}
            percent={data.systemDesign.percent}
            tone="good"
          />
          <ProgressBar
            label={`Patterns mastered (${data.patterns.completed}/${data.patterns.total})`}
            percent={data.patterns.percent}
            tone="warn"
          />
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Weak areas"
          subtitle="Derived from your own confidence ratings and solve rates, so it is only as useful as your honesty."
        />
        {data.weakAreas.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-muted">
              Nothing flagged yet. Weak areas appear once you have attempted a pattern at least twice — record attempts
              on a problem page using "I solved it" / "not yet".
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.weakAreas.map((area) => (
              <Card key={area.patternId}>
                <Link to={`/dsa/${area.patternId}`} className="font-medium text-ink hover:text-brand">
                  {area.title}
                </Link>
                <p className="mt-1 text-xs text-ink-muted">
                  {area.solved}/{area.attempts} solved
                </p>
                <div className="mt-2">
                  <ProgressBar percent={area.solveRate} tone="warn" />
                </div>
                <Link
                  to={`/problems?pattern=${area.patternId}`}
                  className="mt-3 inline-block text-xs font-medium text-brand hover:underline"
                >
                  Drill this pattern →
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {progress && progress.quizzes.length > 0 ? (
        <section>
          <SectionHeading title="Quiz results" />
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-sunken text-xs uppercase tracking-wider text-ink-faint">
                <tr>
                  <th className="px-4 py-2 font-medium">Topic</th>
                  <th className="px-4 py-2 font-medium">Best score</th>
                  <th className="px-4 py-2 font-medium">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {progress.quizzes.map((quiz) => (
                  <tr key={quiz.contentId} className="border-t border-line">
                    <td className="px-4 py-2 text-ink">{quiz.contentId.replace(/-/g, ' ')}</td>
                    <td className="px-4 py-2 tabular-nums text-ink-muted">
                      {quiz.bestScore} / {quiz.total}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-ink-muted">{quiz.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeading
          title="Back up or move your progress"
          subtitle="Local-first means the data is a file you own. Export it, and it moves between machines — or between offline and backend mode."
        />
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void download()}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white"
            >
              ⬇ Export progress.json
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-sunken"
            >
              ⬆ Import progress.json
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = '';
              }}
            />
          </div>

          {message ? (
            <p className={`mt-3 text-sm ${message.tone === 'good' ? 'text-good' : 'text-bad'}`}>{message.text}</p>
          ) : null}

          <p className="mt-3 text-xs text-ink-faint">
            Importing <strong>replaces</strong> your current progress rather than merging — that is what people expect
            from restoring a backup, and merging two histories would need conflict rules nobody wants.
          </p>
        </Card>
      </section>
    </div>
  );
}
