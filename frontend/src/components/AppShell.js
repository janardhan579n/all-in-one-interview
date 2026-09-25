import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../app/AppState';
import * as platform from '../services/platform';
const NAVIGATION = [
    { to: '/', label: 'Dashboard', icon: '🏠' },
    {
        to: '/dsa',
        label: 'DSA',
        icon: '🧠',
        children: [
            { to: '/dsa?kind=foundation', label: 'Foundations' },
            { to: '/dsa?kind=pattern', label: 'Patterns' },
            { to: '/dsa?kind=data-structure', label: 'Data Structures' },
            { to: '/pattern-map', label: 'Pattern Map' },
            { to: '/problems', label: 'Problems' },
        ],
    },
    {
        to: '/system-design',
        label: 'System Design',
        icon: '🏗',
        children: [
            { to: '/system-design', label: 'Concepts' },
            { to: '/system-design/case-studies', label: 'Case Studies' },
        ],
    },
    { to: '/practice', label: 'Pattern Practice', icon: '🧪' },
    {
        to: '/interview',
        label: 'Interview',
        icon: '🎤',
        children: [
            { to: '/interview/tracks', label: 'Question Banks' },
            { to: '/interview/drill', label: 'Mock Round' },
            { to: '/interview', label: 'Design Simulator' },
        ],
    },
    { to: '/progress', label: 'Progress', icon: '📊' },
    { to: '/bookmarks', label: 'Bookmarks & Notes', icon: '🔖' },
];
/**
 * Where this visitor's progress is being kept.
 *
 * This used to read "● offline", which named an internal mode and looked like a fault — and on
 * a static deploy it is stuck there permanently, because there is no backend to reach and never
 * will be. "Offline" also plainly contradicts the evidence: the page loaded over the internet.
 *
 * So it reports the consequence the visitor can act on instead. Either their progress is going
 * to a database on the machine running the API, or it is going to this browser and will not
 * follow them to another device without Progress → Export.
 */
