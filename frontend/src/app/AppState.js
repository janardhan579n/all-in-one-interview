import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as platform from '../services/platform';
const AppStateContext = createContext(null);
function readStored(key, fallback) {
    try {
        return window.localStorage.getItem(key) ?? fallback;
    }
    catch {
        return fallback;
    }
}
function store(key, value) {
    try {
        window.localStorage.setItem(key, value);
    }
    catch {
        // Private browsing or blocked storage — preferences simply do not persist.
    }
}
export function AppStateProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        const stored = readStored('dsa-theme', '');
        if (stored === 'light' || stored === 'dark')
            return stored;
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });
    const [explanationMode, setExplanationModeState] = useState(() => readStored('dsa-explanation-mode', 'beginner'));
    const [reduceMotion, setReduceMotionState] = useState(() => readStored('dsa-reduce-motion', 'false') === 'true');
    const [connection, setConnection] = useState('checking');
    const [language, setLanguageState] = useState(() => platform.storedLanguage());
    const [strings, setStrings] = useState({});
    const [englishStrings, setEnglishStrings] = useState({});
    const [progress, setProgress] = useState(null);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);
    useEffect(() => {
        document.documentElement.classList.toggle('reduce-motion', reduceMotion);
    }, [reduceMotion]);
    const refreshProgress = useCallback(async () => {
        try {
            setProgress(await platform.progress());
        }
        catch (error) {
            console.error('Could not load progress', error);
        }
    }, []);
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const mode = await platform.detectMode();
            if (cancelled)
                return;
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
            if (cancelled)
                return;
            setStrings(chosen);
            setEnglishStrings(english);
            document.documentElement.setAttribute('lang', language);
        })();
        return () => {
            cancelled = true;
        };
    }, [language]);
    const value = useMemo(() => ({
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
        setLanguage: (code) => {
            setLanguageState(code);
            platform.setLanguage(code);
        },
        t: (key, fallback) => strings[key] ?? englishStrings[key] ?? fallback ?? key,
        progress,
        refreshProgress,
        isCompleted: (id) => progress?.lessons[id]?.status === 'completed',
    }), [theme, explanationMode, reduceMotion, connection, language, strings, englishStrings, progress, refreshProgress]);
    return _jsx(AppStateContext.Provider, { value: value, children: children });
}
export function useAppState() {
    const context = useContext(AppStateContext);
    if (!context)
        throw new Error('useAppState must be used inside AppStateProvider');
    return context;
}
/** Small data-fetching helper: loading, error and data in one hook, with no dependency. */
export function useAsync(loader, deps) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nonce, setNonce] = useState(0);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        loader()
            .then((result) => {
            if (!cancelled)
                setData(result);
        })
            .catch((cause) => {
            if (!cancelled)
                setError(cause instanceof Error ? cause.message : String(cause));
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, nonce]);
    return { data, error, loading, reload: () => setNonce((value) => value + 1) };
}
