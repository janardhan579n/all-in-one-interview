import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Callout, Card, Loading, SectionHeading } from './ui';
import { Markdown } from './Markdown';
/**
 * Quiz.
 *
 * Answers are never in the payload when the backend is running — marking is a round trip, and
 * the explanation arrives with the result. That keeps the quiz honest and, more importantly,
 * means the explanation is read at the moment the learner is most receptive to it.
 */
export function Quiz({ contentId }) {
    const { refreshProgress } = useAppState();
    const { data: questions, loading } = useAsync(() => platform.quizQuestions(contentId), [contentId]);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        setAnswers({});
        setResult(null);
    }, [contentId]);
    if (loading)
        return _jsx(Loading, { label: "Loading quiz" });
    if (!questions || questions.length === 0)
        return null;
    const allAnswered = questions.every((question) => answers[question.id] !== undefined);
    const submit = async () => {
        setSubmitting(true);
        try {
            const outcome = await platform.evaluateQuiz(contentId, answers);
            setResult(outcome);
            await refreshProgress();
        }
        finally {
            setSubmitting(false);
        }
    };
    const resultFor = (questionId) => result?.results.find((row) => row.questionId === questionId);
    return (_jsxs("section", { "aria-labelledby": "quiz-heading", children: [_jsx(SectionHeading, { id: "quiz-heading", title: "Check your understanding", subtitle: result
                    ? `${result.score} / ${result.total} correct`
                    : 'Answer every question, then submit to see the explanations.' }), _jsx("div", { className: "space-y-4", children: questions.map((question, index) => {
                    const outcome = resultFor(question.id);
                    return (_jsx(Card, { children: _jsxs("fieldset", { children: [_jsxs("legend", { className: "mb-3 text-sm font-medium text-ink", children: [_jsxs("span", { className: "mr-2 text-ink-faint", children: [index + 1, "."] }), _jsx("span", { className: "whitespace-pre-wrap", children: question.question })] }), _jsx("div", { className: "space-y-1.5", children: question.options.map((option, optionIndex) => {
                                        const selected = answers[question.id] === optionIndex;
                                        const isCorrect = outcome && outcome.correctIndex === optionIndex;
                                        const isWrongPick = outcome && selected && !outcome.correct;
                                        return (_jsxs("label", { className: `flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${isCorrect
                                                ? 'border-good bg-good/10'
                                                : isWrongPick
                                                    ? 'border-bad bg-bad/10'
                                                    : selected
                                                        ? 'border-brand bg-brand/5'
                                                        : 'border-line hover:bg-surface-sunken'}`, children: [_jsx("input", { type: "radio", name: question.id, checked: selected, disabled: Boolean(result), onChange: () => setAnswers((current) => ({ ...current, [question.id]: optionIndex })), className: "mt-0.5 accent-brand" }), _jsx("span", { className: "text-ink-muted", children: option }), isCorrect ? _jsx("span", { className: "ml-auto shrink-0 text-good", children: "\u2713" }) : null] }, optionIndex));
                                    }) }), outcome ? (_jsxs("div", { className: "mt-3 rounded-lg bg-surface-sunken p-3 text-sm", children: [_jsx("p", { className: `mb-1 font-medium ${outcome.correct ? 'text-good' : 'text-warn'}`, children: outcome.correct ? 'Correct' : 'Not quite' }), _jsx("p", { className: "text-ink-muted", children: outcome.explanation })] })) : null] }) }, question.id));
                }) }), !result ? (_jsx("button", { type: "button", onClick: () => void submit(), disabled: !allAnswered || submitting, className: "mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50", children: submitting ? 'Marking…' : allAnswered ? 'Submit answers' : `Answer all ${questions.length} questions` })) : (_jsxs("div", { className: "mt-4 flex items-center gap-3", children: [_jsxs(Badge, { tone: result.passed ? 'beginner' : 'intermediate', children: [result.percent, "% ", result.passed ? '· passed' : '· keep going'] }), _jsx("button", { type: "button", onClick: () => {
                            setAnswers({});
                            setResult(null);
                        }, className: "rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken", children: "Try again" })] }))] }));
}
/** Interactive decision tree: answer questions, arrive at a recommendation. */
export function DecisionTreeWalker({ treeId }) {
    const { data: tree, loading, error } = useAsync(() => platform.decisionTree(treeId), [treeId]);
    const [path, setPath] = useState([]);
    useEffect(() => setPath([]), [treeId]);
    if (loading)
        return _jsx(Loading, { label: "Loading decision tree" });
    if (error || !tree)
        return null;
    const currentId = path.length === 0 ? tree.start : path[path.length - 1];
    const current = tree.nodes[currentId];
    if (!current)
        return null;
    return (_jsxs(Card, { children: [_jsxs("div", { className: "mb-3 flex items-start justify-between gap-3", children: [_jsx("h3", { className: "text-sm font-semibold text-ink", children: tree.title }), path.length > 0 ? (_jsx("button", { type: "button", onClick: () => setPath([]), className: "shrink-0 text-xs text-brand hover:underline", children: "Start over" })) : null] }), path.length > 1 ? (_jsx("ol", { className: "mb-3 space-y-1 text-xs text-ink-faint", children: path.slice(0, -1).map((nodeId, index) => (_jsxs("li", { children: ["\u21B3 ", tree.nodes[nodeId]?.text] }, `${nodeId}-${index}`))) })) : null, current.type === 'question' ? (_jsxs("div", { children: [_jsx(Markdown, { className: "mb-3 text-sm", children: current.text }), _jsx("div", { className: "flex flex-wrap gap-2", children: current.options?.map((option) => (_jsx("button", { type: "button", onClick: () => setPath((value) => [...value, option.next]), className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-brand hover:bg-brand/5", children: option.label }, option.label))) })] })) : (_jsxs("div", { className: "rounded-lg border border-good/40 bg-good/5 p-4", children: [_jsxs("p", { className: "text-sm font-semibold text-ink", children: ["\u2192 ", current.text] }), current.detail ? _jsx(Markdown, { className: "mt-1 text-sm", children: current.detail }) : null, current.lessonId ? (_jsx(Link, { to: `/dsa/${current.lessonId}`, className: "mt-3 inline-block text-xs font-medium text-brand hover:underline", children: "Open the lesson \u2192" })) : null, _jsx("button", { type: "button", onClick: () => setPath((value) => value.slice(0, -1)), className: "ml-3 mt-3 inline-block text-xs text-ink-muted hover:underline", children: "\u2190 back" })] }))] }));
}
/** Trade-off cards: never "X is better", always "here is what each costs you". */
export function TradeoffCards({ tradeoffs }) {
    if (!tradeoffs || tradeoffs.length === 0)
        return null;
    return (_jsx("div", { className: "grid gap-3 md:grid-cols-2", children: tradeoffs.map((tradeoff) => (_jsxs(Card, { className: "flex flex-col", children: [_jsx("h4", { className: "mb-3 font-medium text-ink", children: tradeoff.option }), _jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "mb-1 text-[11px] font-medium uppercase tracking-wider text-good", children: "Advantages" }), _jsx("ul", { className: "space-y-1", children: tradeoff.pros.map((pro) => (_jsxs("li", { className: "flex gap-2 text-ink-muted", children: [_jsx("span", { className: "text-good", children: "+" }), _jsx("span", { children: pro })] }, pro))) })] }), _jsxs("div", { children: [_jsx("p", { className: "mb-1 text-[11px] font-medium uppercase tracking-wider text-bad", children: "Costs" }), _jsx("ul", { className: "space-y-1", children: tradeoff.cons.map((con) => (_jsxs("li", { className: "flex gap-2 text-ink-muted", children: [_jsx("span", { className: "text-bad", children: "\u2212" }), _jsx("span", { children: con })] }, con))) })] }), tradeoff.examples ? (_jsxs("p", { className: "border-t border-line pt-2 text-xs text-ink-faint", children: ["e.g. ", tradeoff.examples] })) : null] })] }, tradeoff.option))) }));
}
/** Notes, bookmark and completion controls — the per-item study toolbar. */
export function StudyControls({ contentId, contentType }) {
    const { progress, refreshProgress } = useAppState();
    const [note, setNote] = useState('');
    const [bookmarked, setBookmarked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [open, setOpen] = useState(false);
    const completed = progress?.lessons[contentId]?.status === 'completed';
    useEffect(() => {
        void platform.note(contentId).then(setNote).catch(() => setNote(''));
        void platform
            .bookmarks()
            .then((rows) => setBookmarked(rows.some((row) => row.contentId === contentId)))
            .catch(() => setBookmarked(false));
    }, [contentId]);
    const toggleComplete = async () => {
        await platform.updateLessonProgress(contentId, completed ? 'in_progress' : 'completed', completed ? 50 : 100);
        await refreshProgress();
    };
    const toggleBookmark = async () => {
        const next = !bookmarked;
        setBookmarked(next);
        await platform.toggleBookmark(contentId, next);
    };
    const saveNote = async () => {
        await platform.saveNote(contentId, note);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1600);
    };
    return (_jsxs("div", { className: "card p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => void toggleComplete(), className: `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${completed ? 'bg-good/15 text-good' : 'bg-brand text-white hover:opacity-90'}`, children: completed ? '✓ Completed' : 'Mark as complete' }), _jsx("button", { type: "button", onClick: () => void toggleBookmark(), "aria-pressed": bookmarked, className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken", children: bookmarked ? '🔖 Bookmarked' : '🔖 Bookmark' }), _jsxs("button", { type: "button", onClick: () => setOpen((value) => !value), "aria-expanded": open, className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken", children: ["\uD83D\uDCDD ", note ? 'Edit note' : 'Add note'] }), _jsx("span", { className: "ml-auto text-[11px] text-ink-faint", children: contentType })] }), open ? (_jsxs("div", { className: "mt-3", children: [_jsx("label", { className: "sr-only", htmlFor: `note-${contentId}`, children: "Your note" }), _jsx("textarea", { id: `note-${contentId}`, value: note, onChange: (event) => setNote(event.target.value), rows: 4, placeholder: "What clicked for you here? Write it in your own words \u2014 that is what makes it stick.", className: "w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none" }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => void saveNote(), className: "rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white", children: "Save note" }), saved ? _jsx("span", { className: "text-xs text-good", children: "Saved" }) : null] })] })) : null] }));
}
/** "Why does this exist?" — the WHY-mode panel used across System Design. */
export function WhyPanel({ why }) {
    const [open, setOpen] = useState(false);
    return (_jsxs(Card, { children: [_jsxs("button", { type: "button", onClick: () => setOpen((value) => !value), "aria-expanded": open, className: "flex w-full items-center justify-between gap-3 text-left", children: [_jsx("span", { className: "text-sm font-semibold text-ink", children: "Why does this exist?" }), _jsx("span", { className: "text-xs text-brand", children: open ? 'hide' : 'show me' })] }), open ? (_jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border border-bad/30 bg-bad/5 p-3", children: [_jsx("p", { className: "mb-2 text-[11px] font-medium uppercase tracking-wider text-bad", children: "Without it" }), _jsx("ul", { className: "space-y-1 text-sm text-ink-muted", children: why.without.map((item) => (_jsxs("li", { children: ["\u2022 ", item] }, item))) })] }), _jsxs("div", { className: "rounded-lg border border-good/30 bg-good/5 p-3", children: [_jsx("p", { className: "mb-2 text-[11px] font-medium uppercase tracking-wider text-good", children: "With it" }), _jsx("ul", { className: "space-y-1 text-sm text-ink-muted", children: why.with.map((item) => (_jsxs("li", { children: ["\u2022 ", item] }, item))) })] }), _jsx("div", { className: "md:col-span-2", children: _jsx(Callout, { tone: "info", children: why.conclusion }) })] })) : null] }));
}
