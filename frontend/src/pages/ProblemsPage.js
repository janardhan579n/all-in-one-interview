import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { useAppState, useAsync } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, ErrorBox, Loading, SectionHeading } from '../components/ui';
const TIER_LABEL = {
    beginner: '🟢 Beginner',
    intermediate: '🟡 Intermediate',
    advanced: '🔴 Advanced',
};
export default function ProblemsPage() {
    const { progress } = useAppState();
    const { data, loading, error, reload } = useAsync(() => platform.problemsByPattern(), []);
    if (loading)
        return _jsx(Loading, { label: "Loading problems" });
    if (error)
        return _jsx(ErrorBox, { message: error, onRetry: reload });
    const solved = (id) => progress?.problems[id]?.solved === true;
    const attempted = (id) => (progress?.problems[id]?.attempts ?? 0) > 0;
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { children: [_jsx("h1", { className: "text-2xl font-semibold tracking-tight text-ink", children: "Problems" }), _jsxs("p", { className: "mt-1 max-w-prose text-sm text-ink-muted", children: ["Grouped ", _jsx("strong", { className: "text-ink", children: "pattern \u2192 difficulty \u2192 problem" }), ", not as a flat list. The point is not to accumulate a solved count; it is to see the same idea recur at three levels of difficulty."] }), _jsxs("p", { className: "mt-2 max-w-prose text-xs text-ink-faint", children: ["The number on the left is the LeetCode problem number, so you can read the pattern here and then go and type it there. ", _jsx("span", { className: "font-mono", children: "*" }), " marks a LeetCode Premium problem; ", _jsx("span", { className: "font-mono", children: "\u2014" }), ' ', "marks one with no equivalent on a judge, which its page explains."] })] }), (data ?? []).map((group) => (_jsxs("section", { children: [_jsx(SectionHeading, { title: group.patternTitle, subtitle: group.group, action: _jsx(Link, { to: `/dsa/${group.patternId}`, className: "shrink-0 text-xs font-medium text-brand hover:underline", children: "Read the pattern \u2192" }) }), _jsx("div", { className: "space-y-3", children: group.tiers.map((tier) => (_jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-xs font-medium text-ink-muted", children: TIER_LABEL[tier.difficulty] ?? tier.difficulty }), _jsx("ul", { className: "space-y-1.5", children: tier.problems.map((problem) => (_jsx("li", { children: _jsxs(Link, { to: `/problems/${problem.id}`, className: "card flex items-center gap-3 px-4 py-2.5 transition-colors hover:border-brand/60", children: [problem.leetcodeId ? (_jsxs("span", { className: "w-12 shrink-0 text-right font-mono text-xs tabular-nums text-ink-faint", title: `LeetCode ${problem.leetcodeId}${problem.leetcodePremium ? ' (premium)' : ''}`, children: [problem.leetcodeId, problem.leetcodePremium ? '*' : ''] })) : (_jsx("span", { className: "w-12 shrink-0 text-right font-mono text-xs text-ink-faint", children: "\u2014" })), _jsx("span", { className: "min-w-0 flex-1 truncate text-sm text-ink", children: problem.title }), solved(problem.id) ? (_jsx(Badge, { tone: "beginner", children: "solved" })) : attempted(problem.id) ? (_jsx(Badge, { tone: "intermediate", children: "attempted" })) : null, _jsx("span", { className: "text-ink-faint", children: "\u2192" })] }) }, problem.id))) })] }, tier.difficulty))) })] }, group.patternId)))] }));
}