function ConnectionBadge() {
    const { connection } = useAppState();
    if (connection === 'checking') {
        return _jsx("span", { className: "rounded-full bg-surface-sunken px-2 py-1 text-[11px] text-ink-faint", children: "connecting\u2026" });
    }
    if (connection === 'online') {
        return (_jsx("span", { className: "rounded-full bg-good/15 px-2 py-1 text-[11px] font-medium text-good", title: "Connected to the Spring Boot API \u2014 progress, notes and bookmarks are stored in its SQLite database.", children: "\u25CF backend" }));
    }
    return (_jsx("span", { className: "rounded-full bg-surface-sunken px-2 py-1 text-[11px] font-medium text-ink-muted", title: "No API server, which is normal for a published site: the whole library is bundled into the page. Your progress, notes and bookmarks live in this browser only \u2014 use Progress \u2192 Export to move them to another device.", children: "\u25CF saved in this browser" }));
}
function SearchBox() {
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState([]);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const boxRef = useRef(null);
    const inputRef = useRef(null);
    useEffect(() => {
        if (query.trim().length < 2) {
            setHits([]);
            return undefined;
        }
        // Debounced so typing does not fire a request (or an index scan) per keystroke.
        const timer = window.setTimeout(() => {
            void platform.search(query, 8).then(setHits).catch(() => setHits([]));
        }, 180);
        return () => window.clearTimeout(timer);
    }, [query]);
    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
            if (event.key === 'Escape')
                setOpen(false);
        };
        const onClick = (event) => {
            if (boxRef.current && !boxRef.current.contains(event.target))
                setOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('mousedown', onClick);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('mousedown', onClick);
        };
    }, []);
    const routeFor = (hit) => {
        switch (hit.type) {
            case 'problem': return `/problems/${hit.id}`;
            case 'concept': return `/system-design/${hit.id}`;
            case 'case-study': return `/system-design/case-studies/${hit.id}`;
            default: return `/dsa/${hit.id}`;
        }
    };
    return (_jsxs("div", { ref: boxRef, className: "relative w-full max-w-md", children: [_jsx("input", { ref: inputRef, type: "search", value: query, onChange: (event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                }, onFocus: () => setOpen(true), onKeyDown: (event) => {
                    if (event.key === 'Enter' && query.trim()) {
                        navigate(`/search?q=${encodeURIComponent(query)}`);
                        setOpen(false);
                    }
                }, placeholder: "Search patterns, problems, concepts\u2026   \u2318K", "aria-label": "Search the learning platform", className: "w-full rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none" }), open && hits.length > 0 ? (_jsxs("div", { className: "absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface-raised shadow-lg", children: [_jsx("ul", { children: hits.map((hit) => (_jsx("li", { children: _jsxs(Link, { to: routeFor(hit), onClick: () => {
                                    setOpen(false);
                                    setQuery('');
                                }, className: "block border-b border-line px-3 py-2 last:border-b-0 hover:bg-surface-sunken", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-ink", children: hit.title }), _jsx("span", { className: "rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] text-ink-faint", children: hit.type })] }), hit.snippet ? _jsx("p", { className: "mt-0.5 line-clamp-1 text-xs text-ink-muted", children: hit.snippet }) : null] }) }, hit.id))) }), _jsx(Link, { to: `/search?q=${encodeURIComponent(query)}`, onClick: () => setOpen(false), className: "block bg-surface-sunken px-3 py-2 text-center text-xs font-medium text-brand", children: "See all results" })] })) : null] }));
}
/**
 * Beginner ⇄ Interview.
 *
 * Only `LessonPage` and `ConceptPage` read `explanationMode` — 2 of 21 pages. Rendering the
 * toggle on the other 19 meant most clicks changed nothing visible, which is a good way to
 * teach someone that a control is decorative. Measured on the built site: the dashboard, the
 * problems index and a problem page were byte-identical in both modes.
 *
 * So it is shown where it does something and absent where it does not. The honest alternative
 * would be to extend dual explanations to problems, which is content work across 165 files
 * rather than a header fix.
 */
export function usesExplanationMode(pathname) {
    // /dsa/:id — a lesson. /dsa alone is the index, which has no dual content.
    if (/^\/dsa\/[^/]+$/.test(pathname))
        return true;
    // /system-design/:id — a concept. Case studies live under /system-design/case-studies/... and
    // do not carry a second register, so they are excluded by the segment count.
    if (/^\/system-design\/[^/]+$/.test(pathname) && !pathname.startsWith('/system-design/case-studies')) {
        return true;
    }
    return false;
}
function ModeToggle() {
    const { explanationMode, setExplanationMode } = useAppState();
    const { pathname } = useLocation();
    if (!usesExplanationMode(pathname))
        return null;
    return (_jsxs("div", { className: "flex overflow-hidden rounded-lg border border-line", role: "group", "aria-label": "Explanation depth", children: [_jsx("button", { type: "button", onClick: () => setExplanationMode('beginner'), "aria-pressed": explanationMode === 'beginner', title: "Plain language, no jargon \u2014 changes the analogy and explanations on this page", className: `px-2.5 py-1.5 text-xs font-medium transition-colors ${explanationMode === 'beginner' ? 'bg-brand text-white' : 'text-ink-muted hover:bg-surface-sunken'}`, children: "\uD83E\uDDD1 Beginner" }), _jsx("button", { type: "button", onClick: () => setExplanationMode('interview'), "aria-pressed": explanationMode === 'interview', title: "The language an interviewer expects \u2014 changes the analogy and explanations on this page", className: `px-2.5 py-1.5 text-xs font-medium transition-colors ${explanationMode === 'interview' ? 'bg-brand text-white' : 'text-ink-muted hover:bg-surface-sunken'}`, children: "\uD83D\uDC68\u200D\uD83D\uDCBB Interview" })] }));
}
/**
 * The language control.
 *
 * It lives in the header rather than inside the settings menu, because a learner who reads
 * Telugu should be able to see that Telugu exists without opening a menu to look for it — a
 * language switch hidden behind a gear icon is one nobody finds.
 *
 * Coverage is shown on every option that is not complete. A button that silently served English
 * would be a lie of omission; this way the choice is informed, and the gap is visible to anyone
 * who might fill it.
 */
function LanguagePicker() {
    const { language, setLanguage } = useAppState();
    const [options, setOptions] = useState([]);
    const [open, setOpen] = useState(false);
    const container = useRef(null);
    useEffect(() => {
        let cancelled = false;
        void platform.languages().then((rows) => {
            if (!cancelled)
                setOptions(rows);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    // Close on an outside click or Escape, the way any menu should behave.
    useEffect(() => {
        if (!open)
            return undefined;
        const onPointerDown = (event) => {
            if (!container.current?.contains(event.target))
                setOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);
    // One language means nothing to switch between; showing a menu of one is worse than nothing.
    if (options.length <= 1)
        return null;
    const current = options.find((option) => option.code === language) ?? options[0];
    return (_jsxs("div", { className: "relative", ref: container, children: [_jsxs("button", { type: "button", onClick: () => setOpen((value) => !value), "aria-expanded": open, "aria-haspopup": "menu", "aria-label": `Change language — currently ${current.name}`, className: `flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors sm:min-h-0 ${language === 'en'
                    ? 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink'
                    : 'border-brand bg-brand/10 text-brand'}`, children: [_jsx("span", { "aria-hidden": "true", children: "\uD83C\uDF10" }), _jsx("span", { className: "hidden sm:inline", children: current.nativeName })] }), open ? (_jsxs("div", { role: "menu", className: "absolute right-0 z-30 mt-1 w-60 rounded-lg border border-line bg-surface-raised p-2 shadow-lg", children: [_jsx("p", { className: "px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-faint", children: "Language" }), options.map((option) => {
                        const active = option.code === language;
                        const partial = !option.default && option.coveragePercent < 100;
                        return (_jsxs("button", { type: "button", role: "menuitemradio", "aria-checked": active, onClick: () => {
                                setLanguage(option.code);
                                setOpen(false);
                            }, className: `flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-sm transition-colors ${active ? 'bg-brand/10 text-brand' : 'text-ink hover:bg-surface-sunken'}`, children: [_jsxs("span", { children: [option.nativeName, option.nativeName !== option.name ? (_jsx("span", { className: "ml-1.5 text-xs text-ink-faint", children: option.name })) : null] }), partial ? (_jsxs("span", { className: "shrink-0 text-[11px] tabular-nums text-ink-faint", children: [option.coveragePercent, "%"] })) : null] }, option.code));
                    }), _jsx("p", { className: "mt-1.5 border-t border-line px-2 pt-1.5 text-[11px] leading-snug text-ink-faint", children: "Untranslated pages stay in English and say so. Technical terms stay in English everywhere." })] })) : null] }));
}
function Settings() {
    const { theme, setTheme, reduceMotion, setReduceMotion } = useAppState();
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", onClick: () => setOpen((value) => !value), className: "grid min-h-[44px] min-w-[44px] place-items-center rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken sm:min-h-0 sm:min-w-0", "aria-label": "Settings", "aria-expanded": open, children: "\u2699" }), open ? (_jsxs("div", { className: "absolute right-0 z-30 mt-1 w-64 rounded-lg border border-line bg-surface-raised p-3 shadow-lg", children: [_jsxs("button", { type: "button", onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'), className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-ink hover:bg-surface-sunken", children: [_jsx("span", { children: "Theme" }), _jsx("span", { className: "text-ink-muted", children: theme === 'dark' ? '🌙 Dark' : '☀ Light' })] }), _jsxs("label", { className: "mt-1 flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm text-ink hover:bg-surface-sunken", children: [_jsx("span", { children: "Reduce motion" }), _jsx("input", { type: "checkbox", checked: reduceMotion, onChange: (event) => setReduceMotion(event.target.checked), className: "accent-brand" })] }), _jsx("p", { className: "mt-2 border-t border-line px-2 pt-2 text-[11px] leading-snug text-ink-faint", children: "Animations also respect your system's reduced-motion setting automatically." })] })) : null] }));
}
export function AppShell({ children }) {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);
    // Below `lg` the nav was pushing into the same flex row as the page content instead of
    // covering it, which left `main` squeezed into a sliver and the page wider than the
    // viewport — the drawer needs to overlay the content, not share a row with it. Escape and a
    // click on the backdrop close it, matching how any other overlay on the site behaves.
    useEffect(() => {
        if (!mobileOpen)
            return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                setMobileOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [mobileOpen]);
    return (_jsxs("div", { className: "min-h-screen", children: [_jsx("a", { href: "#main", className: "skip-link", children: "Skip to content" }), _jsx("header", { className: "sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur", children: _jsxs("div", { className: "flex flex-wrap items-center gap-3 px-4 py-2.5", children: [_jsx("button", { type: "button", className: "grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line text-sm lg:hidden", onClick: () => setMobileOpen((value) => !value), "aria-label": "Toggle navigation", "aria-expanded": mobileOpen, children: "\u2630" }), _jsxs(Link, { to: "/", className: "flex shrink-0 items-center gap-2", children: [_jsx("span", { className: "grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm text-white", children: "\u25C6" }), _jsx("span", { className: "hidden text-sm font-semibold tracking-tight text-ink sm:block", children: "DSA & System Design" })] }), _jsx("div", { className: "order-last basis-full sm:order-none sm:mx-auto sm:min-w-0 sm:flex-1 sm:basis-auto sm:px-2", children: _jsx(SearchBox, {}) }), _jsxs("div", { className: "ml-auto flex items-center gap-2 sm:ml-0", children: [_jsx(ConnectionBadge, {}), _jsx("div", { className: "hidden sm:block", children: _jsx(ModeToggle, {}) }), _jsx(LanguagePicker, {}), _jsx(Settings, {})] })] }) }), _jsxs("div", { className: "mx-auto flex max-w-[1400px]", children: [mobileOpen ? (_jsx("div", { className: "fixed inset-0 z-30 bg-ink/40 lg:hidden", onClick: () => setMobileOpen(false), "aria-hidden": "true" })) : null, _jsxs("aside", { className: `${mobileOpen ? 'fixed inset-y-0 left-0 z-40 block w-[85vw] max-w-xs overflow-y-auto shadow-xl' : 'hidden'} shrink-0 border-r border-line bg-surface px-3 py-4 lg:static lg:z-auto lg:block lg:w-60 lg:max-w-none lg:shadow-none lg:overflow-visible`, children: [_jsx("nav", { "aria-label": "Main", children: _jsx("ul", { className: "space-y-0.5", children: NAVIGATION.map((item) => (_jsxs("li", { children: [_jsxs(NavLink, { to: item.to, end: item.to === '/', className: ({ isActive }) => `flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors lg:min-h-0 ${isActive ? 'bg-brand-soft font-medium text-brand' : 'text-ink-muted hover:bg-surface-sunken'}`, children: [_jsx("span", { "aria-hidden": "true", children: item.icon }), item.label] }), item.children ? (_jsx("ul", { className: "ml-6 mt-0.5 space-y-0.5 border-l border-line pl-3", children: item.children.map((child) => (_jsx("li", { children: _jsx(Link, { to: child.to, className: "flex min-h-[40px] items-center rounded px-2 py-1 text-[13px] text-ink-muted hover:text-ink lg:min-h-0", children: child.label }) }, child.to))) })) : null] }, item.to))) }) }), _jsx("div", { className: "mt-6 rounded-lg border border-line p-3 sm:hidden", children: _jsx(ModeToggle, {}) }), _jsx("p", { className: "mt-6 px-3 text-[11px] leading-snug text-ink-faint", children: "Understanding over memorisation. Every pattern starts with the problem it solves." })] }), _jsx("main", { id: "main", className: "min-w-0 flex-1 px-4 py-6 lg:px-8", children: children })] })] }));
}
