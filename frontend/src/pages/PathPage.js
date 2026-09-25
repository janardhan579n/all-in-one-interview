import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useParams } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, ErrorBox, Loading, ProgressBar } from '../components/ui';
const ROUTES = {
    lesson: (id) => `/dsa/${id}`,
    problem: (id) => `/problems/${id}`,
    concept: (id) => `/system-design/${id}`,
    'case-study': (id) => `/system-design/case-studies/${id}`,
};
export default function PathPage() {
    const { id = '' } = useParams();
    const { progress } = useAppState();
    const { data, loading, error, reload } = useAsync(() => platform.path(id), [id, progress]);
    if (loading)
        return _jsx(Loading, { label: "Loading learning path" });
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: reload });
    if (!data)
        return null;
    const totalMinutes = data.steps.reduce((sum, step) => sum + (step.estimatedMinutes ?? 0), 0);
    const nextStep = data.steps.find((step) => step.status !== 'completed');
    return (_jsxs("div", { className: "mx-auto max-w-3xl space-y-6 pb-16", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: data.title }), _jsx("p", { className: "mt-1 text-sm text-ink-muted", children: data.description }), _jsxs("p", { className: "mt-2 text-xs text-ink-faint", children: ["For: ", data.audience, " \u00B7 ", data.total, " steps \u00B7 about ", Math.round(totalMinutes / 60), " hours of material"] })] }), _jsxs(Card, { children: [_jsx(ProgressBar, { label: `${data.completed} of ${data.total} complete`, percent: data.percent }), nextStep ? (_jsxs(Link, { to: (ROUTES[nextStep.kind] ?? ROUTES.lesson)(nextStep.ref), className: "mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white", children: [data.completed === 0 ? 'Start' : 'Continue', ": ", nextStep.title, " \u2192"] })) : (_jsx("p", { className: "mt-3 text-sm text-good", children: "Path complete. Try the interview simulator next." }))] }), _jsx("ol", { className: "space-y-2", children: data.steps.map((step, index) => {
                    const to = (ROUTES[step.kind] ?? ROUTES.lesson)(step.ref);
                    const done = step.status === 'completed';
                    const inProgress = step.status === 'in_progress';
                    return (_jsx("li", { children: _jsxs(Link, { to: to, className: `card flex items-start gap-3 px-4 py-3 transition-colors hover:border-brand/60 ${done ? 'opacity-70' : ''}`, children: [_jsx("span", { className: `mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${done
                                        ? 'bg-good/20 text-good'
                                        : inProgress
                                            ? 'bg-brand/20 text-brand'
                                            : 'bg-surface-sunken text-ink-faint'}`, children: done ? '✓' : index + 1 }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "font-medium text-ink", children: step.title }), step.summary ? _jsx("p", { className: "mt-0.5 line-clamp-2 text-sm text-ink-muted", children: step.summary }) : null] }), _jsxs("div", { className: "shrink-0 text-right", children: [_jsx("span", { className: "block text-[11px] text-ink-faint", children: step.kind }), step.estimatedMinutes ? (_jsxs("span", { className: "block text-[11px] text-ink-faint", children: [step.estimatedMinutes, " min"] })) : null] })] }) }, `${step.ref}-${index}`));
                }) })] }));
}
