import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { ContentCard, ErrorBox, Loading } from '../components/ui';
export default function CaseStudiesPage() {
    const { isCompleted } = useAppState();
    const { data, loading, error, reload } = useAsync(() => platform.caseStudies(), []);
    if (loading)
        return _jsx(Loading, { label: "Loading case studies" });
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: reload });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: "Case Studies" }), _jsx("p", { className: "mt-1 max-w-prose text-sm text-ink-muted", children: "Complete systems, built up stage by stage. The final architecture is never shown first \u2014 you watch each component get added in response to a specific pressure, which is the only way the diagram ever makes sense." })] }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: (data ?? []).map((study) => (_jsx(ContentCard, { to: `/system-design/case-studies/${study.id}`, title: study.title, summary: study.summary, completed: isCompleted(study.id), badges: [
                        { label: study.difficulty ?? '', tone: study.difficulty },
                        ...(study.interactive ? [{ label: 'interactive', tone: 'pattern' }] : []),
                    ].filter((badge) => badge.label), meta: study.estimatedMinutes ? `${study.estimatedMinutes} min` : undefined }, study.id))) })] }));
}
