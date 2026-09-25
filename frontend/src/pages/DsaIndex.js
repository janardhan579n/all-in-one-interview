import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useSearchParams } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { ContentCard, ErrorBox, Loading, SectionHeading } from '../components/ui';
const KINDS = [
    { value: '', label: 'Everything' },
    { value: 'foundation', label: 'Foundations' },
    { value: 'pattern', label: 'Patterns' },
    { value: 'data-structure', label: 'Data Structures' },
];
const LEVELS = [
    { value: '', label: 'All levels' },
    { value: '0', label: 'Level 0 — absolute beginner' },
    { value: '1', label: 'Level 1 — foundations' },
    { value: '2', label: 'Level 2 — core patterns' },
    { value: '3', label: 'Level 3 — advanced' },
];
export default function DsaIndex() {
    const [params, setParams] = useSearchParams();
    const { isCompleted } = useAppState();
    const kind = params.get('kind') ?? '';
    const level = params.get('level') ?? '';
    const { data, loading, error, reload } = useAsync(() => platform.dsaGroups(), []);
    const update = (key, value) => {
        const next = new URLSearchParams(params);
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        setParams(next, { replace: true });
    };
    if (loading)
        return _jsx(Loading, { label: "Loading the DSA library" });
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: reload });
    const groups = (data ?? [])
        .map((group) => ({
        ...group,
        lessons: group.lessons
            .filter((lesson) => (kind ? lesson.kind === kind : true))
            .filter((lesson) => (level ? String(lesson.level) === level : true)),
    }))
        .filter((group) => group.lessons.length > 0);
    const total = groups.reduce((sum, group) => sum + group.lessons.length, 0);
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: "Data Structures & Algorithms" }), _jsxs("p", { className: "mt-1 max-w-prose text-sm text-ink-muted", children: ["Organised by ", _jsx("strong", { className: "text-ink", children: "pattern" }), " rather than by data structure, because the skill that transfers to an unseen problem is recognising which pattern it needs."] }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [_jsx(Link, { to: "/pattern-map", className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken", children: "\uD83D\uDDFA Pattern map" }), _jsx(Link, { to: "/problems", className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken", children: "\uD83C\uDFAF Problems by pattern" }), _jsx(Link, { to: "/practice", className: "rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken", children: "\uD83E\uDDEA Identify the pattern" })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("label", { className: "text-xs text-ink-muted", children: [_jsx("span", { className: "mb-1 block", children: "Type" }), _jsx("select", { value: kind, onChange: (event) => update('kind', event.target.value), className: "rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink", children: KINDS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("label", { className: "text-xs text-ink-muted", children: [_jsx("span", { className: "mb-1 block", children: "Level" }), _jsx("select", { value: level, onChange: (event) => update('level', event.target.value), className: "rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink", children: LEVELS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("p", { className: "self-end pb-2 text-xs text-ink-faint", children: [total, " lessons"] })] }), groups.map((group) => (_jsxs("section", { children: [_jsx(SectionHeading, { title: group.group }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: group.lessons.map((lesson) => (_jsx(ContentCard, { to: `/dsa/${lesson.id}`, title: lesson.title, summary: lesson.summary, completed: isCompleted(lesson.id), badges: [
                                { label: lesson.kind ?? 'lesson', tone: lesson.kind },
                                { label: lesson.difficulty ?? '', tone: lesson.difficulty },
                            ].filter((badge) => badge.label), meta: lesson.estimatedMinutes ? `${lesson.estimatedMinutes} min` : undefined }, lesson.id))) })] }, group.group))), groups.length === 0 ? (_jsx("p", { className: "rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-muted", children: "No lessons match those filters." })) : null] }));
}
