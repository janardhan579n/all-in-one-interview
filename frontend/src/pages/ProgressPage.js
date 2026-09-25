import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Card, ErrorBox, Loading, ProgressBar, SectionHeading } from '../components/ui';
export default function ProgressPage() {
    const { progress, refreshProgress, connection } = useAppState();
    const summary = useAsync(() => platform.progressSummary(), [progress]);
    const fileInput = useRef(null);
    const [message, setMessage] = useState(null);
    const download = async () => {
        try {
            const blob = await platform.exportProgress();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'progress.json';
            anchor.click();
            URL.revokeObjectURL(url);
            setMessage({ tone: 'good', text: 'Exported progress.json — keep it somewhere safe.' });
        }
        catch (error) {
            setMessage({ tone: 'bad', text: error instanceof Error ? error.message : String(error) });
        }
    };
    const upload = async (file) => {
        try {
            await platform.importProgress(await file.text());
            await refreshProgress();
            summary.reload();
            setMessage({ tone: 'good', text: 'Progress restored. Note that an import replaces what was here before.' });
        }
        catch (error) {
            setMessage({ tone: 'bad', text: error instanceof Error ? error.message : String(error) });
        }
    };
    if (summary.loading && !summary.data)
        return _jsx(Loading, { label: "Loading your progress" });
    if (summary.error)
        return _jsx(ErrorBox, { message: summary.error, onRetry: summary.reload });
    if (!summary.data)
        return null;
    const data = summary.data;
    return (_jsxs("div", { className: "space-y-8 pb-16", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: "Your progress" }), _jsxs("p", { className: "mt-1 text-sm text-ink-muted", children: ["Stored ", connection === 'online' ? 'in SQLite by the backend' : 'in this browser', " \u2014 and exportable either way, so it is yours to move."] })] }), _jsxs("section", { className: "grid gap-3 md:grid-cols-4", children: [_jsxs(Card, { children: [_jsx("p", { className: "text-[11px] uppercase tracking-wider text-ink-faint", children: "Streak" }), _jsx("p", { className: "text-2xl font-semibold tabular-nums text-ink", children: data.streak }), _jsx("p", { className: "text-xs text-ink-muted", children: "consecutive days" })] }), _jsxs(Card, { children: [_jsx("p", { className: "text-[11px] uppercase tracking-wider text-ink-faint", children: "Active days" }), _jsx("p", { className: "text-2xl font-semibold tabular-nums text-ink", children: data.activeDays }), _jsx("p", { className: "text-xs text-ink-muted", children: "total" })] }), _jsxs(Card, { children: [_jsx("p", { className: "text-[11px] uppercase tracking-wider text-ink-faint", children: "Problems solved" }), _jsxs("p", { className: "text-2xl font-semibold tabular-nums text-ink", children: [data.problemsSolved, _jsxs("span", { className: "text-sm text-ink-faint", children: [" / ", data.problemsTotal] })] })] }), _jsxs(Card, { children: [_jsx("p", { className: "text-[11px] uppercase tracking-wider text-ink-faint", children: "Readiness" }), _jsx("p", { className: "text-2xl font-semibold tabular-nums text-ink", children: data.readiness.score }), _jsx("p", { className: "text-xs text-ink-muted", children: data.readiness.band })] })] }), _jsxs("section", { children: [_jsx(SectionHeading, { title: "Coverage" }), _jsxs(Card, { className: "space-y-4", children: [_jsx(ProgressBar, { label: `DSA lessons (${data.dsa.completed}/${data.dsa.total})`, percent: data.dsa.percent }), _jsx(ProgressBar, { label: `System design (${data.systemDesign.completed}/${data.systemDesign.total})`, percent: data.systemDesign.percent, tone: "good" }), _jsx(ProgressBar, { label: `Patterns mastered (${data.patterns.completed}/${data.patterns.total})`, percent: data.patterns.percent, tone: "warn" })] })] }), _jsxs("section", { children: [_jsx(SectionHeading, { title: "Weak areas", subtitle: "Derived from your own confidence ratings and solve rates, so it is only as useful as your honesty." }), data.weakAreas.length === 0 ? (_jsx(Card, { children: _jsx("p", { className: "text-sm text-ink-muted", children: "Nothing flagged yet. Weak areas appear once you have attempted a pattern at least twice \u2014 record attempts on a problem page using \"I solved it\" / \"not yet\"." }) })) : (_jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: data.weakAreas.map((area) => (_jsxs(Card, { children: [_jsx(Link, { to: `/dsa/${area.patternId}`, className: "font-medium text-ink hover:text-brand", children: area.title }), _jsxs("p", { className: "mt-1 text-xs text-ink-muted", children: [area.solved, "/", area.attempts, " solved"] }), _jsx("div", { className: "mt-2", children: _jsx(ProgressBar, { percent: area.solveRate, tone: "warn" }) }), _jsx(Link, { to: `/problems?pattern=${area.patternId}`, className: "mt-3 inline-block text-xs font-medium text-brand hover:underline", children: "Drill this pattern \u2192" })] }, area.patternId))) }))] }), progress && progress.quizzes.length > 0 ? (_jsxs("section", { children: [_jsx(SectionHeading, { title: "Quiz results" }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-line", children: _jsxs("table", { className: "w-full text-left text-sm", children: [_jsx("thead", { className: "bg-surface-sunken text-xs uppercase tracking-wider text-ink-faint", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 font-medium", children: "Topic" }), _jsx("th", { className: "px-4 py-2 font-medium", children: "Best score" }), _jsx("th", { className: "px-4 py-2 font-medium", children: "Attempts" })] }) }), _jsx("tbody", { children: progress.quizzes.map((quiz) => (_jsxs("tr", { className: "border-t border-line", children: [_jsx("td", { className: "px-4 py-2 text-ink", children: quiz.contentId.replace(/-/g, ' ') }), _jsxs("td", { className: "px-4 py-2 tabular-nums text-ink-muted", children: [quiz.bestScore, " / ", quiz.total] }), _jsx("td", { className: "px-4 py-2 tabular-nums text-ink-muted", children: quiz.attempts })] }, quiz.contentId))) })] }) })] })) : null, _jsxs("section", { children: [_jsx(SectionHeading, { title: "Back up or move your progress", subtitle: "Local-first means the data is a file you own. Export it, and it moves between machines \u2014 or between offline and backend mode." }), _jsxs(Card, { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => void download(), className: "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white", children: "\u2B07 Export progress.json" }), _jsx("button", { type: "button", onClick: () => fileInput.current?.click(), className: "rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-sunken", children: "\u2B06 Import progress.json" }), _jsx("input", { ref: fileInput, type: "file", accept: "application/json", className: "hidden", onChange: (event) => {
                                            const file = event.target.files?.[0];
                                            if (file)
                                                void upload(file);
                                            event.target.value = '';
                                        } })] }), message ? (_jsx("p", { className: `mt-3 text-sm ${message.tone === 'good' ? 'text-good' : 'text-bad'}`, children: message.text })) : null, _jsxs("p", { className: "mt-3 text-xs text-ink-faint", children: ["Importing ", _jsx("strong", { children: "replaces" }), " your current progress rather than merging \u2014 that is what people expect from restoring a backup, and merging two histories would need conflict rules nobody wants."] })] })] })] }));
}
