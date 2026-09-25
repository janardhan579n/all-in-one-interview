/**
 * Progress storage for offline mode.
 *
 * Mirrors the backend's SQLite schema closely enough that the same export file works in both
 * modes, so a learner can start offline and later import into the backend without losing
 * anything. Every access is wrapped: localStorage throws in private windows and can come back
 * empty after a clear, and neither should break the app.
 */
const KEY = 'dsa-platform-progress-v1';
/**
 * A FUNCTION, not a shared constant.
 *
 * A `const EMPTY` spread with `{ ...EMPTY }` is only a shallow copy, so the nested `lessons`
 * and `attempts` objects would be shared — and the first write would mutate the template
 * itself, leaking data into every later "empty" store. Returning a fresh object each time is
 * the only safe form.
 */
function emptyStore() {
    return {
        lessons: {},
        attempts: [],
        quizzes: {},
        flags: {},
        notes: {},
        bookmarks: {},
        activeDays: [],
    };
}
/**
 * Fallback used only when localStorage itself is unavailable (private windows, blocked site
 * data). In the normal case every read goes to localStorage, deliberately: caching the store
 * in memory would go stale the moment another tab wrote to it or the user cleared site data.
 * The object is small, so parsing it per read costs nothing measurable.
 */
let memoryOnly = null;
export function read() {
    try {
        const raw = window.localStorage.getItem(KEY);
        if (raw === null)
            return memoryOnly ? structuredClone(memoryOnly) : emptyStore();
        return { ...emptyStore(), ...JSON.parse(raw) };
    }
    catch {
        return memoryOnly ? structuredClone(memoryOnly) : emptyStore();
    }
}
export function write(store) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(store));
        memoryOnly = null;
    }
    catch {
        // Storage blocked — hold it in memory so the session still works, but it will not persist.
        memoryOnly = store;
    }
}
export function replace(store) {
    write({ ...emptyStore(), ...store });
}
function today() {
    return new Date().toISOString().slice(0, 10);
}
export function touchActivity(store) {
    const day = today();
    if (!store.activeDays.includes(day)) {
        store.activeDays = [...store.activeDays, day].sort().reverse();
    }
}
/** Consecutive days ending today or yesterday — yesterday still counts, today is not over. */
export function streak(days) {
    if (days.length === 0)
        return 0;
    const set = new Set(days);
    const cursor = new Date();
    const iso = (date) => date.toISOString().slice(0, 10);
    if (!set.has(iso(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
        if (!set.has(iso(cursor)))
            return 0;
    }
    let count = 0;
    while (set.has(iso(cursor))) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return count;
}
export function snapshot() {
    const store = read();
    const problems = {};
    for (const attempt of store.attempts) {
        const existing = problems[attempt.problemId] ?? { attempts: 0, solved: false };
        problems[attempt.problemId] = {
            attempts: existing.attempts + 1,
            solved: existing.solved || attempt.solved,
            lastAttempt: attempt.attemptedAt,
        };
    }
    return {
        lessons: Object.fromEntries(Object.entries(store.lessons).map(([id, row]) => [
            id,
            { status: row.status, percent: row.percent, updatedAt: row.updatedAt },
        ])),
        problems,
        quizzes: Object.entries(store.quizzes).map(([contentId, row]) => ({ contentId, ...row })),
        flags: store.flags,
        streak: streak(store.activeDays),
    };
}
export function updateLesson(contentId, contentType, status, percent) {
    const store = read();
    const existing = store.lessons[contentId];
    let resolvedStatus = status;
    let resolvedPercent = percent ?? (status === 'completed' ? 100 : 0);
    if (existing) {
        resolvedPercent = Math.max(existing.percent, resolvedPercent);
        // Progress never moves backwards: a late scroll update must not undo a completion.
        if (existing.status === 'completed' && status !== 'completed') {
            resolvedStatus = 'completed';
            resolvedPercent = 100;
        }
    }
    store.lessons[contentId] = {
        status: resolvedStatus,
        percent: Math.max(0, Math.min(100, resolvedPercent)),
        contentType,
        updatedAt: new Date().toISOString(),
    };
    touchActivity(store);
    write(store);
}
export function recordAttempt(problemId, patternId, solved, confidence) {
    const store = read();
    store.attempts = [
        ...store.attempts,
        { problemId, patternId, solved, confidence, attemptedAt: new Date().toISOString() },
    ];
    touchActivity(store);
    write(store);
}
export function recordQuiz(contentId, score, total) {
    const store = read();
    const existing = store.quizzes[contentId];
    store.quizzes[contentId] = {
        bestScore: Math.max(existing?.bestScore ?? 0, score),
        total,
        attempts: (existing?.attempts ?? 0) + 1,
        lastTaken: new Date().toISOString(),
    };
    touchActivity(store);
    write(store);
}
export function setFlags(contentId, difficult, mastered) {
    const store = read();
    store.flags[contentId] = { difficult, mastered };
    write(store);
}
export function saveNote(contentId, body) {
    const store = read();
    if (body.trim().length === 0)
        delete store.notes[contentId];
    else
        store.notes[contentId] = { body, updatedAt: new Date().toISOString() };
    write(store);
}
export function toggleBookmark(contentId, on) {
    const store = read();
    if (on)
        store.bookmarks[contentId] = new Date().toISOString();
    else
        delete store.bookmarks[contentId];
    write(store);
}
