import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Callout, Card, ErrorBox, Loading, SectionHeading, TranslationNotice } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { Quiz, StudyControls, TradeoffCards } from '../components/learning';
import { ArchitectureCanvas } from '../components/ArchitectureCanvas';
import { Interactive } from '../components/interactives';
import type { CaseStudy } from '../types';

type Tab = 'walkthrough' | 'evolution' | 'estimation' | 'api' | 'data' | 'tradeoffs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'walkthrough', label: 'Walkthrough' },
  { id: 'evolution', label: 'Architecture evolution' },
  { id: 'estimation', label: 'Estimation' },
  { id: 'api', label: 'API' },
  { id: 'data', label: 'Data model' },
  { id: 'tradeoffs', label: 'Trade-offs' },
];

export default function CaseStudyPage() {
  const { id = '' } = useParams();
  const { refreshProgress, t, language } = useAppState();
  const { data: study, loading, error, reload } = useAsync<CaseStudy>(() => platform.caseStudy(id), [id, language]);

  const [tab, setTab] = useState<Tab>('walkthrough');
  const [stage, setStage] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setTab('walkthrough');
    setStage(0);
    setStep(0);
    window.scrollTo({ top: 0 });
  }, [id]);

  useEffect(() => {
    if (!study) return;
    void platform.updateLessonProgress(study.id, 'in_progress', 10).then(refreshProgress);
  }, [study, refreshProgress]);

  /** Nodes that appear in this stage but not the previous one — the "what changed" diff. */
  const newNodeIds = useMemo(() => {
    if (!study?.evolution || stage === 0) return [];
    const previous = new Set((study.evolution[stage - 1]?.architecture.nodes ?? []).map((node) => node.id));
    return (study.evolution[stage]?.architecture.nodes ?? [])
      .filter((node) => !previous.has(node.id))
      .map((node) => node.id);
  }, [study, stage]);

  if (loading) return <Loading label="Loading case study" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!study) return null;

  const currentStage = study.evolution?.[stage];

  return (
    <article className="mx-auto max-w-5xl space-y-6 pb-16">
      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <Link to="/system-design/case-studies" className="text-brand hover:underline">
            Case Studies
          </Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{study.title}</h1>
        <p className="mt-2 max-w-prose text-base text-ink-muted">{study.summary}</p>
        <TranslationNotice translation={study.translation} message={t('common.notTranslated')} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={study.difficulty}>{study.difficulty}</Badge>
          {study.estimatedMinutes ? <Badge>{study.estimatedMinutes} min</Badge> : null}
          <Link to={`/interview/${study.id}`} className="text-xs font-medium text-brand hover:underline">
            Practise this as an interview →
          </Link>
        </div>
      </header>

      <StudyControls contentId={study.id} contentType="case-study" />

      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === item.id
                ? 'border-brand font-medium text-brand'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'walkthrough' ? (
        <section>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {study.steps.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                  step === index ? 'bg-brand text-white' : 'border border-line text-ink-muted hover:bg-surface-sunken'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <Card>
            <h2 className="mb-2 text-lg font-semibold text-ink">{study.steps[step]?.title}</h2>
            <Markdown>{study.steps[step]?.content}</Markdown>

            <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
              <button
                type="button"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                disabled={step === 0}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-xs text-ink-faint">
                {step + 1} of {study.steps.length}
              </span>
              <button
                type="button"
                onClick={() => setStep((value) => Math.min(study.steps.length - 1, value + 1))}
                disabled={step >= study.steps.length - 1}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </Card>

          {study.interactive ? (
            <div className="mt-6">
              <SectionHeading title="Try the mechanism" />
              <Interactive id={study.interactive} />
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'evolution' && study.evolution ? (
        <section>
          <SectionHeading
            title="Watch the architecture grow"
            subtitle="Each stage adds exactly one thing, in response to one problem. Nothing appears because it is fashionable."
          />

          <ol className="mb-5 flex flex-wrap gap-2">
            {study.evolution.map((item, index) => (
              <li key={item.stage}>
                <button
                  type="button"
                  onClick={() => setStage(index)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    stage === index
                      ? 'border-brand bg-brand/10 font-medium text-brand'
                      : 'border-line text-ink-muted hover:bg-surface-sunken'
                  }`}
                >
                  {item.stage}
                </button>
              </li>
            ))}
          </ol>

          {currentStage ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Callout tone="bad" title="The problem">
                  {currentStage.problem}
                </Callout>
                <Callout tone="info" title="What we add">
                  {currentStage.change}
                </Callout>
                <Callout tone="good" title="Why that fixes it">
                  {currentStage.why}
                </Callout>
              </div>

              <ArchitectureCanvas
                architecture={currentStage.architecture}
                highlightNodes={newNodeIds}
                title={currentStage.stage}
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStage((value) => Math.max(0, value - 1))}
                  disabled={stage === 0}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40"
                >
                  ← Earlier stage
                </button>
                <span className="text-xs text-ink-faint">
                  Stage {stage + 1} of {study.evolution.length}
                  {newNodeIds.length > 0 ? ` · ${newNodeIds.length} new component(s)` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setStage((value) => Math.min((study.evolution?.length ?? 1) - 1, value + 1))}
                  disabled={stage >= (study.evolution?.length ?? 1) - 1}
                  className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                >
                  Next stage →
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'estimation' && study.estimation ? (
        <section>
          <SectionHeading
            title="Back-of-the-envelope"
            subtitle="Do this early — it decides whether you need one machine or a hundred."
          />
          <Card className="mb-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">Assumptions</p>
            <ul className="space-y-1 text-sm text-ink-muted">
              {study.estimation.assumptions.map((assumption) => (
                <li key={assumption}>• {assumption}</li>
              ))}
            </ul>
          </Card>

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-sunken text-xs uppercase tracking-wider text-ink-faint">
                <tr>
                  <th className="px-4 py-2 font-medium">Quantity</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                  <th className="px-4 py-2 font-medium">Working</th>
                </tr>
              </thead>
              <tbody>
                {study.estimation.calculations.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <td className="px-4 py-2 text-ink">{row.label}</td>
                    <td className="px-4 py-2 font-semibold tabular-nums text-ink">{row.value}</td>
                    <td className="px-4 py-2 font-mono text-xs text-ink-muted">{row.working}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'api' && study.api ? (
        <section>
          <SectionHeading title="API design" />
          <div className="space-y-3">
            {study.api.map((endpoint) => (
              <Card key={`${endpoint.method}-${endpoint.path}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-brand/15 px-2 py-0.5 font-mono text-xs font-semibold text-brand">
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-sm text-ink">{endpoint.path}</code>
                </div>
                {endpoint.request && endpoint.request !== '—' ? (
                  <p className="mt-2 break-all font-mono text-xs text-ink-muted">→ {endpoint.request}</p>
                ) : null}
                {endpoint.response ? (
                  <p className="mt-1 break-all font-mono text-xs text-ink-muted">← {endpoint.response}</p>
                ) : null}
                {endpoint.notes ? <p className="mt-2 text-sm text-ink-muted">{endpoint.notes}</p> : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'data' && study.dataModel ? (
        <section>
          <SectionHeading title="Data model" subtitle="Including the indexes, because that is where the performance is." />
          <div className="space-y-4">
            {study.dataModel.map((table) => (
              <Card key={table.name}>
                <h3 className="mb-3 font-mono text-sm font-semibold text-ink">{table.name}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-ink-faint">
                      <tr>
                        <th className="py-1 font-medium">column</th>
                        <th className="py-1 font-medium">type</th>
                        <th className="py-1 font-medium">notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.fields.map((field) => (
                        <tr key={field.name} className="border-t border-line">
                          <td className="py-1.5 font-mono text-ink">{field.name}</td>
                          <td className="py-1.5 font-mono text-ink-muted">{field.type}</td>
                          <td className="py-1.5 text-ink-muted">{field.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {table.indexes?.length ? (
                  <div className="mt-3 border-t border-line pt-2">
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-ink-faint">Indexes</p>
                    <ul className="space-y-0.5 font-mono text-xs text-ink-muted">
                      {table.indexes.map((index) => (
                        <li key={index}>{index}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'tradeoffs' && study.tradeoffs ? (
        <section>
          <SectionHeading title="Trade-offs to state out loud" />
          <TradeoffCards tradeoffs={study.tradeoffs} />
        </section>
      ) : null}

      <Quiz contentId={study.id} />
    </article>
  );
}
