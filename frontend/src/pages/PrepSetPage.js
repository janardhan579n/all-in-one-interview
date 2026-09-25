import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Empty, ErrorBox, Loading } from '../components/ui';
import { QuestionCard } from '../components/interview';
const LEVELS = ['all', 'junior', 'mid', 'senior'];
/** One topic's question bank, filterable by level. */
export default function PrepSetPage() {
    const { id = '' } = useParams();
    const { data, loading, error, reload } = useAsync(() => platform.questionSet(id), [id]);
    const [level, setLevel] = useState('all');
    const visible = useMemo(() => (data ? data.questions.filter((q) => level === 'all' || q.level === level) : []), [data, level]);
    if (loading)
        return _jsx(Loading, { label: "Loading questions" });
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: reload });
    if (!data)
        return null;
    return (_jsxs("div", { className: "mx-auto max-w-4xl space-y-6 pb-16", children: [_jsxs("header", { children: [_jsxs(Link, { to: `/interview/tracks/${data.trackId}`, className: "text-xs font-medium text-brand hover:underline", children: ["\u2190 ", data.trackId] }), _jsx("h1", { className: "mt-2 text-2xl font-semibold tracking-tight text-ink", children: data.title }), _jsx("p", { className: "mt-1 max-w-prose text-sm text-ink-muted", children: data.summary })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-xs text-ink-faint", children: "Level" }), LEVELS.map((option) => {
                        const count = option === 'all'
                            ? data.questions.length
                            : data.questions.filter((q) => q.level === option).length;
                        return (_jsxs("button", { type: "button", onClick: () => setLevel(option), "aria-pressed": level === option, disabled: count === 0, className: `rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:opacity-40 ${level === option
                                ? 'border-brand bg-brand/10 text-brand'
                                : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink'}`, children: [option, " ", _jsx("span", { className: "tabular-nums opacity-70", children: count })] }, option));
                    })] }), visible.length === 0 ? (_jsx(Empty, { title: "Nothing at this level yet", hint: "Try another level, or clear the filter." })) : (_jsx("div", { className: "space-y-4", children: visible.map((question, index) => (_jsx(QuestionCard, { question: question, index: index + 1 }, question.id))) }))] }));
}
