const modules = import.meta.glob('../content-bundle/**/*.json', { eager: true, import: 'default' });
function collect(fragment) {
    const result = new Map();
    for (const [path, value] of Object.entries(modules)) {
        // Translation overlays mirror the content tree (i18n/hi/dsa/patterns/…), so a bare substring
        // match on "/dsa/patterns/" would sweep them up as primary documents — and because they share
        // the English id, the last one loaded would silently REPLACE the English lesson. Excluding the
        // i18n subtree here is what keeps an overlay an overlay.
        if (path.includes('/i18n/'))
            continue;
        if (!path.includes(fragment))
            continue;
        const id = value.id;
        if (id)
            result.set(id, value);
    }
    return result;
}
export const lessons = new Map([
    ...collect('/dsa/foundations/'),
    ...collect('/dsa/patterns/'),
    ...collect('/dsa/data-structures/'),
]);
export const problems = collect('/dsa/problems/');
export const concepts = collect('/system-design/concepts/');
export const caseStudies = collect('/system-design/case-studies/');
export const decisionTrees = collect('/decision-trees/');
export const paths = collect('/paths/');
export const patternMap = Object.entries(modules).find(([path]) => path.endsWith('pattern-map.json'))?.[1];
export const practiceQuestions = (Object.entries(modules).find(([path]) => path.endsWith('pattern-recognition.json'))?.[1] ?? []);
/* ------------------------------------------------------------- interview prep */
export const interviewTracks = (Object.entries(modules).find(([path]) => path.endsWith('/interview/tracks.json'))?.[1] ?? []);
/**
 * Question sets, and every question indexed by its own id.
 *
 * The trackId/topic/setId denormalisation mirrors exactly what the backend's ContentStore does
 * when it loads the same files, so a question object is identical in both modes. That parity is
 * not incidental — it is what lets one set of components render either source without knowing
 * which one it got.
 */
export const questionSets = collect('/interview/');
export const interviewQuestions = new Map();
for (const set of questionSets.values()) {
    for (const question of set.questions ?? []) {
        interviewQuestions.set(question.id, {
            ...question,
            trackId: set.trackId,
            topic: set.topic,
            setId: set.id,
        });
    }
}
/** Content type for any id, mirroring the backend's typeById map. */
export function typeOf(id) {
    if (lessons.has(id))
        return 'lesson';
    if (problems.has(id))
        return 'problem';
    if (concepts.has(id))
        return 'concept';
    if (caseStudies.has(id))
        return 'case-study';
    if (questionSets.has(id))
        return 'question-set';
    return 'unknown';
}
export function anyById(id) {
    return lessons.get(id) ?? problems.get(id) ?? concepts.get(id) ?? caseStudies.get(id);
}
/** Mirrors ContentStore.summarise on the backend so both modes produce identical cards. */
export function summarise(document, type) {
    const record = document;
    const statement = typeof record.statement === 'string' ? record.statement : '';
    const summary = (typeof record.summary === 'string' && record.summary) ||
        (statement.length > 180 ? `${statement.slice(0, 177)}...` : statement);
    return {
        id: document.id,
        type,
        title: document.title,
        kind: record.kind,
        group: record.group,
        level: record.level,
        difficulty: record.difficulty,
        estimatedMinutes: record.estimatedMinutes,
        summary,
        tags: record.tags,
        patternId: record.patternId,
        interactive: record.interactive,
        // Flattened onto the summary so a list can show "#42" without fetching 165 documents.
        // ContentStore.summarise on the backend flattens the same two fields, or the online and
        // offline problem lists would disagree about which problems have a judge to practise on.
        leetcodeId: record.practice?.leetcode
            ? record.practice.leetcode.id
            : undefined,
        leetcodePremium: record.practice?.leetcode
            ? record.practice.leetcode.premium
            : undefined,
    };
}
export const stats = {
    lessons: lessons.size,
    patterns: [...lessons.values()].filter((lesson) => lesson.kind === 'pattern').length,
    problems: problems.size,
    concepts: concepts.size,
    caseStudies: caseStudies.size,
    decisionTrees: decisionTrees.size,
    paths: paths.size,
    practiceQuestions: practiceQuestions.length,
};
export const languages = (Object.entries(modules).find(([path]) => path.endsWith('/i18n/languages.json'))?.[1] ?? []);
/** language -> UI strings, and language -> (document id -> partial overlay). */
export const uiStrings = new Map();
export const overlays = new Map();
for (const [path, value] of Object.entries(modules)) {
    const match = path.match(/\/i18n\/([a-z-]+)\/(.*)\.json$/);
    if (!match)
        continue;
    const [, code, rest] = match;
    if (rest === 'ui') {
        uiStrings.set(code, (value.strings ?? {}));
        continue;
    }
    const byId = overlays.get(code) ?? new Map();
    // The id may be stated explicitly; otherwise the filename is the id, mirroring the backend.
    const id = value.id ?? rest.split('/').pop();
    byId.set(id, value);
    overlays.set(code, byId);
}
/**
 * Merges a translation overlay over a document — the offline twin of ContentStore#localise.
 *
 * Objects merge recursively; arrays and scalars replace wholesale, so a half-translated list can
 * never come back as a mixture of two languages. The `translation` marker is what lets the UI say
 * plainly whether the learner is reading a translation or the English fallback.
 */
export function localise(document, language) {
    if (!document || !language || language === 'en')
        return document;
    const id = document.id;
    const overlay = id ? overlays.get(language)?.get(id) : undefined;
    const merged = overlay ? deepMerge(structuredClone(document), overlay) : structuredClone(document);
    merged.translation = { language, translated: Boolean(overlay) };
    return merged;
}
function deepMerge(base, overlay) {
    for (const [key, value] of Object.entries(overlay)) {
        const existing = base[key];
        if (isPlainObject(existing) && isPlainObject(value))
            deepMerge(existing, value);
        else
            base[key] = value;
    }
    return base;
}
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
