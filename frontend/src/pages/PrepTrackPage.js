import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, ErrorBox, Loading, SectionHeading } from '../components/ui';
import { LevelBar } from './PrepTracksPage';
/** One track: its topics in curriculum order, each a question set you can work through. */
export default function PrepTrackPage() {
    const { id = '' } = useParams();
    const { data, loading, error, reload } = useAsync(() => platform.interviewTrack(id), [id]);
    if (loading)
        return _jsx(Loading, { label: "Loading track" });
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: reload });
    if (!data)
        return null;
    return (_jsxs("div", { className: "mx-auto max-w-4xl space-y-6 pb-16", children: [_jsxs("header", { children: [_jsx(Link, { to: "/interview/tracks", className: "text-xs font-medium text-brand hover:underline", children: "\u2190 All tracks" }), _jsxs("h1", { className: "mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight text-ink", children: [_jsx("span", { "aria-hidden": "true", children: data.icon }), data.title] }), _jsx("p", { className: "mt-1 max-w-prose text-sm text-ink-muted", children: data.summary }), _jsx("p", { className: "mt-2 text-xs text-ink-faint", children: data.audience })] }), _jsx(Card, { children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { className: "min-w-[220px] flex-1", children: [_jsxs("p", { className: "mb-2 text-sm font-medium text-ink", children: [data.questionCount, " questions across ", data.topics.length, " topics"] }), _jsx(LevelBar, { levels: data.levels, total: data.questionCount })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Link, { to: `/interview/drill?track=${data.id}`, className: "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90", children: "Drill this track \u2192" }), _jsx(Link, { to: `/interview/drill?track=${data.id}&level=senior`, className: "rounded-lg border border-line px-4 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink", children: "Senior only" })] })] }) }), _jsxs("section", { children: [_jsx(SectionHeading, { title: "Topics", subtitle: "In the order they build on each other." }), _jsx("ol", { className: "space-y-2", children: data.topics.map((topic, index) => (_jsx("li", { children: _jsxs(Link, { to: `/interview/sets/${topic.setId}`, className: "card flex items-start gap-3 px-4 py-3 transition-colors hover:border-brand/60", children: [_jsx("span", { className: "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-[11px] font-semibold text-ink-faint", children: index + 1 }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "font-medium text-ink", children: topic.title }), _jsx("p", { className: "mt-0.5 text-sm text-ink-muted", children: topic.summary }), _jsx("div", { className: "mt-2 max-w-xs", children: _jsx(LevelBar, { levels: topic.levels, total: topic.questions }) })] }), _jsx("span", { className: "shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium tabular-nums text-ink-muted", children: topic.questions })] }) }, topic.setId))) })] })] }));
}
