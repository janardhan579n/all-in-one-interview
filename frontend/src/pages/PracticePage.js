import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as platform from '../services/platform';
import { Badge, Card, ErrorBox, Loading, ProgressBar } from '../components/ui';
/**
 * "Identify the Pattern".
 *
 * The drill the whole platform is built around: read a problem statement, name the pattern,
 * then see the signals that gave it away. It trains recognition rather than recall of
 * solutions — which is the difference between solving a problem you have seen and solving one
 * you have not.
 */
export default function PracticePage() {
    const [questions, setQuestions] = useState(null);
    const [error, setError] = useState(null);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [count, setCount] = useState(8);
    const load = (howMany) => {
        setQuestions(null);
        setError(null);
        setAnswers({});
        setResult(null);
        setIndex(0);
        platform
            .practiceQuestions(howMany)
            .then(setQuestions)
            .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
    };
    useEffect(() => {
        load(count);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: () => load(count) });
    if (!questions)
        return _jsx(Loading, { label: "Loading practice questions" });
    const question = questions[index];
    const answered = Object.keys(answers).length;
    const allAnswered = answered === questions.length;
    const submit = async () => {
        setResult(await platform.evaluatePractice(answers));
    };
    if (result) {
        return (_jsxs("div", { className: "mx-auto max-w-3xl space-y-6 pb-16", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: "Pattern recognition \u2014 results" }), _jsxs("p", { className: "mt-1 text-sm text-ink-muted", children: [result.score, " of ", result.total, " correct. The signals below are what you should be reading for next time."] })] }), _jsx(Card, { children: _jsx(ProgressBar, { percent: result.percent, label: "Score", tone: result.percent >= 70 ? 'good' : 'warn' }) }), _jsx("div", { className: "space-y-3", children: result.results.map((row) => {
                        const original = questions.find((item) => item.id === row.id);
                        return (_jsxs(Card, { className: row.correct ? 'border-good/40' : 'border-warn/40', children: [_jsx("p", { className: "text-sm text-ink", children: original?.prompt }), _jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-2 text-xs", children: [_jsxs("span", { className: row.correct ? 'text-good' : 'text-bad', children: [row.correct ? '✓' : '✕', " you said ", row.given.replace(/-/g, ' ')] }), !row.correct ? (_jsxs("span", { className: "text-good", children: ["\u2192 ", row.answer.replace(/-/g, ' ')] })) : null, _jsx(Link, { to: `/dsa/${row.answer}`, className: "ml-auto text-brand hover:underline", children: "open the lesson \u2192" })] }), row.signals.length > 0 ? (_jsx("div", { className: "mt-3 flex flex-wrap gap-1.5", children: row.signals.map((signal) => (_jsx(Badge, { tone: "pattern", children: signal }, signal))) })) : null, _jsx("p", { className: "mt-2 text-sm text-ink-muted", children: row.explanation })] }, row.id));
                    }) }), _jsx("button", { type: "button", onClick: () => load(count), className: "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white", children: "Another round" })] }));
    }
    return (_jsxs("div", { className: "mx-auto max-w-3xl space-y-6 pb-16", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: "Identify the pattern" }), _jsx("p", { className: "mt-1 max-w-prose text-sm text-ink-muted", children: "You are not asked to solve these. You are asked to say which pattern each one needs \u2014 the decision that, in a real interview, happens in the first two minutes and determines everything after it." }), _jsxs("label", { className: "mt-3 inline-flex items-center gap-2 text-xs text-ink-muted", children: ["Questions:", _jsx("select", { value: count, onChange: (event) => {
                                    const next = Number(event.target.value);
                                    setCount(next);
                                    load(next);
                                }, className: "rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink", children: [5, 8, 12, 20].map((option) => (_jsx("option", { value: option, children: option }, option))) })] })] }), _jsx(ProgressBar, { percent: Math.round((answered / questions.length) * 100), label: `${answered} of ${questions.length} answered` }), question ? (_jsxs(Card, { children: [_jsxs("p", { className: "mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: ["Question ", index + 1, " of ", questions.length] }), _jsx("p", { className: "text-base text-ink", children: question.prompt }), _jsx("div", { className: "mt-4 grid gap-2 sm:grid-cols-2", children: question.options.map((option) => {
                            const selected = answers[question.id] === option;
                            return (_jsx("button", { type: "button", onClick: () => setAnswers((current) => ({ ...current, [question.id]: option })), className: `rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selected ? 'border-brand bg-brand/10 font-medium text-ink' : 'border-line text-ink-muted hover:bg-surface-sunken'}`, children: option.replace(/-/g, ' ') }, option));
                        }) }), _jsxs("div", { className: "mt-5 flex items-center justify-between border-t border-line pt-3", children: [_jsx("button", { type: "button", onClick: () => setIndex((value) => Math.max(0, value - 1)), disabled: index === 0, className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted disabled:opacity-40", children: "\u2190 Previous" }), index < questions.length - 1 ? (_jsx("button", { type: "button", onClick: () => setIndex((value) => value + 1), className: "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white", children: "Next \u2192" })) : (_jsx("button", { type: "button", onClick: () => void submit(), disabled: !allAnswered, className: "rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50", children: allAnswered ? 'See results' : `${questions.length - answered} left` }))] })] })) : null] }));
}
