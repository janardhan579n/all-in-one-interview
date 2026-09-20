import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as platform from '../services/platform';
import type { ProgressSnapshot } from '../types';

/**
 * Global UI state: theme, explanation mode, reduced motion, connection mode, and a cached
 * progress snapshot.
 *
 * Progress is held here rather than fetched per page so that completing a lesson updates the
 * sidebar ticks and the dashboard immediately, without every page re-fetching.
 */

export type ExplanationMode = 'beginner' | 'interview';
export type Theme = 'light' | 'dark';

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  explanationMode: ExplanationMode;
  setExplanationMode: (mode: ExplanationMode) => void;
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
  connection: platform.Mode | 'checking';
  /** Content language. 'en' is the source; everything else falls back to it per field. */
  language: string;
  setLanguage: (code: string) => void;
  /** UI string lookup. Falls back to the English string, then to the key itself. */
  t: (key: string, fallback?: string) => string;
  progress: ProgressSnapshot | null;
  refreshProgress: () => Promise<void>;
  isCompleted: (id: string) => boolean;
}

const AppStateContext = createContext<AppState | null>(null);

function readStored<T extends string>(key: string, fallback: T): T {
  try {
    return (window.localStorage.getItem(key) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or blocked storage — preferences simply do not persist.
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = readStored<Theme | ''>('dsa-theme', '' as Theme);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [explanationMode, setExplanationModeState] = useState<ExplanationMode>(() =>
    readStored<ExplanationMode>('dsa-explanation-mode', 'beginner'),
  );
  const [reduceMotion, setReduceMotionState] = useState<boolean>(
    () => readStored<string>('dsa-reduce-motion', 'false') === 'true',
  );
  const [connection, setConnection] = useState<platform.Mode | 'checking'>('checking');
  const [language, setLanguageState] = useState<string>(() => platform.storedLanguage());
  const [strings, setStrings] = useState<Record<string, string>>({});
  const [englishStrings, setEnglishStrings] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<ProgressSnapshot | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const refreshProgress = useCallback(async () => {
    try {
      setProgress(await platform.progress());
    } catch (error) {
      console.error('Could not load progress', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mode = await platform.detectMode();
      if (cancelled) return;
      setConnection(mode);
      platform.setLanguage(language);
      await refreshProgress();
    })();
    return () => {
      cancelled = true;
    };
    // Language is applied here only for the first load; the effect below handles changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshProgress]);

  /**
   * UI strings for the chosen language, plus English as the fallback layer.
   *
   * Both are loaded rather than only the chosen one, because a partially translated UI should
   * show English for the missing keys — never a raw key like "lesson.whySlow", which is what a
   * single-layer lookup produces the moment a translator misses a line.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [chosen, english] = await Promise.all([
        platform.uiStrings(language),
        language === 'en' ? Promise.resolve({}) : platform.uiStrings('en'),
      ]);
      if (cancelled) return;
      setStrings(chosen);
      setEnglishStrings(english);
      document.documentElement.setAttribute('lang', language);
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);

  const value = useMemo<AppState>(
    () => ({
      theme,
      setTheme: (next) => {
        setThemeState(next);
        store('dsa-theme', next);
      },
      explanationMode,
      setExplanationMode: (next) => {
        setExplanationModeState(next);
        store('dsa-explanation-mode', next);
      },
      reduceMotion,
      setReduceMotion: (next) => {
        setReduceMotionState(next);
        store('dsa-reduce-motion', String(next));
      },
      connection,
      language,
      setLanguage: (code: string) => {
        setLanguageState(code);
        platform.setLanguage(code);
      },
      t: (key: string, fallback?: string) => strings[key] ?? englishStrings[key] ?? fallback ?? key,
      progress,
      refreshProgress,
      isCompleted: (id: string) => progress?.lessons[id]?.status === 'completed',
    }),
    [theme, explanationMode, reduceMotion, connection, language, strings, englishStrings, progress, refreshProgress],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}

/** Small data-fetching helper: loading, error and data in one hook, with no dependency. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, reload: () => setNonce((value) => value + 1) };
}
