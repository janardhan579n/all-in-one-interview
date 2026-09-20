import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../app/AppState';
import * as platform from '../services/platform';
import type { SearchHit } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  children?: { to: string; label: string }[];
}

const NAVIGATION: NavItem[] = [
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

function ConnectionBadge() {
  const { connection } = useAppState();
  if (connection === 'checking') {
    return <span className="rounded-full bg-surface-sunken px-2 py-1 text-[11px] text-ink-faint">connecting…</span>;
  }
  if (connection === 'online') {
    return (
      <span
        className="rounded-full bg-good/15 px-2 py-1 text-[11px] font-medium text-good"
        title="Connected to the Spring Boot backend — progress is stored in SQLite"
      >
        ● backend
      </span>
    );
  }
  return (
    <span
      className="rounded-full bg-warn/15 px-2 py-1 text-[11px] font-medium text-warn"
      title="The backend is not reachable. Content is served from the bundle and progress is stored in this browser."
    >
      ● offline
    </span>
  );
}

function SearchBox() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onClick);
    };
  }, []);

  const routeFor = (hit: SearchHit) => {
    switch (hit.type) {
      case 'problem': return `/problems/${hit.id}`;
      case 'concept': return `/system-design/${hit.id}`;
      case 'case-study': return `/system-design/case-studies/${hit.id}`;
      default: return `/dsa/${hit.id}`;
    }
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
            setOpen(false);
          }
        }}
        placeholder="Search patterns, problems, concepts…   ⌘K"
        aria-label="Search the learning platform"
        className="w-full rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
      />

      {open && hits.length > 0 ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface-raised shadow-lg">
          <ul>
            {hits.map((hit) => (
              <li key={hit.id}>
                <Link
                  to={routeFor(hit)}
                  onClick={() => {
                    setOpen(false);
                    setQuery('');
                  }}
                  className="block border-b border-line px-3 py-2 last:border-b-0 hover:bg-surface-sunken"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{hit.title}</span>
                    <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] text-ink-faint">{hit.type}</span>
                  </div>
                  {hit.snippet ? <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{hit.snippet}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => setOpen(false)}
            className="block bg-surface-sunken px-3 py-2 text-center text-xs font-medium text-brand"
          >
            See all results
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function ModeToggle() {
  const { explanationMode, setExplanationMode } = useAppState();
  return (
    <div className="flex overflow-hidden rounded-lg border border-line" role="group" aria-label="Explanation depth">
      <button
        type="button"
        onClick={() => setExplanationMode('beginner')}
        aria-pressed={explanationMode === 'beginner'}
        title="Plain language, no jargon"
        className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
          explanationMode === 'beginner' ? 'bg-brand text-white' : 'text-ink-muted hover:bg-surface-sunken'
        }`}
      >
        🧑 Beginner
      </button>
      <button
        type="button"
        onClick={() => setExplanationMode('interview')}
        aria-pressed={explanationMode === 'interview'}
        title="Precise technical language, as you would use in an interview"
        className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
          explanationMode === 'interview' ? 'bg-brand text-white' : 'text-ink-muted hover:bg-surface-sunken'
        }`}
      >
        👨‍💻 Interview
      </button>
    </div>
  );
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
  const [options, setOptions] = useState<platform.LanguageSummary[]>([]);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void platform.languages().then((rows) => {
      if (!cancelled) setOptions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on an outside click or Escape, the way any menu should behave.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // One language means nothing to switch between; showing a menu of one is worse than nothing.
  if (options.length <= 1) return null;

  const current = options.find((option) => option.code === language) ?? options[0];

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        // The label must not depend on the visible text: the name collapses to just the globe
        // below the `sm` breakpoint, which would leave a screen reader with an unlabelled button.
        aria-label={`Change language — currently ${current.name}`}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
          language === 'en'
            ? 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink'
            : 'border-brand bg-brand/10 text-brand'
        }`}
      >
        <span aria-hidden="true">🌐</span>
        <span className="hidden sm:inline">{current.nativeName}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-60 rounded-lg border border-line bg-surface-raised p-2 shadow-lg"
        >
          <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
            Language
          </p>
          {options.map((option) => {
            const active = option.code === language;
            const partial = !option.default && option.coveragePercent < 100;
            return (
              <button
                key={option.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLanguage(option.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-sm transition-colors ${
                  active ? 'bg-brand/10 text-brand' : 'text-ink hover:bg-surface-sunken'
                }`}
              >
                <span>
                  {option.nativeName}
                  {option.nativeName !== option.name ? (
                    <span className="ml-1.5 text-xs text-ink-faint">{option.name}</span>
                  ) : null}
                </span>
                {partial ? (
                  <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">
                    {option.coveragePercent}%
                  </span>
                ) : null}
              </button>
            );
          })}
          <p className="mt-1.5 border-t border-line px-2 pt-1.5 text-[11px] leading-snug text-ink-faint">
            Untranslated pages stay in English and say so. Technical terms stay in English
            everywhere.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Settings() {
  const { theme, setTheme, reduceMotion, setReduceMotion } = useAppState();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken"
        aria-label="Settings"
        aria-expanded={open}
      >
        ⚙
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-lg border border-line bg-surface-raised p-3 shadow-lg">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-ink hover:bg-surface-sunken"
          >
            <span>Theme</span>
            <span className="text-ink-muted">{theme === 'dark' ? '🌙 Dark' : '☀ Light'}</span>
          </button>
          <label className="mt-1 flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm text-ink hover:bg-surface-sunken">
            <span>Reduce motion</span>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
              className="accent-brand"
            />
          </label>
          <p className="mt-2 border-t border-line px-2 pt-2 text-[11px] leading-snug text-ink-faint">
            Animations also respect your system's reduced-motion setting automatically.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            className="rounded-lg border border-line px-2 py-1.5 text-sm lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            ☰
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm text-white">◆</span>
            <span className="hidden text-sm font-semibold tracking-tight text-ink sm:block">
              DSA &amp; System Design
            </span>
          </Link>

          <div className="mx-auto flex-1 px-2">
            <SearchBox />
          </div>

          <div className="flex items-center gap-2">
            <ConnectionBadge />
            <div className="hidden sm:block">
              <ModeToggle />
            </div>
            <LanguagePicker />
            <Settings />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        <aside
          className={`${
            mobileOpen ? 'block' : 'hidden'
          } w-full shrink-0 border-r border-line px-3 py-4 lg:block lg:w-60`}
        >
          <nav aria-label="Main">
            <ul className="space-y-0.5">
              {NAVIGATION.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive ? 'bg-brand-soft font-medium text-brand' : 'text-ink-muted hover:bg-surface-sunken'
                      }`
                    }
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </NavLink>
                  {item.children ? (
                    <ul className="ml-6 mt-0.5 space-y-0.5 border-l border-line pl-3">
                      {item.children.map((child) => (
                        <li key={child.to}>
                          <Link
                            to={child.to}
                            className="block rounded px-2 py-1 text-[13px] text-ink-muted hover:text-ink"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-6 rounded-lg border border-line p-3 sm:hidden">
            <ModeToggle />
          </div>

          <p className="mt-6 px-3 text-[11px] leading-snug text-ink-faint">
            Understanding over memorisation. Every pattern starts with the problem it solves.
          </p>
        </aside>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
