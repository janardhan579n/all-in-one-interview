import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Small shared primitives. Deliberately plain — the interesting UI is in the visualisers. */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function SectionHeading({
  title,
  subtitle,
  id,
  action,
}: {
  title: string;
  subtitle?: string;
  id?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({
  percent,
  label,
  tone = 'brand',
}: {
  percent: number;
  label?: string;
  tone?: 'brand' | 'good' | 'warn';
}) {
  const toneClass = tone === 'good' ? 'bg-good' : tone === 'warn' ? 'bg-warn' : 'bg-brand';
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-ink-muted">{label}</span>
          <span className="font-medium tabular-nums text-ink">{percent}%</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'progress'}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${toneClass}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  beginner: 'bg-good/15 text-good',
  intermediate: 'bg-warn/15 text-warn',
  advanced: 'bg-bad/15 text-bad',
  pattern: 'bg-brand/15 text-brand',
  foundation: 'bg-info/15 text-info',
  'data-structure': 'bg-info/15 text-info',
  neutral: 'bg-surface-sunken text-ink-muted',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        BADGE_TONES[tone] ?? BADGE_TONES.neutral
      }`}
    >
      {children}
    </span>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-ink-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand motion-reduce:animate-none" />
      {label}…
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-bad/40 bg-bad/5 p-4 text-sm">
      <p className="font-medium text-ink">Something went wrong</p>
      <p className="mt-1 text-ink-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint ? <p className="mt-1 text-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function ContentCard({
  to,
  title,
  summary,
  badges,
  meta,
  completed,
}: {
  to: string;
  title: string;
  summary?: string;
  badges?: { label: string; tone?: string }[];
  meta?: string;
  completed?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group card block p-4 transition-colors hover:border-brand/60 focus-visible:border-brand"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug text-ink group-hover:text-brand">{title}</h3>
        {completed ? (
          <span className="shrink-0 text-good" aria-label="completed" title="Completed">
            ✓
          </span>
        ) : null}
      </div>
      {summary ? <p className="mt-1.5 line-clamp-3 text-sm text-ink-muted">{summary}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {badges?.map((badge) => (
          <Badge key={badge.label} tone={badge.tone}>
            {badge.label}
          </Badge>
        ))}
        {meta ? <span className="ml-auto text-[11px] text-ink-faint">{meta}</span> : null}
      </div>
    </Link>
  );
}

/** A Java listing with line numbers. No syntax-highlighting dependency — see ADR-005's spirit. */
export function CodeBlock({ code, title }: { code: string[]; title?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-sunken">
      {title ? (
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{title}</span>
          <span className="text-[11px] text-ink-faint">Java</span>
        </div>
      ) : null}
      <pre className="overflow-x-auto py-2 text-xs leading-relaxed">
        <code>
          {code.map((line, index) => (
            <div key={index} className="flex px-3">
              <span className="w-7 shrink-0 select-none text-right tabular-nums text-ink-faint">{index + 1}</span>
              <span className="whitespace-pre pl-3 font-mono text-ink-muted">{line || ' '}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

export function KeyValueList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-line bg-surface-sunken px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wider text-ink-faint">{item.label}</dt>
          <dd className="text-sm font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'good' | 'warn' | 'bad';
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: 'border-info/40 bg-info/5',
    good: 'border-good/40 bg-good/5',
    warn: 'border-warn/40 bg-warn/5',
    bad: 'border-bad/40 bg-bad/5',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      {title ? <p className="mb-1 text-sm font-semibold text-ink">{title}</p> : null}
      <div className="prose-content text-sm">{children}</div>
    </div>
  );
}

/**
 * Says plainly which language the page is actually in.
 *
 * Shown only when a translation was requested and not found. Silently serving English under a
 * Telugu button would be the worst of the three options — worse than showing English with a
 * note, and worse than showing nothing at all.
 */
export function TranslationNotice({
  translation,
  message,
}: {
  translation?: { language: string; translated: boolean };
  message: string;
}) {
  if (!translation || translation.translated || translation.language === 'en') return null;

  return (
    <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-sunken px-2.5 py-1 text-xs text-ink-muted">
      <span aria-hidden="true">🌐</span>
      {message}
    </p>
  );
}
