import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Callout, Card, ContentCard, ErrorBox, Loading, ProgressBar, SectionHeading } from '../components/ui';
import { Markdown } from '../components/Markdown';
/**
 * The interview simulator.
 *
 * No AI, by design (ADR-008). Instead it does what a good interviewer does: asks a question,
 * makes you commit an answer in writing, offers hints on request, and only then shows what a
 * strong answer covers so you can mark yourself against it.
 *
 * Answers are kept in this browser only — they are practice notes, not submissions.
 */
export default function InterviewPage() {
    const { id } = useParams();
    if (!id)
        return _jsx(InterviewPicker, {});
    return _jsx(InterviewSession, { id: id });
}
function InterviewPicker() {
    const { data, loading, error, reload } = useAsync(() => platform.caseStudies(), []);
    if (loading)
        return _jsx(Loading, { label: "Loading interview scenarios" });
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: reload });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: "Interview simulator" }), _jsx("p", { className: "mt-1 max-w-prose text-sm text-ink-muted", children: "One stage at a time, the way a real system-design interview runs. You commit an answer before seeing the model answer \u2014 reading it first feels productive and teaches almost nothing." })] }), _jsx(Callout, { tone: "info", title: "How to get value from this", children: "Type a real answer, even a rough one. The gap between what you wrote and the model answer is the actual feedback \u2014 far more useful than a score." }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: (data ?? []).map((study) => (_jsx(ContentCard, { to: `/interview/${study.id}`, title: `Design ${study.title.replace(/^Design a /i, '')}`, summary: study.summary, badges: [{ label: study.difficulty ?? '', tone: study.difficulty }].filter((badge) => badge.label) }, study.id))) }), _jsxs(Card, { children: [_jsx(SectionHeading, { title: "Also worth drilling" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Link, { to: "/practice", className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken", children: "\uD83E\uDDEA Identify the pattern" }), _jsx(Link, { to: "/problems", className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken", children: "\uD83C\uDFAF Timed problem practice" })] })] })] }));
}
const STORAGE_KEY = 'dsa-interview-answers-v1';
function loadAnswers(id) {
    try {
        const raw = window.localStorage.getItem(`${STORAGE_KEY}:${id}`);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
function saveAnswers(id, state) {
    try {
        window.localStorage.setItem(`${STORAGE_KEY}:${id}`, JSON.stringify(state));
    }
    catch {
        // Practice notes are a convenience; losing them must not break the session.
    }
}
function InterviewSession({ id }) {
    const { data: study, loading, error, reload } = useAsync(() => platform.caseStudy(id), [id]);
    const [index, setIndex] = useState(0);
    const [state, setState] = useState({});
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        setState(loadAnswers(id));
        setIndex(0);
        setElapsed(0);
    }, [id]);
    useEffect(() => {
        const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, [id]);
    if (loading)
        return _jsx(Loading, { label: "Preparing the interview" });
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: reload });
    if (!study)
        return null;
    const stages = study.interviewStages ?? [];
    if (stages.length === 0) {
        return (_jsx(Card, { children: _jsxs("p", { className: "text-sm text-ink-muted", children: ["This case study does not have interview stages yet.", ' ', _jsx(Link, { to: `/system-design/case-studies/${study.id}`, className: "text-brand hover:underline", children: "Read the walkthrough instead \u2192" })] }) }));
    }
    const stage = stages[index];
    const current = state[stage.key] ?? { answer: '', hintsShown: 0, revealed: false, selfRating: null };
    const update = (patch) => {
        const next = { ...state, [stage.key]: { ...current, ...patch } };
        setState(next);
        saveAnswers(id, next);
    };
    const answeredCount = stages.filter((item) => (state[item.key]?.answer ?? '').trim().length > 0).length;
    const minutes = Math.floor(elapsed / 60);
    const seconds = String(elapsed % 60).padStart(2, '0');
    return (_jsxs("div", { className: "mx-auto max-w-3xl space-y-5 pb-16", children: [_jsxs("header", { children: [_jsxs("div", { className: "mb-2 flex flex-wrap items-center justify-between gap-2", children: [_jsx(Link, { to: "/interview", className: "text-xs text-brand hover:underline", children: "\u2190 All scenarios" }), _jsxs("span", { className: "rounded-lg bg-surface-sunken px-2 py-1 font-mono text-xs tabular-nums text-ink-muted", children: ["\u23F1 ", minutes, ":", seconds] })] }), _jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: study.title }), _jsxs("p", { className: "mt-1 text-sm text-ink-muted", children: ["Stage ", index + 1, " of ", stages.length, " \u00B7 ", answeredCount, " answered"] }), _jsx("div", { className: "mt-3", children: _jsx(ProgressBar, { percent: Math.round((answeredCount / stages.length) * 100) }) })] }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: stages.map((item, position) => (_jsx("button", { type: "button", onClick: () => setIndex(position), className: `rounded-lg px-2.5 py-1 text-xs capitalize transition-colors ${position === index
                        ? 'bg-brand text-white'
                        : (state[item.key]?.answer ?? '').trim()
                            ? 'border border-good/50 bg-good/10 text-good'
                            : 'border border-line text-ink-muted hover:bg-surface-sunken'}`, children: item.key.replace(/-/g, ' ') }, item.key))) }), _jsxs(Card, { children: [_jsx("p", { className: "mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: "Interviewer" }), _jsx("p", { className: "text-base text-ink", children: stage.prompt }), _jsxs("label", { className: "mt-4 block", children: [_jsx("span", { className: "sr-only", children: "Your answer" }), _jsx("textarea", { value: current.answer, onChange: (event) => update({ answer: event.target.value }), rows: 7, placeholder: "Talk through it as you would out loud. Bullet points are fine \u2014 the point is to commit to a position before you see the model answer.", className: "w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none" })] }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: [current.hintsShown < stage.hints.length ? (_jsxs("button", { type: "button", onClick: () => update({ hintsShown: current.hintsShown + 1 }), className: "rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken", children: ["\uD83D\uDCA1 Hint (", stage.hints.length - current.hintsShown, " left)"] })) : (_jsx("span", { className: "text-xs text-ink-faint", children: "No hints left" })), _jsx("button", { type: "button", onClick: () => update({ revealed: true }), disabled: current.answer.trim().length === 0 && !current.revealed, title: current.answer.trim().length === 0 ? 'Write something first — even a rough answer' : undefined, className: "rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50", children: "Compare with a strong answer" })] }), current.hintsShown > 0 ? (_jsx("ul", { className: "mt-3 space-y-1.5", children: stage.hints.slice(0, current.hintsShown).map((hint) => (_jsxs("li", { className: "rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-ink-muted", children: ["\uD83D\uDCA1 ", hint] }, hint))) })) : null, current.revealed ? (_jsxs("div", { className: "mt-4 rounded-lg border border-good/40 bg-good/5 p-4", children: [_jsx("p", { className: "mb-2 text-[11px] font-medium uppercase tracking-wider text-good", children: "A strong answer covers" }), _jsx("ul", { className: "space-y-1.5 text-sm text-ink-muted", children: stage.modelAnswer.map((point) => (_jsxs("li", { className: "flex gap-2", children: [_jsx("span", { className: "text-good", children: "\u2022" }), _jsx(Markdown, { className: "flex-1", children: point })] }, point))) }), _jsxs("div", { className: "mt-4 border-t border-good/30 pt-3", children: [_jsx("p", { className: "mb-2 text-xs text-ink-muted", children: "How much of that did you cover?" }), _jsxs("div", { className: "flex gap-1.5", children: [[1, 2, 3, 4, 5].map((rating) => (_jsx("button", { type: "button", onClick: () => update({ selfRating: rating }), className: `h-8 w-8 rounded-lg text-sm font-medium transition-colors ${current.selfRating === rating ? 'bg-brand text-white' : 'border border-line text-ink-muted hover:bg-surface-sunken'}`, children: rating }, rating))), current.selfRating ? (_jsx("span", { className: "self-center pl-2 text-xs text-ink-faint", children: current.selfRating >= 4 ? 'Solid — move on.' : 'Worth re-reading that section of the case study.' })) : null] })] })] })) : null] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("button", { type: "button", onClick: () => setIndex((value) => Math.max(0, value - 1)), disabled: index === 0, className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40", children: "\u2190 Previous stage" }), index < stages.length - 1 ? (_jsx("button", { type: "button", onClick: () => setIndex((value) => value + 1), className: "rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white", children: "Next stage \u2192" })) : (_jsx(Link, { to: `/system-design/case-studies/${study.id}`, className: "rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white", children: "Review the full walkthrough \u2192" }))] }), _jsx(Card, { children: _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx(Badge, { tone: "pattern", children: "Your notes stay in this browser" }), _jsx("button", { type: "button", onClick: () => {
                                setState({});
                                saveAnswers(id, {});
                            }, className: "text-xs text-ink-muted hover:text-bad hover:underline", children: "Clear my answers for this scenario" })] }) })] }));
}
