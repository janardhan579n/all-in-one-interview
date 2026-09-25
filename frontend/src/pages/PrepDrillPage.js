import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, Empty, ErrorBox, Loading, SectionHeading } from '../components/ui';
import { QuestionCard } from '../components/interview';
const LEVELS = ['all', 'junior', 'mid', 'senior'];
const COUNTS = [5, 10, 20];
/**
 * A mock round: a randomised set you work through one at a time.
 *
 * One question on screen at a time, deliberately. A scrollable list invites skimming, and the
 * skill being practised is producing an answer under a blank page — which a list of twenty
 * visible questions quietly removes.
 */
export default function PrepDrillPage() {
    const [params, setParams] = useSearchParams();
    const track = params.get('track') ?? undefined;
    const level = params.get('level') ?? undefined;
    const count = Number(params.get('count') ?? 10);
    const [seed, setSeed] = useState(() => Math.floor(Date.now() / 86_400_000));
    const [position, setPosition] = useState(0);
    const tracks = useAsync(() => platform.interviewTracks(), []);
    const drill = useAsync(() => platform.interviewDrill({ track, level, count, seed }), [track, level, count, seed]);
    const questions = useMemo(() => drill.data ?? [], [drill.data]);
    const current = questions[Math.min(position, Math.max(0, questions.length - 1))];
    const update = (key, value) => {
        const next = new URLSearchParams(params);
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        setParams(next, { replace: true });
        setPosition(0);
    };
    const reshuffle = () => {
        setSeed(Math.floor(Math.random() * 1_000_000));
        setPosition(0);
    };
    if (tracks.error)
        return _jsx(ErrorBox, { message: tracks.error, onRetry: tracks.reload });
    return (_jsxs("div", { className: "mx-auto max-w-4xl space-y-6 pb-16", children: [_jsxs("header", { children: [_jsx(Link, { to: "/interview/tracks", className: "text-xs font-medium text-brand hover:underline", children: "\u2190 Interview preparation" }), _jsx("h1", { className: "mt-2 text-2xl font-semibold tracking-tight text-ink", children: "Mock round" }), _jsx("p", { className: "mt-1 max-w-prose text-sm text-ink-muted", children: "One question at a time, in random order. Say your answer out loud before revealing \u2014 the set is stable if you reload, so you can leave one and come back to it." })] }), _jsx(Card, { children: _jsxs("div", { className: "flex flex-wrap items-end gap-x-6 gap-y-3", children: [_jsxs(Filter, { label: "Track", children: [_jsx(Chip, { active: !track, onClick: () => update('track'), children: "All" }), (tracks.data ?? []).map((row) => (_jsxs(Chip, { active: track === row.id, onClick: () => update('track', row.id), children: [row.icon, " ", row.shortTitle] }, row.id)))] }), _jsx(Filter, { label: "Level", children: LEVELS.map((option) => (_jsx(Chip, { active: option === 'all' ? !level : level === option, onClick: () => update('level', option === 'all' ? undefined : option), children: _jsx("span", { className: "capitalize", children: option }) }, option))) }), _jsx(Filter, { label: "Questions", children: COUNTS.map((option) => (_jsx(Chip, { active: count === option, onClick: () => update('count', String(option)), children: option }, option))) }), _jsx("button", { type: "button", onClick: reshuffle, className: "ml-auto rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink", children: "\u27F2 Reshuffle" })] }) }), drill.loading ? _jsx(Loading, { label: "Building your set" }) : null, drill.error ? _jsx(ErrorBox, { message: drill.error, onRetry: drill.reload }) : null, !drill.loading && questions.length === 0 ? (_jsx(Empty, { title: "No questions match", hint: "Widen the track or level filter." })) : null, current ? (_jsxs(_Fragment, { children: [_jsx(SectionHeading, { title: `Question ${position + 1} of ${questions.length}`, subtitle: `${current.trackId} · ${current.topic}` }), _jsx(QuestionCard, { question: current }, current.id), _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("button", { type: "button", onClick: () => setPosition((p) => Math.max(0, p - 1)), disabled: position === 0, className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40", children: "\u2190 Previous" }), _jsx("div", { className: "flex flex-wrap justify-center gap-1", children: questions.map((question, index) => (_jsx("button", { type: "button", onClick: () => setPosition(index), "aria-label": `Go to question ${index + 1}`, "aria-current": index === position ? 'true' : undefined, className: `h-2 w-2 rounded-full transition-colors ${index === position ? 'bg-brand' : 'bg-surface-sunken hover:bg-ink-faint'}` }, question.id))) }), _jsx("button", { type: "button", onClick: () => setPosition((p) => Math.min(questions.length - 1, p + 1)), disabled: position >= questions.length - 1, className: "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40", children: "Next \u2192" })] })] })) : null] }));
}
function Filter({ label, children }) {
    return (_jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: label }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: children })] }));
}
function Chip({ active, onClick, children, }) {
    return (_jsx("button", { type: "button", onClick: onClick, "aria-pressed": active, className: `rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${active
            ? 'border-brand bg-brand/10 text-brand'
            : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink'}`, children: children }));
}
