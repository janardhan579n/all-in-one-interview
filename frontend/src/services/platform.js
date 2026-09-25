import * as local from './localProgress';
/**
 * The offline content bundle is loaded LAZILY, and only when a call actually needs it.
 *
 * It is roughly 400 kB of JSON: pulling it into the initial chunk would make every online
 * session pay for content it will fetch from the API anyway (§39 — do not load the entire
 * content library on startup). `ensureBundle` is called at the top of any function that can
 * fall back, and does nothing at all in online mode.
 */
let bundle = undefined;
async function ensureBundle() {
    if (!bundle) {
        bundle = await import('./bundle');
    }
}
let mode = 'offline';
let detected = false;
const DIFFICULTY_ORDER = ['beginner', 'intermediate', 'advanced'];
async function request(path, init) {
    const response = await fetch(`/api${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`API ${response.status} for ${path}: ${body.slice(0, 200)}`);
    }
    if (response.status === 204)
        return undefined;
    return (await response.json());
}
export async function detectMode() {
    if (detected)
        return mode;
    detected = true;
    try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 2500);
        const response = await fetch('/api/health', { signal: controller.signal });
        window.clearTimeout(timeout);
        // A 200 is not enough. When the app is served by a static host with SPA fallback
        // (try_files, or `vite preview`), /api/health returns index.html with status 200 — and
        // trusting that puts the app in online mode, where every call then fails on HTML that is
        // not JSON. Insist on a JSON body that actually looks like our health response.
        if (!response.ok) {
            mode = 'offline';
        }
        else {
            const body = await response.json().catch(() => null);
            const healthy = body !== null &&
                typeof body === 'object' &&
                body.status === 'UP';
            mode = healthy ? 'online' : 'offline';
        }
    }
    catch {
        mode = 'offline';
    }
    return mode;
}
export function getMode() {
    return mode;
}
/** Forces offline mode — used by tests and by the "work offline" toggle. */
export function setMode(value) {
    mode = value;
    detected = true;
}
// --------------------------------------------------------------------- content
export async function stats() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/meta/stats');
    return bundle.stats;
}
export async function lessons(filters = {}) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        const query = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== '')
                query.set(key, String(value));
        });
        const suffix = query.toString();
        return request(withLanguage(`/dsa/lessons${suffix ? `?${suffix}` : ''}`));
    }
    return [...bundle.lessons.values()]
        .filter((lesson) => (filters.kind ? lesson.kind === filters.kind : true))
        .filter((lesson) => (filters.level !== undefined ? lesson.level === filters.level : true))
        .filter((lesson) => (filters.group ? lesson.group === filters.group : true))
        .filter((lesson) => (filters.tag ? (lesson.tags ?? []).includes(filters.tag) : true))
        .sort((a, b) => a.level - b.level)
        // Localise before summarising so a translated title reaches the list screen too.
        .map((lesson) => bundle.summarise(bundle.localise(lesson, language), 'lesson'));
}
export async function lesson(id) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(withLanguage(`/dsa/lessons/${id}`));
    const found = bundle.lessons.get(id);
    if (!found)
        throw new Error(`No lesson with id '${id}'`);
    return bundle.localise(found, language);
}
export async function dsaGroups() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/dsa/groups');
    const byGroup = new Map();
    for (const item of bundle.lessons.values()) {
        const list = byGroup.get(item.group) ?? [];
        list.push(bundle.summarise(item, 'lesson'));
        byGroup.set(item.group, list);
    }
    return [...byGroup.entries()].map(([group, items]) => ({
        group,
        lessons: items.sort((a, b) => (a.level ?? 0) - (b.level ?? 0)),
    }));
}
export async function patternMap() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/dsa/pattern-map');
    if (!bundle.patternMap)
        throw new Error('Pattern map is missing from the content bundle');
    return bundle.patternMap;
}
export async function problems(filters = {}) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        const query = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value)
                query.set(key, value);
        });
        const suffix = query.toString();
        return request(`/problems${suffix ? `?${suffix}` : ''}`);
    }
    const needle = filters.q?.toLowerCase();
    return [...bundle.problems.values()]
        .filter((problem) => (filters.patternId ? problem.patternId === filters.patternId : true))
        .filter((problem) => (filters.difficulty ? problem.difficulty === filters.difficulty : true))
        .filter((problem) => needle
        ? problem.title.toLowerCase().includes(needle) || problem.statement.toLowerCase().includes(needle)
        : true)
        .sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty) ||
        a.title.localeCompare(b.title))
        .map((problem) => bundle.summarise(problem, 'problem'));
}
export async function problem(id) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(`/problems/${id}`);
    const found = bundle.problems.get(id);
    if (!found)
        throw new Error(`No problem with id '${id}'`);
    return found;
}
export async function problemsByPattern() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/problems/by-pattern');
    const grouped = new Map();
    for (const item of bundle.problems.values()) {
        const patternId = item.patternId ?? 'unclassified';
        const tier = grouped.get(patternId) ?? new Map();
        const list = tier.get(item.difficulty) ?? [];
        list.push(bundle.summarise(item, 'problem'));
        tier.set(item.difficulty, list);
        grouped.set(patternId, tier);
    }
    return [...grouped.entries()].map(([patternId, tiers]) => {
        const pattern = bundle.lessons.get(patternId);
        return {
            patternId,
            patternTitle: pattern?.title ?? patternId,
            group: pattern?.group ?? '',
            tiers: DIFFICULTY_ORDER.filter((difficulty) => (tiers.get(difficulty) ?? []).length > 0).map((difficulty) => ({
                difficulty,
                problems: tiers.get(difficulty),
            })),
        };
    });
}
export async function dailyProblem() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/problems/daily');
    const all = [...bundle.problems.values()].sort((a, b) => a.id.localeCompare(b.id));
    const day = Math.floor(Date.now() / 86_400_000);
    // Same multiplier as the backend so both modes pick the same problem on a given day.
    const index = Math.abs((day * 2654435761) % all.length);
    return bundle.summarise(all[index], 'problem');
}
export async function concepts(group) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        return request(`/system-design/concepts${group ? `?group=${encodeURIComponent(group)}` : ''}`);
    }
    const order = ['Foundations', 'Performance', 'Data', 'Reliability', 'Distributed'];
    return [...bundle.concepts.values()]
        .filter((concept) => (group ? concept.group === group : true))
        .sort((a, b) => {
        const rank = order.indexOf(a.group) - order.indexOf(b.group);
        return rank !== 0 ? rank : a.level - b.level;
    })
        .map((concept) => bundle.summarise(concept, 'concept'));
}
export async function concept(id) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(withLanguage(`/system-design/concepts/${id}`));
    const found = bundle.concepts.get(id);
    if (!found)
        throw new Error(`No concept with id '${id}'`);
    return bundle.localise(found, language);
}
export async function caseStudies() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/system-design/case-studies');
    return [...bundle.caseStudies.values()].map((study) => bundle.summarise(study, 'case-study'));
}
export async function caseStudy(id) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(withLanguage(`/system-design/case-studies/${id}`));
    const found = bundle.caseStudies.get(id);
    if (!found)
        throw new Error(`No case study with id '${id}'`);
    return bundle.localise(found, language);
}
export async function decisionTree(id) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(`/decision-trees/${id}`);
    const found = bundle.decisionTrees.get(id);
    if (!found)
        throw new Error(`No decision tree with id '${id}'`);
    return found;
}
// --------------------------------------------------------------- learning paths
export async function paths() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        return request('/learning/paths');
    }
    return [...bundle.paths.values()].map((path) => ({
        id: path.id,
        title: path.title,
        audience: path.audience,
        description: path.description,
        steps: path.steps.length,
    }));
}
export async function path(id) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(`/learning/paths/${id}`);
    const found = bundle.paths.get(id);
    if (!found)
        throw new Error(`No learning path with id '${id}'`);
    const progress = local.snapshot();
    const steps = found.steps.map((step) => {
        const document = bundle.anyById(step.ref);
        const record = document;
        return {
            ref: step.ref,
            kind: step.kind,
            title: document?.title ?? step.ref,
            summary: record?.summary ?? '',
            estimatedMinutes: record?.estimatedMinutes ?? 0,
            status: (progress.lessons[step.ref]?.status ?? 'not_started'),
            missing: !document,
        };
    });
    const completed = steps.filter((step) => step.status === 'completed').length;
    return {
        id: found.id,
        title: found.title,
        audience: found.audience,
        description: found.description,
        steps,
        completed,
        total: steps.length,
        percent: steps.length === 0 ? 0 : Math.round((100 * completed) / steps.length),
    };
}
export async function nextUp() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        return request('/learning/next');
    }
    const progress = local.snapshot();
    for (const [id, row] of Object.entries(progress.lessons)) {
        if (row.status === 'in_progress') {
            const document = bundle.anyById(id);
            if (document) {
                return {
                    lessonId: id,
                    type: bundle.typeOf(id),
                    title: document.title,
                    summary: document.summary ?? '',
                    reason: `You're ${row.percent}% through this — finishing what you start beats starting something new.`,
                };
            }
        }
    }
    const beginner = bundle.paths.get('java-dsa-beginner');
    if (beginner) {
        for (const step of beginner.steps) {
            if (progress.lessons[step.ref]?.status !== 'completed') {
                const document = bundle.anyById(step.ref);
                if (document) {
                    return {
                        lessonId: step.ref,
                        type: bundle.typeOf(step.ref),
                        title: document.title,
                        summary: document.summary ?? '',
                        reason: 'Next step on the Java + DSA path.',
                    };
                }
            }
        }
    }
    return { lessonId: '', reason: "You've completed everything here. Try the interview simulator or revisit your weak areas." };
}
// ------------------------------------------------------------------- progress
export async function progress() {
    if (mode === 'online')
        return request('/progress');
    return local.snapshot();
}
export async function progressSummary() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/progress/summary');
    const snapshot = local.snapshot();
    const store = local.read();
    const completedOf = (type) => Object.entries(snapshot.lessons).filter(([id, row]) => row.status === 'completed' && bundle.typeOf(id) === type).length;
    const dsaDone = completedOf('lesson');
    const sdDone = completedOf('concept') + completedOf('case-study');
    const sdTotal = bundle.concepts.size + bundle.caseStudies.size;
    const patternsTotal = [...bundle.lessons.values()].filter((item) => item.kind === 'pattern').length;
    const patternsDone = Object.entries(snapshot.lessons).filter(([id, row]) => row.status === 'completed' && bundle.lessons.get(id)?.kind === 'pattern').length;
    const solved = new Set(store.attempts.filter((attempt) => attempt.solved).map((attempt) => attempt.problemId)).size;
    const byPattern = new Map();
    for (const attempt of store.attempts) {
        if (!attempt.patternId)
            continue;
        const entry = byPattern.get(attempt.patternId) ?? { attempts: 0, solved: 0 };
        entry.attempts += 1;
        if (attempt.solved)
            entry.solved += 1;
        byPattern.set(attempt.patternId, entry);
    }
    const weakAreas = [...byPattern.entries()]
        .filter(([, entry]) => entry.attempts >= 2 && entry.solved / entry.attempts < 0.6)
        .map(([patternId, entry]) => ({
        patternId,
        title: bundle.lessons.get(patternId)?.title ?? patternId,
        attempts: entry.attempts,
        solved: entry.solved,
        solveRate: Math.round((100 * entry.solved) / entry.attempts),
    }))
        .sort((a, b) => a.solveRate - b.solveRate);
    const recent = Object.entries(store.lessons)
        .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt))
        .slice(0, 6)
        .flatMap(([id, row]) => {
        const document = bundle.anyById(id);
        if (!document)
            return [];
        return [{ id, type: row.contentType, title: document.title, status: row.status, percent: row.percent, updatedAt: row.updatedAt }];
    });
    const lessonScore = bundle.lessons.size === 0 ? 0 : dsaDone / bundle.lessons.size;
    const designScore = sdTotal === 0 ? 0 : sdDone / sdTotal;
    const problemScore = Math.min(1, solved / Math.min(bundle.problems.size, 25));
    const score = Math.round(100 * (0.3 * lessonScore + 0.3 * designScore + 0.4 * problemScore));
    const band = score >= 80 ? 'Interview ready' : score >= 55 ? 'Nearly there' : score >= 25 ? 'Building foundations' : 'Just getting started';
    const bar = (done, total) => ({
        completed: done,
        total,
        percent: total === 0 ? 0 : Math.round((100 * done) / total),
    });
    return {
        dsa: bar(dsaDone, bundle.lessons.size),
        systemDesign: bar(sdDone, sdTotal),
        patterns: bar(patternsDone, patternsTotal),
        problemsSolved: solved,
        problemsTotal: bundle.problems.size,
        caseStudiesCompleted: completedOf('case-study'),
        streak: snapshot.streak,
        activeDays: store.activeDays.length,
        weakAreas,
        recent,
        readiness: {
            score,
            band,
            breakdown: {
                dsaLessons: Math.round(lessonScore * 100),
                systemDesign: Math.round(designScore * 100),
                problemPractice: Math.round(problemScore * 100),
            },
        },
    };
}
export async function updateLessonProgress(contentId, status, percent) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        await request(`/progress/lessons/${contentId}`, {
            method: 'PUT',
            body: JSON.stringify({ status, percent }),
        });
        return;
    }
    local.updateLesson(contentId, bundle.typeOf(contentId), status, percent);
}
export async function recordAttempt(problemId, solved, confidence) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        await request(`/progress/problems/${problemId}/attempt`, {
            method: 'POST',
            body: JSON.stringify({ solved, confidence }),
        });
        return;
    }
    local.recordAttempt(problemId, bundle.problems.get(problemId)?.patternId, solved, confidence);
}
export async function setFlags(contentId, difficult, mastered) {
    if (mode === 'online') {
        await request(`/progress/flags/${contentId}`, {
            method: 'PUT',
            body: JSON.stringify({ difficult, mastered }),
        });
        return;
    }
    local.setFlags(contentId, difficult, mastered);
}
// ----------------------------------------------------------------------- quiz
export async function quizQuestions(contentId) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(`/quiz/${contentId}`);
    const document = bundle.anyById(contentId);
    return (document?.quiz ?? []).map(({ answerIndex: _answer, explanation: _explanation, ...rest }) => rest);
}
export async function evaluateQuiz(contentId, answers) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        return request(`/quiz/${contentId}/evaluate`, {
            method: 'POST',
            body: JSON.stringify({ answers }),
        });
    }
    const document = bundle.anyById(contentId);
    const quiz = document?.quiz ?? [];
    const results = quiz.map((question) => {
        const given = answers[question.id];
        return {
            questionId: question.id,
            given: given ?? null,
            correctIndex: question.answerIndex ?? -1,
            correct: given !== undefined && given === question.answerIndex,
            explanation: question.explanation ?? '',
        };
    });
    const score = results.filter((result) => result.correct).length;
    local.recordQuiz(contentId, score, quiz.length);
    return {
        contentId,
        score,
        total: quiz.length,
        percent: quiz.length === 0 ? 0 : Math.round((100 * score) / quiz.length),
        passed: quiz.length > 0 && (100 * score) / quiz.length >= 70,
        results,
    };
}
// -------------------------------------------------------------------- practice
export async function practiceQuestions(count) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(`/practice/pattern-recognition?count=${count}`);
    const shuffled = [...bundle.practiceQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(({ answer: _a, explanation: _e, signals: _s, ...rest }) => rest);
}
export async function evaluatePractice(answers) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        return request('/practice/pattern-recognition/evaluate', {
            method: 'POST',
            body: JSON.stringify({ answers }),
        });
    }
    const results = bundle.practiceQuestions
        .filter((question) => answers[question.id] !== undefined)
        .map((question) => ({
        id: question.id,
        given: answers[question.id],
        answer: question.answer ?? '',
        correct: answers[question.id] === question.answer,
        signals: question.signals ?? [],
        explanation: question.explanation ?? '',
    }));
    const score = results.filter((result) => result.correct).length;
    return {
        score,
        total: results.length,
        percent: results.length === 0 ? 0 : Math.round((100 * score) / results.length),
        results,
    };
}
// ---------------------------------------------------------------------- search
const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'of', 'to', 'in', 'and', 'or', 'for', 'on', 'it', 'with']);
export async function search(query, limit = 20) {
    if (mode !== 'online')
        await ensureBundle();
    if (!query.trim())
        return [];
    if (mode === 'online') {
        return request(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    }
    const tokens = query
        .toLowerCase()
        .split(/[^a-z0-9+#]+/)
        .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
    if (tokens.length === 0)
        return [];
    const documents = [];
    const add = (items, type) => {
        for (const item of items) {
            const summary = bundle.summarise(item, type);
            documents.push({
                summary,
                title: item.title.toLowerCase(),
                haystack: JSON.stringify(item).toLowerCase(),
            });
        }
    };
    add(bundle.lessons.values(), 'lesson');
    add(bundle.problems.values(), 'problem');
    add(bundle.concepts.values(), 'concept');
    add(bundle.caseStudies.values(), 'case-study');
    return documents
        .map((document) => {
        let score = 0;
        for (const token of tokens) {
            if (document.title.includes(token))
                score += 20;
            else if ((document.summary.group ?? '').toLowerCase().includes(token))
                score += 8;
            else if ((document.summary.summary ?? '').toLowerCase().includes(token))
                score += 6;
            else if (document.haystack.includes(token))
                score += 1;
            else
                return null; // AND semantics, matching the backend
        }
        return { ...document.summary, score };
    })
        .filter((hit) => hit !== null)
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
        .slice(0, limit)
        .map((hit) => ({
        id: hit.id,
        type: hit.type,
        title: hit.title,
        group: hit.group,
        snippet: hit.summary ?? '',
        score: hit.score,
    }));
}
export async function notes() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/notes');
    const store = local.read();
    return Object.entries(store.notes).map(([contentId, row]) => ({
        contentId,
        body: row.body,
        updatedAt: row.updatedAt,
        title: bundle.anyById(contentId)?.title ?? contentId,
        contentType: bundle.typeOf(contentId),
        missing: !bundle.anyById(contentId),
    }));
}
export async function note(contentId) {
    if (mode === 'online') {
        const row = await request(`/notes/${contentId}`);
        return row.body;
    }
    return local.read().notes[contentId]?.body ?? '';
}
export async function saveNote(contentId, body) {
    if (mode === 'online') {
        await request(`/notes/${contentId}`, { method: 'PUT', body: JSON.stringify({ body }) });
        return;
    }
    local.saveNote(contentId, body);
}
export async function bookmarks() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/bookmarks');
    const store = local.read();
    return Object.entries(store.bookmarks).map(([contentId, createdAt]) => ({
        contentId,
        createdAt,
        title: bundle.anyById(contentId)?.title ?? contentId,
        contentType: bundle.typeOf(contentId),
        missing: !bundle.anyById(contentId),
    }));
}
export async function toggleBookmark(contentId, on) {
    if (mode === 'online') {
        await request(`/bookmarks/${contentId}`, { method: on ? 'POST' : 'DELETE' });
        return;
    }
    local.toggleBookmark(contentId, on);
}
// ------------------------------------------------------------- export / import
/** The export payload as text. Split out from `exportProgress` so it is directly testable. */
export async function exportProgressJson() {
    if (mode === 'online') {
        const response = await fetch('/api/progress/export');
        if (!response.ok)
            throw new Error('Export failed');
        return response.text();
    }
    const store = local.read();
    const payload = {
        version: '1',
        exportedAt: new Date().toISOString(),
        lessons: Object.entries(store.lessons).map(([contentId, row]) => ({ contentId, ...row })),
        attempts: store.attempts.map((attempt) => ({
            problem_id: attempt.problemId,
            pattern_id: attempt.patternId,
            solved: attempt.solved ? 1 : 0,
            confidence: attempt.confidence,
            attempted_at: attempt.attemptedAt,
        })),
        quizzes: Object.entries(store.quizzes).map(([contentId, row]) => ({ contentId, ...row })),
        notes: Object.entries(store.notes).map(([contentId, row]) => ({ contentId, ...row })),
        bookmarks: Object.entries(store.bookmarks).map(([contentId, createdAt]) => ({ contentId, createdAt })),
        flags: store.flags,
        activeDays: store.activeDays,
    };
    return JSON.stringify(payload, null, 2);
}
export async function exportProgress() {
    return new Blob([await exportProgressJson()], { type: 'application/json' });
}
export async function importProgress(text) {
    if (mode !== 'online')
        await ensureBundle();
    const payload = JSON.parse(text);
    if (payload.version !== '1') {
        throw new Error(`Unsupported export version '${String(payload.version)}'. This build reads version 1.`);
    }
    if (mode === 'online') {
        await request('/progress/import', { method: 'POST', body: text });
        return;
    }
    const lessonsIn = (payload.lessons ?? []);
    const attemptsIn = (payload.attempts ?? []);
    const notesIn = (payload.notes ?? []);
    const bookmarksIn = (payload.bookmarks ?? []);
    local.replace({
        lessons: Object.fromEntries(lessonsIn.map((row) => [
            row.contentId,
            {
                status: row.status,
                percent: row.percent,
                contentType: row.contentType ?? bundle.typeOf(row.contentId),
                updatedAt: row.updatedAt ?? new Date().toISOString(),
            },
        ])),
        attempts: attemptsIn.map((row) => ({
            problemId: row.problem_id,
            patternId: row.pattern_id,
            solved: row.solved === 1,
            confidence: row.confidence,
            attemptedAt: row.attempted_at,
        })),
        quizzes: Object.fromEntries((payload.quizzes ?? []).map(({ contentId, ...rest }) => [contentId, rest])),
        flags: (payload.flags ?? {}),
        notes: Object.fromEntries(notesIn.map((row) => [row.contentId, { body: row.body, updatedAt: row.updatedAt ?? new Date().toISOString() }])),
        bookmarks: Object.fromEntries(bookmarksIn.map((row) => [row.contentId, row.createdAt ?? new Date().toISOString()])),
        activeDays: (payload.activeDays ?? []),
    });
}
// ------------------------------------------------------------- interview prep
const LEVEL_ORDER = ['junior', 'mid', 'senior'];
function countLevels(questions) {
    const counts = { junior: 0, mid: 0, senior: 0 };
    for (const question of questions)
        counts[question.level] = (counts[question.level] ?? 0) + 1;
    return counts;
}
/** Every track with live question counts — the interview index page. */
export async function interviewTracks() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/interview/tracks');
    return bundle.interviewTracks.map((track) => {
        const questions = [...bundle.interviewQuestions.values()].filter((q) => q.trackId === track.id);
        return { ...track, questionCount: questions.length, levels: countLevels(questions) };
    });
}
/** One track, with its topics resolved in the order the track declares them. */
export async function interviewTrack(id) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(`/interview/tracks/${id}`);
    const track = bundle.interviewTracks.find((row) => row.id === id);
    if (!track)
        throw new Error(`No interview track with id "${id}"`);
    const declared = track.topics ?? [];
    const topics = [...bundle.questionSets.values()]
        .filter((set) => set.trackId === id)
        .map((set) => ({
        id: set.topic,
        setId: set.id,
        title: set.title,
        summary: set.summary,
        questions: set.questions.length,
        levels: countLevels(set.questions),
    }))
        .sort((a, b) => {
        const ai = declared.indexOf(a.id);
        const bi = declared.indexOf(b.id);
        return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
    });
    const questions = [...bundle.interviewQuestions.values()].filter((q) => q.trackId === id);
    return { ...track, questionCount: questions.length, levels: countLevels(questions), topics };
}
export async function questionSet(id) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(`/interview/sets/${id}`);
    const set = bundle.questionSets.get(id);
    if (!set)
        throw new Error(`No question set with id "${id}"`);
    // Return questions carrying their denormalised origin, exactly as the API does.
    return { ...set, questions: set.questions.map((q) => bundle.interviewQuestions.get(q.id) ?? q) };
}
export async function interviewQuestions(filters = {}) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(filters))
            if (value)
                params.set(key, value);
        return request(`/interview/questions?${params.toString()}`);
    }
    const needle = filters.q?.toLowerCase().trim();
    return [...bundle.interviewQuestions.values()]
        .filter((question) => {
        if (filters.track && question.trackId !== filters.track)
            return false;
        if (filters.topic && question.topic !== filters.topic)
            return false;
        if (filters.level && question.level !== filters.level)
            return false;
        if (filters.type && question.type !== filters.type)
            return false;
        if (needle) {
            const haystack = `${question.question} ${question.answer}`.toLowerCase();
            if (!haystack.includes(needle))
                return false;
        }
        return true;
    })
        .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || a.id.localeCompare(b.id));
}
export async function interviewQuestion(id) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request(`/interview/questions/${id}`);
    const question = bundle.interviewQuestions.get(id);
    if (!question)
        throw new Error(`No interview question with id "${id}"`);
    return question;
}
/**
 * A randomised drill set.
 *
 * Seeded by the day unless a seed is given, so reloading mid-session returns the same set. A
 * drill that reshuffles on every reload loses the question you wanted to come back to, which
 * makes the feature feel broken rather than random.
 */
