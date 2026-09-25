import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef } from 'react';
import { ENGINES } from './registry';
import { SceneView } from './Scene';
import { PlayerControls, usePlayer, usePlayerShortcuts } from './Player';
/** The code listing, with the current step's line highlighted. */
function CodePane({ code, activeLine }) {
    return (_jsxs("div", { className: "overflow-hidden rounded-lg border border-line bg-surface-sunken", children: [_jsx("div", { className: "border-b border-line px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: "Java" }), _jsx("pre", { className: "overflow-x-auto py-2 text-xs leading-relaxed", children: _jsx("code", { children: code.map((line, index) => {
                        const lineNumber = index + 1;
                        const isActive = activeLine === lineNumber;
                        return (_jsxs("div", { className: `flex px-3 transition-colors duration-200 motion-reduce:transition-none ${isActive ? 'bg-brand/15' : ''}`, "aria-current": isActive ? 'step' : undefined, children: [_jsx("span", { className: `w-7 shrink-0 select-none text-right tabular-nums ${isActive ? 'font-bold text-brand' : 'text-ink-faint'}`, children: lineNumber }), _jsx("span", { className: `whitespace-pre pl-3 font-mono ${isActive ? 'text-ink' : 'text-ink-muted'}`, children: line || ' ' })] }, index));
                    }) }) })] }));
}
/** The variable inspector — what a debugger would show at this instant. */
function VariablePane({ step }) {
    const entries = Object.entries(step.vars ?? {});
    if (entries.length === 0)
        return null;
    return (_jsxs("div", { className: "rounded-lg border border-line bg-surface-sunken p-3", children: [_jsx("h4", { className: "mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: "Variables" }), _jsx("dl", { className: "space-y-1", children: entries.map(([name, value]) => (_jsxs("div", { className: "flex items-baseline justify-between gap-3 text-xs", children: [_jsx("dt", { className: "font-mono text-ink-muted", children: name }), _jsx("dd", { className: "font-mono font-semibold tabular-nums text-ink", children: String(value) })] }, name))) })] }));
}
export function Visualizer({ spec }) {
    const container = useRef(null);
    const steps = useMemo(() => {
        const engine = ENGINES[spec.engine];
        if (!engine)
            return [];
        try {
            return engine(spec.input ?? {});
        }
        catch (error) {
            // A broken engine must degrade to a message, never take the lesson page down.
            console.error(`Visualisation engine "${spec.engine}" failed`, error);
            return [];
        }
    }, [spec.engine, spec.input]);
    const player = usePlayer(steps.length || 1);
    usePlayerShortcuts(container, {
        onToggle: player.toggle,
        onNext: player.next,
        onPrevious: player.previous,
        onReset: player.reset,
    });
    if (steps.length === 0) {
        return (_jsxs("div", { className: "rounded-xl border border-dashed border-line p-6 text-sm text-ink-muted", children: [_jsx("p", { className: "font-medium text-ink", children: "Visualisation unavailable" }), _jsxs("p", { className: "mt-1", children: ["No engine is registered under ", _jsx("code", { className: "font-mono text-xs", children: spec.engine }), ". This is a content error rather than a runtime one \u2014 see ", _jsx("code", { className: "font-mono text-xs", children: "visualizers/registry.ts" }), "."] })] }));
    }
    const step = steps[Math.min(player.index, steps.length - 1)];
    const activeLine = step.codeLine !== undefined ? step.codeLine + (spec.codeLineOffset ?? 0) : undefined;
    return (_jsxs("div", { ref: container, tabIndex: 0, className: "overflow-hidden rounded-xl border border-line bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand", "aria-label": spec.title ? `Visualisation: ${spec.title}` : 'Visualisation', children: [spec.title ? (_jsx("div", { className: "border-b border-line px-4 py-3", children: _jsx("h3", { className: "text-sm font-semibold text-ink", children: spec.title }) })) : null, _jsxs("div", { className: "grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_420px]", children: [_jsx("div", { className: "min-w-0", children: _jsx(SceneView, { scene: step.scene }) }), _jsxs("div", { className: "space-y-3", children: [spec.code && spec.code.length > 0 ? _jsx(CodePane, { code: spec.code, activeLine: activeLine }) : null, _jsx(VariablePane, { step: step })] })] }), _jsx("div", { className: "border-t border-line bg-surface-sunken px-4 py-3", children: _jsxs("p", { className: "text-sm text-ink", "aria-live": "polite", "aria-atomic": "true", children: [_jsx("span", { className: "mr-2 rounded bg-surface-raised px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-ink-faint", children: player.index + 1 }), step.explain, step.done ? _jsx("span", { className: "ml-2 text-xs font-medium text-good", children: "done" }) : null] }) }), _jsx(PlayerControls, { index: player.index, total: steps.length, playing: player.playing, speed: player.speed, onToggle: player.toggle, onNext: player.next, onPrevious: player.previous, onReset: player.reset, onSpeed: player.setSpeed, onScrub: player.goTo })] }));
}
