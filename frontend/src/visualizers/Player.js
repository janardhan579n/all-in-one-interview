import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
/**
 * The only component that owns time.
 *
 * Because every visualisation is a Step[], playback, stepping, speed and reduced-motion are
 * implemented once here rather than in each of the 40+ engines (ADR-004).
 */
const SPEEDS = [0.5, 1, 2];
const BASE_INTERVAL_MS = 1100;
export function usePlayer(totalSteps) {
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const timer = useRef(null);
    const clamp = useCallback((value) => Math.max(0, Math.min(value, totalSteps - 1)), [totalSteps]);
    const goTo = useCallback((value) => setIndex(clamp(value)), [clamp]);
    const next = useCallback(() => setIndex((current) => clamp(current + 1)), [clamp]);
    const previous = useCallback(() => setIndex((current) => clamp(current - 1)), [clamp]);
    const reset = useCallback(() => {
        setPlaying(false);
        setIndex(0);
    }, []);
    const toggle = useCallback(() => {
        setPlaying((current) => {
            // Pressing play at the end restarts rather than doing nothing.
            if (!current && index >= totalSteps - 1)
                setIndex(0);
            return !current;
        });
    }, [index, totalSteps]);
    // Reset when the step list itself changes (a different visualisation or input).
    useEffect(() => {
        setIndex(0);
        setPlaying(false);
    }, [totalSteps]);
    useEffect(() => {
        if (!playing)
            return undefined;
        if (index >= totalSteps - 1) {
            setPlaying(false);
            return undefined;
        }
        timer.current = window.setTimeout(() => {
            setIndex((current) => Math.min(current + 1, totalSteps - 1));
        }, BASE_INTERVAL_MS / speed);
        return () => {
            if (timer.current)
                window.clearTimeout(timer.current);
        };
    }, [playing, index, speed, totalSteps]);
    return { index, playing, speed, setSpeed, goTo, next, previous, reset, toggle };
}
export function PlayerControls({ index, total, playing, speed, onToggle, onNext, onPrevious, onReset, onSpeed, onScrub, }) {
    const atEnd = index >= total - 1;
    return (_jsxs("div", { className: "flex flex-wrap items-center gap-3 border-t border-line px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { type: "button", onClick: onReset, className: "rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand", "aria-label": "Reset to the first step", title: "Reset (R)", children: "\u27F2" }), _jsx("button", { type: "button", onClick: onPrevious, disabled: index === 0, className: "rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand", "aria-label": "Previous step", title: "Previous (\u2190)", children: "\u23EE" }), _jsx("button", { type: "button", onClick: onToggle, className: "rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand", "aria-label": playing ? 'Pause' : atEnd ? 'Replay' : 'Play', title: "Play/pause (Space)", children: playing ? '⏸ Pause' : atEnd ? '⟲ Replay' : '▶ Play' }), _jsx("button", { type: "button", onClick: onNext, disabled: atEnd, className: "rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand", "aria-label": "Next step", title: "Next (\u2192)", children: "\u23ED" })] }), _jsxs("label", { className: "flex min-w-[180px] flex-1 items-center gap-2", children: [_jsx("span", { className: "sr-only", children: "Step position" }), _jsx("input", { type: "range", min: 0, max: Math.max(0, total - 1), value: index, onChange: (event) => onScrub(Number(event.target.value)), className: "h-1 w-full cursor-pointer appearance-none rounded bg-line accent-brand", "aria-label": `Step ${index + 1} of ${total}` })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "whitespace-nowrap text-xs tabular-nums text-ink-faint", children: [index + 1, " / ", total] }), _jsx("div", { className: "flex overflow-hidden rounded-lg border border-line", role: "group", "aria-label": "Animation speed", children: SPEEDS.map((value) => (_jsxs("button", { type: "button", onClick: () => onSpeed(value), "aria-pressed": speed === value, className: `px-2 py-1 text-xs transition-colors ${speed === value ? 'bg-brand text-white' : 'text-ink-muted hover:bg-surface-sunken'}`, children: [value, "\u00D7"] }, value))) })] })] }));
}
/** Keyboard shortcuts, active while the visualisation container has focus. */
export function usePlayerShortcuts(container, handlers) {
    useEffect(() => {
        const node = container.current;
        if (!node)
            return undefined;
        const onKeyDown = (event) => {
            const target = event.target;
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
                return;
            switch (event.key) {
                case ' ':
                    event.preventDefault();
                    handlers.onToggle();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    handlers.onNext();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    handlers.onPrevious();
                    break;
                case 'r':
                case 'R':
                    handlers.onReset();
                    break;
                default:
                    break;
            }
        };
        node.addEventListener('keydown', onKeyDown);
        return () => node.removeEventListener('keydown', onKeyDown);
    }, [container, handlers]);
}
