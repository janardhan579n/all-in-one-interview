import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Empty, ErrorBox, Loading } from '../components/ui';
const ROUTES = {
    lesson: (id) => `/dsa/${id}`,
    problem: (id) => `/problems/${id}`,
    concept: (id) => `/system-design/${id}`,
    'case-study': (id) => `/system-design/case-studies/${id}`,
};
export default function SearchPage() {
    const [params] = useSearchParams();
    const query = params.get('q') ?? '';
    const { data, loading, error, reload } = useAsync(() => platform.search(query, 40), [query]);
    return (_jsxs("div", { className: "mx-auto max-w-3xl space-y-5 pb-16", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: "Search" }), query ? (_jsxs("p", { className: "mt-1 text-sm text-ink-muted", children: [loading ? 'Searching' : `${data?.length ?? 0} result${data?.length === 1 ? '' : 's'}`, " for \u201C", query, "\u201D"] })) : (_jsx("p", { className: "mt-1 text-sm text-ink-muted", children: "Search across lessons, problems, system design concepts and case studies. Every word must match \u2014 so two words narrow rather than widen." }))] }), loading ? _jsx(Loading, {}) : null, error ? _jsx(ErrorBox, { message: error, onRetry: reload }) : null, !loading && query && (data?.length ?? 0) === 0 ? (_jsx(Empty, { title: "Nothing matched", hint: "Try a single keyword \u2014 'window', 'cache', 'shard' \u2014 or browse the pattern map." })) : null, _jsx("ul", { className: "space-y-2", children: (data ?? []).map((hit) => (_jsx("li", { children: _jsxs(Link, { to: (ROUTES[hit.type] ?? ROUTES.lesson)(hit.id), className: "card block px-4 py-3 transition-colors hover:border-brand/60", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "font-medium text-ink", children: hit.title }), _jsx(Badge, { children: hit.type }), hit.group ? _jsx("span", { className: "text-xs text-ink-faint", children: hit.group }) : null] }), hit.snippet ? _jsx("p", { className: "mt-1 line-clamp-2 text-sm text-ink-muted", children: hit.snippet }) : null] }) }, hit.id))) })] }));
}