export async function interviewDrill(options = {}) {
    const { track, level, count = 10, seed } = options;
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        const params = new URLSearchParams();
        if (track)
            params.set('track', track);
        if (level)
            params.set('level', level);
        params.set('count', String(count));
        if (seed !== undefined)
            params.set('seed', String(seed));
        return request(`/interview/drill?${params.toString()}`);
    }
    const pool = await interviewQuestions({ track, level });
    const effectiveSeed = seed ?? Math.floor(Date.now() / 86_400_000);
    return shuffle(pool, effectiveSeed).slice(0, Math.min(Math.max(1, count), pool.length));
}
/** Deterministic shuffle — mulberry32, so the same seed gives the same order in every browser. */
function shuffle(items, seed) {
    const result = [...items];
    let state = seed >>> 0;
    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
/**
 * The content type behind an id, used to route a cross-reference.
 *
 * Needed because ids are flat across collections — `cache` is a concept and `two-sum` a problem,
 * with nothing in the id itself to say which. Online mode asks the backend's type index; offline
 * mode reads the bundle's equivalent map, so both give the same answer.
 */
export async function typeOf(id) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        try {
            const body = await request(`/meta/type/${id}`);
            return body.type ?? 'unknown';
        }
        catch {
            return 'unknown';
        }
    }
    return bundle.typeOf(id);
}
// -------------------------------------------------------------------- language
/**
 * The language every content request is served in.
 *
 * Held at module level rather than threaded through every call site: a language is a session-wide
 * choice, not a per-request argument, and passing it to forty functions would guarantee that one
 * of them eventually forgets. Online mode sends it as `?lang=`; offline mode merges the overlay
 * locally. Both fall back to English per field and mark what the learner actually got.
 */
