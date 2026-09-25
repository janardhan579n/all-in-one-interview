import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../app/AppState';
import * as platform from '../services/platform';
import { Badge, Card, CodeBlock } from './ui';
import { Markdown } from './Markdown';
const LEVEL_TONE = {
    junior: 'beginner',
    mid: 'intermediate',
    senior: 'advanced',
};
const TYPE_LABEL = {
    concept: 'Concept',
    code: 'Code',
    scenario: 'Scenario',
    tradeoff: 'Trade-off',
    behavioural: 'Behavioural',
};
/**
 * One interview question, answer hidden until you commit to an attempt.
 *
 * The gate is the whole point (§42 applied to interview prep): reading a model answer produces a
 * strong feeling of understanding and almost no ability to reproduce it under pressure. The
 * button is deliberately worded to prompt an attempt rather than a click.
 *
 * Self-marking writes through the ordinary content-flag endpoints, so a question you flag for
 * review appears in the same weak-area reporting as a lesson or a problem.
 */
export function QuestionCard({ question, index, defaultOpen = false, }) {
    const { progress, refreshProgress } = useAppState();
    const [revealed, setRevealed] = useState(defaultOpen);
    const [openFollowUps, setOpenFollowUps] = useState({});
    const [saving, setSaving] = useState(false);
    const flags = progress?.flags?.[question.id];
    const mark = async (mastered) => {
        setSaving(true);
        try {
            await platform.setFlags(question.id, !mastered, mastered);
            await refreshProgress();
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs(Card, { className: flags?.mastered ? 'border-good/40' : flags?.difficult ? 'border-warn/40' : '', children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { className: "flex min-w-0 flex-1 items-start gap-3", children: [index !== undefined ? (_jsx("span", { className: "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-[11px] font-semibold tabular-nums text-ink-faint", children: index })) : null, _jsx("h3", { className: "min-w-0 text-base font-semibold leading-snug text-ink", children: question.question })] }), _jsxs("div", { className: "flex shrink-0 gap-1.5", children: [_jsx(Badge, { tone: LEVEL_TONE[question.level], children: question.level }), _jsx(Badge, { tone: "neutral", children: TYPE_LABEL[question.type] ?? question.type })] })] }), question.codeExample && !revealed ? (_jsx("div", { className: "mt-4", children: _jsx(CodeBlock, { code: question.codeExample.code, title: "Look at this before you answer" }) })) : null, !revealed ? (_jsxs("div", { className: "mt-4 rounded-lg border border-dashed border-line bg-surface-sunken/60 p-4 text-center", children: [_jsx("p", { className: "mx-auto max-w-prose text-sm text-ink-muted", children: "Answer it out loud first \u2014 properly, as if someone were listening. What you can say is the only thing that transfers to the room." }), _jsx("button", { type: "button", onClick: () => setRevealed(true), className: "mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90", children: "Show a strong answer" })] })) : (_jsxs("div", { className: "mt-4 space-y-5", children: [question.codeExample ? _jsx(CodeBlock, { code: question.codeExample.code }) : null, _jsx("div", { className: "prose-sm", children: _jsx(Markdown, { children: question.answer }) }), question.keyPoints?.length ? (_jsxs("section", { children: [_jsx("h4", { className: "mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: "What the interviewer is listening for" }), _jsx("ul", { className: "space-y-1.5", children: question.keyPoints.map((point) => (_jsxs("li", { className: "flex gap-2 text-sm text-ink-muted", children: [_jsx("span", { className: "mt-0.5 text-good", "aria-hidden": "true", children: "\u2713" }), _jsx("span", { children: point })] }, point))) })] })) : null, question.followUps?.length ? (_jsxs("section", { children: [_jsx("h4", { className: "mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: "Follow-ups you should expect" }), _jsx("div", { className: "space-y-2", children: question.followUps.map((followUp, i) => (_jsxs("div", { className: "rounded-lg border border-line", children: [_jsxs("button", { type: "button", onClick: () => setOpenFollowUps((current) => ({ ...current, [i]: !current[i] })), "aria-expanded": Boolean(openFollowUps[i]), className: "flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken", children: [_jsx("span", { className: "mt-0.5 text-xs text-ink-faint", "aria-hidden": "true", children: openFollowUps[i] ? '▾' : '▸' }), _jsx("span", { className: "flex-1", children: followUp.q })] }), openFollowUps[i] ? (_jsx("div", { className: "border-t border-line px-3 py-2 text-sm text-ink-muted", children: _jsx(Markdown, { children: followUp.a }) })) : null] }, followUp.q))) })] })) : null, question.redFlags?.length ? (_jsxs("section", { children: [_jsx("h4", { className: "mb-2 text-[11px] font-medium uppercase tracking-wider text-bad", children: "Answers that lose marks" }), _jsx("ul", { className: "space-y-1.5", children: question.redFlags.map((flag) => (_jsxs("li", { className: "flex gap-2 text-sm text-ink-muted", children: [_jsx("span", { className: "mt-0.5 text-bad", "aria-hidden": "true", children: "\u2717" }), _jsx("span", { children: flag })] }, flag))) })] })) : null, question.related?.length ? (_jsxs("section", { children: [_jsx("h4", { className: "mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: "Read more on this" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: question.related.map((id) => (_jsx(RelatedLink, { id: id }, id))) })] })) : null, _jsxs("div", { className: "flex flex-wrap items-center gap-2 border-t border-line pt-3", children: [_jsx("span", { className: "mr-1 text-xs text-ink-faint", children: "How did that go?" }), _jsx("button", { type: "button", disabled: saving, onClick: () => mark(true), className: `rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${flags?.mastered
                                    ? 'border-good bg-good/10 text-good'
                                    : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink'}`, children: "\u2713 I could answer this" }), _jsx("button", { type: "button", disabled: saving, onClick: () => mark(false), className: `rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${flags?.difficult
                                    ? 'border-warn bg-warn/10 text-warn'
                                    : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink'}`, children: "\u21BB Review this again" })] })] }))] }));
}
/**
 * A link to the lesson or concept behind a question.
 *
 * The route is resolved from the content type rather than guessed from the id, because the same
 * id shape is used across lessons, problems, concepts and case studies.
 */
function RelatedLink({ id }) {
    const [route, setRoute] = useState(null);
    useEffect(() => {
        let cancelled = false;
        void platform.typeOf(id).then((type) => {
            if (cancelled)
                return;
            const routes = {
                problem: `/problems/${id}`,
                concept: `/system-design/${id}`,
                'case-study': `/system-design/case-studies/${id}`,
                'question-set': `/interview/sets/${id}`,
                lesson: `/dsa/${id}`,
            };
            setRoute(routes[type] ?? '');
        });
        return () => {
            cancelled = true;
        };
    }, [id]);
    if (!route) {
        return _jsx("span", { className: "rounded-full bg-surface-sunken px-2.5 py-1 text-xs text-ink-faint", children: id });
    }
    return (_jsxs(Link, { to: route, className: "rounded-full border border-line px-2.5 py-1 text-xs text-brand transition-colors hover:bg-brand/10", children: [id, " \u2192"] }));
}
