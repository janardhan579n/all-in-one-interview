import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
/** Small shared primitives. Deliberately plain — the interesting UI is in the visualisers. */
export function Card({ children, className = '' }) {
    return _jsx("div", { className: `card p-5 ${className}`, children: children });
}
export function SectionHeading({ title, subtitle, id, action, }) {
    return (_jsxs("div", { className: "mb-4 flex items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { id: id, className: "text-lg font-semibold tracking-tight text-ink", children: title }), subtitle ? _jsx("p", { className: "mt-0.5 text-sm text-ink-muted", children: subtitle }) : null] }), action] }));
}
export function ProgressBar({ percent, label, tone = 'brand', }) {
    const toneClass = tone === 'good' ? 'bg-good' : tone === 'warn' ? 'bg-warn' : 'bg-brand';
    return (_jsxs("div", { children: [label ? (_jsxs("div", { className: "mb-1 flex items-baseline justify-between text-xs", children: [_jsx("span", { className: "text-ink-muted", children: label }), _jsxs("span", { className: "font-medium tabular-nums text-ink", children: [percent, "%"] })] })) : null, _jsx("div", { className: "h-2 overflow-hidden rounded-full bg-surface-sunken", role: "progressbar", "aria-valuenow": percent, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": label ?? 'progress', children: _jsx("div", { className: `h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${toneClass}`, style: { width: `${Math.max(0, Math.min(100, percent))}%` } }) })] }));
}
const BADGE_TONES = {
    beginner: 'bg-good/15 text-good',
    intermediate: 'bg-warn/15 text-warn',
    advanced: 'bg-bad/15 text-bad',
    pattern: 'bg-brand/15 text-brand',
    foundation: 'bg-info/15 text-info',
    'data-structure': 'bg-info/15 text-info',
    neutral: 'bg-surface-sunken text-ink-muted',
};
export function Badge({ children, tone = 'neutral' }) {
    return (_jsx("span", { className: `inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE_TONES[tone] ?? BADGE_TONES.neutral}`, children: children }));
}
export function Loading({ label = 'Loading' }) {
    return (_jsxs("div", { className: "flex items-center gap-3 py-10 text-sm text-ink-muted", role: "status", children: [_jsx("span", { className: "h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand motion-reduce:animate-none" }), label, "\u2026"] }));
}
export function ErrorBox({ message, onRetry }) {
    return (_jsxs("div", { className: "rounded-xl border border-bad/40 bg-bad/5 p-4 text-sm", children: [_jsx("p", { className: "font-medium text-ink", children: "Something went wrong" }), _jsx("p", { className: "mt-1 text-ink-muted", children: message }), onRetry ? (_jsx("button", { type: "button", onClick: onRetry, className: "mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken", children: "Try again" })) : null] }));
}
export function Empty({ title, hint }) {
    return (_jsxs("div", { className: "rounded-xl border border-dashed border-line p-8 text-center", children: [_jsx("p", { className: "text-sm font-medium text-ink", children: title }), hint ? _jsx("p", { className: "mt-1 text-sm text-ink-muted", children: hint }) : null] }));
}
export function ContentCard({ to, title, summary, badges, meta, completed, }) {
    return (_jsxs(Link, { to: to, className: "group card block p-4 transition-colors hover:border-brand/60 focus-visible:border-brand", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("h3", { className: "font-medium leading-snug text-ink group-hover:text-brand", children: title }), completed ? (_jsx("span", { className: "shrink-0 text-good", "aria-label": "completed", title: "Completed", children: "\u2713" })) : null] }), summary ? _jsx("p", { className: "mt-1.5 line-clamp-3 text-sm text-ink-muted", children: summary }) : null, _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-1.5", children: [badges?.map((badge) => (_jsx(Badge, { tone: badge.tone, children: badge.label }, badge.label))), meta ? _jsx("span", { className: "ml-auto text-[11px] text-ink-faint", children: meta }) : null] })] }));
}
/** A Java listing with line numbers. No syntax-highlighting dependency — see ADR-005's spirit. */
export function CodeBlock({ code, title }) {
    return (_jsxs("div", { className: "overflow-hidden rounded-lg border border-line bg-surface-sunken", children: [title ? (_jsxs("div", { className: "flex items-center justify-between border-b border-line px-3 py-1.5", children: [_jsx("span", { className: "text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: title }), _jsx("span", { className: "text-[11px] text-ink-faint", children: "Java" })] })) : null, _jsx("pre", { className: "overflow-x-auto py-2 text-xs leading-relaxed", children: _jsx("code", { children: code.map((line, index) => (_jsxs("div", { className: "flex px-3", children: [_jsx("span", { className: "w-7 shrink-0 select-none text-right tabular-nums text-ink-faint", children: index + 1 }), _jsx("span", { className: "whitespace-pre pl-3 font-mono text-ink-muted", children: line || ' ' })] }, index))) }) })] }));
}
export function KeyValueList({ items }) {
    return (_jsx("dl", { className: "grid gap-2 sm:grid-cols-2", children: items.map((item) => (_jsxs("div", { className: "rounded-lg border border-line bg-surface-sunken px-3 py-2", children: [_jsx("dt", { className: "text-[11px] uppercase tracking-wider text-ink-faint", children: item.label }), _jsx("dd", { className: "text-sm font-medium text-ink", children: item.value })] }, item.label))) }));
}
export function Callout({ tone = 'info', title, children, }) {
    const tones = {
        info: 'border-info/40 bg-info/5',
        good: 'border-good/40 bg-good/5',
        warn: 'border-warn/40 bg-warn/5',
        bad: 'border-bad/40 bg-bad/5',
    };
    return (_jsxs("div", { className: `rounded-xl border p-4 ${tones[tone]}`, children: [title ? _jsx("p", { className: "mb-1 text-sm font-semibold text-ink", children: title }) : null, _jsx("div", { className: "prose-content text-sm", children: children })] }));
}
/**
 * Says plainly which language the page is actually in.
 *
 * Shown only when a translation was requested and not found. Silently serving English under a
 * Telugu button would be the worst of the three options — worse than showing English with a
 * note, and worse than showing nothing at all.
 */
export function TranslationNotice({ translation, message, }) {
    if (!translation || translation.translated || translation.language === 'en')
        return null;
    return (_jsxs("p", { className: "mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-sunken px-2.5 py-1 text-xs text-ink-muted", children: [_jsx("span", { "aria-hidden": "true", children: "\uD83C\uDF10" }), message] }));
}