let language = 'en';
export function setLanguage(code) {
    language = code || 'en';
    try {
        window.localStorage.setItem('dsa-platform-language', language);
    }
    catch {
        // Private window or blocked storage: the choice simply does not persist.
    }
}
export function currentLanguage() {
    return language;
}
export function storedLanguage() {
    try {
        return window.localStorage.getItem('dsa-platform-language') ?? 'en';
    }
    catch {
        return 'en';
    }
}
/** Appends `?lang=` only when a translation is actually wanted, keeping English URLs clean. */
function withLanguage(path) {
    if (language === 'en')
        return path;
    return path + (path.includes('?') ? '&' : '?') + `lang=${encodeURIComponent(language)}`;
}
export async function languages() {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online')
        return request('/i18n/languages');
    const total = bundle.lessons.size + bundle.problems.size + bundle.concepts.size + bundle.caseStudies.size;
    return bundle.languages.map((entry) => {
        const translated = entry.default ? total : (bundle.overlays.get(entry.code)?.size ?? 0);
        return {
            ...entry,
            translatedDocuments: translated,
            totalDocuments: total,
            coveragePercent: total === 0 ? 0 : Math.round((100 * translated) / total),
            hasUiStrings: bundle.uiStrings.has(entry.code),
        };
    });
}
export async function uiStrings(code) {
    if (mode !== 'online')
        await ensureBundle();
    if (mode === 'online') {
        try {
            const body = await request(`/i18n/strings/${code}`);
            return body.strings ?? {};
        }
        catch {
            return {};
        }
    }
    return bundle.uiStrings.get(code) ?? {};
}
