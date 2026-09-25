import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, ErrorBox, Loading } from '../components/ui';
/**
 * The pattern map.
 *
 * Rendered as a column-per-group tree rather than a force-directed graph: the value is being
 * able to see the whole territory at once and spot the gaps in your own coverage, and a layout
 * that reflows on every render makes that harder, not easier.
 */
export default function PatternMapPage() {
    const { isCompleted, progress } = useAppState();
    const { data, loading, error, reload } = useAsync(() => platform.patternMap(), []);
    if (loading)
        return _jsx(Loading, { label: "Loading the pattern map" });
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: reload });
    if (!data)
        return null;
    const groups = data.root.children ?? [];
    const statusOf = (id) => {
        if (isCompleted(id))
            return 'done';
        if (progress?.lessons[id])
            return 'started';
        return 'new';
    };
    const counts = groups.map((group) => ({
        group,
        done: (group.children ?? []).filter((child) => isCompleted(child.id)).length,
        total: (group.children ?? []).length,
    }));
    const totalDone = counts.reduce((sum, entry) => sum + entry.done, 0);
    const totalAll = counts.reduce((sum, entry) => sum + entry.total, 0);
    return (_jsxs("div", { className: "space-y-6 pb-16", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: data.title }), _jsx("p", { className: "mt-1 max-w-prose text-sm text-ink-muted", children: data.description }), _jsxs("p", { className: "mt-2 text-xs text-ink-faint", children: [totalDone, " of ", totalAll, " topics completed"] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-4 text-xs text-ink-muted", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-3 w-3 rounded border border-good bg-good/25" }), " completed"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-3 w-3 rounded border border-brand bg-brand/15" }), " started"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-3 w-3 rounded border border-line bg-surface-raised" }), " not started"] })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: counts.map(({ group, done, total }) => (_jsxs(Card, { className: "flex flex-col", children: [_jsxs("div", { className: "mb-3 flex items-baseline justify-between gap-2", children: [_jsx("h2", { className: "font-semibold text-ink", children: group.label }), _jsxs("span", { className: "text-[11px] tabular-nums text-ink-faint", children: [done, "/", total] })] }), _jsx("ul", { className: "space-y-1.5", children: (group.children ?? []).map((child) => {
                                const status = statusOf(child.id);
                                return (_jsx("li", { children: _jsxs(Link, { to: `/dsa/${child.id}`, className: `flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${status === 'done'
                                            ? 'border-good bg-good/10 text-ink'
                                            : status === 'started'
                                                ? 'border-brand bg-brand/10 text-ink'
                                                : 'border-line text-ink-muted hover:border-brand/60 hover:text-ink'}`, children: [_jsx("span", { className: "min-w-0 flex-1 truncate", children: child.label }), child.kind === 'pattern' ? (_jsx("span", { className: "shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] text-ink-faint", children: "pattern" })) : null, status === 'done' ? _jsx("span", { className: "shrink-0 text-good", children: "\u2713" }) : null] }) }, child.id));
                            }) })] }, group.id))) }), _jsx(Card, { children: _jsxs("p", { className: "text-sm text-ink-muted", children: ["The map is deliberately shallow. Depth comes from the problems under each pattern \u2014 and from being able to look at an unseen problem and land on the right column here within a minute or two.", ' ', _jsx(Link, { to: "/practice", className: "text-brand hover:underline", children: "Practise exactly that \u2192" })] }) })] }));
}
