import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, Empty, ErrorBox, Loading, SectionHeading } from '../components/ui';
import { Markdown } from '../components/Markdown';
const ROUTES = {
    lesson: (id) => `/dsa/${id}`,
    problem: (id) => `/problems/${id}`,
    concept: (id) => `/system-design/${id}`,
    'case-study': (id) => `/system-design/case-studies/${id}`,
};
function routeFor(type, id) {
    return (ROUTES[type] ?? ROUTES.lesson)(id);
}
export default function BookmarksPage() {
    const bookmarks = useAsync(() => platform.bookmarks(), []);
    const notes = useAsync(() => platform.notes(), []);
    if (bookmarks.loading || notes.loading)
        return _jsx(Loading, { label: "Loading your saved items" });
    if (bookmarks.error)
        return _jsx(ErrorBox, { message: bookmarks.error, onRetry: bookmarks.reload });
    if (notes.error)
        return _jsx(ErrorBox, { message: notes.error, onRetry: notes.reload });
    return (_jsxs("div", { className: "mx-auto max-w-3xl space-y-8 pb-16", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: "Bookmarks & notes" }), _jsx("p", { className: "mt-1 text-sm text-ink-muted", children: "Your own words are the part that sticks. Notes are included in the progress export." })] }), _jsxs("section", { children: [_jsx(SectionHeading, { title: "Bookmarks", subtitle: `${bookmarks.data?.length ?? 0} saved` }), (bookmarks.data?.length ?? 0) === 0 ? (_jsx(Empty, { title: "No bookmarks yet", hint: "Use the \uD83D\uDD16 button on any lesson, problem or concept." })) : (_jsx("ul", { className: "space-y-2", children: bookmarks.data?.map((row) => (_jsx("li", { children: _jsxs(Link, { to: routeFor(row.contentType, row.contentId), className: "card flex items-center gap-3 px-4 py-2.5 transition-colors hover:border-brand/60", children: [_jsx("span", { className: "min-w-0 flex-1 truncate text-sm text-ink", children: row.title }), _jsx("span", { className: "shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] text-ink-faint", children: row.contentType }), row.missing ? _jsx("span", { className: "text-xs text-warn", children: "content moved" }) : null] }) }, row.contentId))) }))] }), _jsxs("section", { children: [_jsx(SectionHeading, { title: "Notes", subtitle: `${notes.data?.length ?? 0} written` }), (notes.data?.length ?? 0) === 0 ? (_jsx(Empty, { title: "No notes yet", hint: "Use \uD83D\uDCDD Add note on any lesson to write down what clicked." })) : (_jsx("div", { className: "space-y-3", children: notes.data?.map((row) => (_jsxs(Card, { children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-3", children: [_jsx(Link, { to: routeFor(row.contentType, row.contentId), className: "font-medium text-ink hover:text-brand", children: row.title }), _jsx("span", { className: "shrink-0 text-[11px] text-ink-faint", children: row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '' })] }), _jsx(Markdown, { className: "text-sm", children: row.body })] }, row.contentId))) }))] })] }));
}
