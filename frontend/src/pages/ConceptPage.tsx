import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Callout, Card, ErrorBox, KeyValueList, Loading, SectionHeading, TranslationNotice } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { Quiz, StudyControls, TradeoffCards, WhyPanel } from '../components/learning';
import { ArchitectureCanvas } from '../components/ArchitectureCanvas';
import { Interactive } from '../components/interactives';
import type { Concept } from '../types';

export default function ConceptPage() {
  const { id = '' } = useParams();
  const { explanationMode, refreshProgress, t, language } = useAppState();
  const { data: concept, loading, error, reload } = useAsync<Concept>(() => platform.concept(id), [id, language]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  useEffect(() => {
    if (!concept) return;
    void platform.updateLessonProgress(concept.id, 'in_progress', 10).then(refreshProgress);
  }, [concept, refreshProgress]);

  if (loading) return <Loading label="Loading concept" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!concept) return null;

  return (
    <article className="mx-auto max-w-4xl space-y-8 pb-16">
      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <Link to="/system-design" className="text-brand hover:underline">
            System Design
          </Link>
          <span className="text-ink-faint">/</span>
          <span className="text-ink-muted">{concept.group}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{concept.title}</h1>
        <p className="mt-2 max-w-prose text-base text-ink-muted">{concept.summary}</p>
        <TranslationNotice translation={concept.translation} message={t('common.notTranslated')} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="pattern">{concept.group}</Badge>
          <Badge>Level {concept.level}</Badge>
          {concept.estimatedMinutes ? <Badge>{concept.estimatedMinutes} min</Badge> : null}
        </div>
      </header>

      <StudyControls contentId={concept.id} contentType="concept" />

      {concept.analogy ? (
        <section>
          <SectionHeading title="The analogy" />
          <Callout tone="info">{concept.analogy}</Callout>
        </section>
      ) : null}

      <section>
        <SectionHeading
          title="What it is"
          subtitle={explanationMode === 'beginner' ? 'Beginner mode — same idea, plainer words' : 'Interview mode'}
        />
        <Markdown>{concept.explanation[explanationMode]}</Markdown>
      </section>

      {concept.diagram ? (
        <section>
          <SectionHeading title="How it fits together" subtitle="Click a component to see why it is there." />
          <ArchitectureCanvas architecture={concept.diagram} title={concept.title} />
        </section>
      ) : null}

      {concept.why ? <WhyPanel why={concept.why} /> : null}

      {concept.interactive ? (
        <section>
          <SectionHeading title="Try it" />
          <Interactive id={concept.interactive} />
        </section>
      ) : null}

      {(concept.whenToUse?.length || concept.whenNotToUse?.length) ? (
        <section>
          <SectionHeading
            title="When to reach for it — and when not to"
            subtitle="The second list is the one that separates engineers from cargo cults."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {concept.whenToUse?.length ? (
              <Card>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-good">Use it when</p>
                <ul className="space-y-1.5 text-sm text-ink-muted">
                  {concept.whenToUse.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-good">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
            {concept.whenNotToUse?.length ? (
              <Card>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-bad">Do not use it when</p>
                <ul className="space-y-1.5 text-sm text-ink-muted">
                  {concept.whenNotToUse.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-bad">✕</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}

      {concept.tradeoffs?.length ? (
        <section>
          <SectionHeading
            title="Trade-offs"
            subtitle="Never 'X is better'. Always: here is what each option costs you."
          />
          <TradeoffCards tradeoffs={concept.tradeoffs} />
        </section>
      ) : null}

      {concept.keyNumbers?.length ? (
        <section>
          <SectionHeading title="Numbers worth remembering" subtitle="Rough magnitudes, not precise benchmarks." />
          <KeyValueList items={concept.keyNumbers} />
        </section>
      ) : null}

      {concept.consistencyModels?.length ? (
        <section>
          <SectionHeading title="Consistency models, strongest first" />
          <div className="space-y-2">
            {concept.consistencyModels.map((model) => (
              <Card key={model.name}>
                <p className="text-sm font-medium text-ink">{model.name}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{model.meaning}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {concept.designRules?.length ? (
        <section>
          <SectionHeading title="Rules of thumb" />
          <ul className="space-y-1.5">
            {concept.designRules.map((rule) => (
              <li key={rule} className="card px-4 py-2.5 text-sm">
                <Markdown>{rule}</Markdown>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Quiz contentId={concept.id} />

      {concept.related?.length ? (
        <section>
          <SectionHeading title="Related" />
          <div className="flex flex-wrap gap-2">
            {concept.related.map((relatedId) => (
              <Link key={relatedId} to={`/system-design/${relatedId}`} className="text-sm text-brand hover:underline">
                {relatedId.replace(/-/g, ' ')}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
