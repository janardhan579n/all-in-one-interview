import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, ErrorBox, Loading, SectionHeading } from '../components/ui';
const LEVEL_LABEL = {
    junior: 'Junior',
    mid: 'Mid',
    senior: 'Senior',
};
/** A three-segment bar showing how a track's questions are spread across levels. */
export function LevelBar({ levels, total }) {
    if (total === 0)
        return null;
    const segments = [
        { level: 'junior', tone: 'bg-good' },
        { level: 'mid', tone: 'bg-brand' },
        { level: 'senior', tone: 'bg-warn' },
    ];
    return (_jsxs("div", { children: [_jsx("div", { className: "flex h-1.5 overflow-hidden rounded-full bg-surface-sunken", children: segments.map(({ level, tone }) => {
                    const count = levels[level] ?? 0;
                    if (count === 0)
                        return null;
                    return (_jsx("div", { className: tone, style: { width: `${(100 * count) / total}%` }, title: `${count} ${LEVEL_LABEL[level]}` }, level));
                }) }), _jsx("p", { className: "mt-1.5 text-[11px] text-ink-faint", children: segments
                    .map(({ level }) => `${levels[level] ?? 0} ${LEVEL_LABEL[level].toLowerCase()}`)
                    .join(' · ') })] }));
}
export default function PrepTracksPage() {
    const { data, loading, error, reload } = useAsync(() => platform.interviewTracks(), []);
    if (loading)
        return _jsx(Loading, { label: "Loading interview tracks" });
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: reload });
    if (!data)
        return null;
    const total = data.reduce((sum, track) => sum + track.questionCount, 0);
    return (_jsxs("div", { className: "space-y-8 pb-16", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: "Interview preparation" }), _jsxs("p", { className: "mt-1 max-w-prose text-sm text-ink-muted", children: [total, " questions across ", data.length, " tracks, from first job to tech lead. Every answer says what the interviewer is listening for, what follow-up is coming, and which answers lose marks \u2014 because knowing the right answer and knowing what a strong answer ", _jsx("em", { children: "sounds" }), " like are different skills."] })] }), _jsxs("section", { children: [_jsx(SectionHeading, { title: "Tracks", subtitle: "Pick the stack you are interviewing for. Scenarios apply to every stack.", action: _jsx(Link, { to: "/interview/drill", className: "text-xs font-medium text-brand hover:underline", children: "Mixed drill \u2192" }) }), _jsx("div", { className: "grid gap-3 md:grid-cols-2", children: data.map((track) => (_jsx(TrackCard, { track: track }, track.id))) })] }), _jsxs("section", { children: [_jsx(SectionHeading, { title: "How to use this" }), _jsx(Card, { children: _jsxs("ul", { className: "space-y-2.5 text-sm text-ink-muted", children: [_jsxs("li", { children: [_jsx("strong", { className: "text-ink", children: "Answer out loud before you reveal." }), " Reading a model answer feels productive and teaches very little. The gap between what you said and what the answer covers is the only information here worth having."] }), _jsxs("li", { children: [_jsx("strong", { className: "text-ink", children: "Read the follow-ups." }), " Real interviews are a conversation. The follow-up is usually where a candidate is actually assessed, because it cannot be memorised."] }), _jsxs("li", { children: [_jsx("strong", { className: "text-ink", children: "Mark yourself honestly." }), " Flag the ones you fumbled as \"review\" and they come back in your weak areas. A track marked all-green that you cannot explain is worth nothing on the day."] }), _jsxs("li", { children: [_jsx("strong", { className: "text-ink", children: "Scenarios are the senior filter." }), " Mid-level rounds ask what something is; senior rounds hand you a broken system and watch how you think."] })] }) })] })] }));
}
function TrackCard({ track }) {
    return (_jsxs(Link, { to: `/interview/tracks/${track.id}`, className: "card flex flex-col gap-3 p-4 transition-colors hover:border-brand/60", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "text-2xl leading-none", "aria-hidden": "true", children: track.icon }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h3", { className: "font-semibold text-ink", children: track.title }), _jsx("p", { className: "mt-0.5 text-sm text-ink-muted", children: track.summary })] }), _jsx("span", { className: "shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium tabular-nums text-ink-muted", children: track.questionCount })] }), _jsx(LevelBar, { levels: track.levels, total: track.questionCount }), _jsx("p", { className: "text-xs italic text-ink-faint", children: track.audience })] }));
}
