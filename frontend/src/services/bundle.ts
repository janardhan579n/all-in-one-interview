import type {
  CaseStudy,
  InterviewQuestion,
  InterviewTrack,
  QuestionSet,
  Concept,
  ContentSummary,
  DecisionTree,
  Lesson,
  LearningPath,
  PatternMap,
  PracticeQuestion,
  Problem,
} from '../types';

/**
 * The offline content bundle.
 *
 * `scripts/sync-content.mjs` copies /content into src/content-bundle before every dev run and
 * build, and this module loads all of it eagerly at import time. That is what lets the whole
 * platform work with the backend switched off, or opened as static files (ADR-006).
 *
 * The bundle is only imported by the offline provider, so an online session never parses it.
 */

type AnyRecord = Record<string, unknown>;

const modules = import.meta.glob('../content-bundle/**/*.json', { eager: true, import: 'default' }) as Record<
  string,
  AnyRecord
>;

function collect<T>(fragment: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const [path, value] of Object.entries(modules)) {
    // Translation overlays mirror the content tree (i18n/hi/dsa/patterns/…), so a bare substring
    // match on "/dsa/patterns/" would sweep them up as primary documents — and because they share
    // the English id, the last one loaded would silently REPLACE the English lesson. Excluding the
    // i18n subtree here is what keeps an overlay an overlay.
    if (path.includes('/i18n/')) continue;
    if (!path.includes(fragment)) continue;
    const id = (value as AnyRecord).id as string | undefined;
    if (id) result.set(id, value as T);
  }
  return result;
}

export const lessons = new Map<string, Lesson>([
  ...collect<Lesson>('/dsa/foundations/'),
  ...collect<Lesson>('/dsa/patterns/'),
  ...collect<Lesson>('/dsa/data-structures/'),
]);

export const problems = collect<Problem>('/dsa/problems/');
export const concepts = collect<Concept>('/system-design/concepts/');
export const caseStudies = collect<CaseStudy>('/system-design/case-studies/');
export const decisionTrees = collect<DecisionTree>('/decision-trees/');
export const paths = collect<LearningPath>('/paths/');

export const patternMap = Object.entries(modules).find(([path]) => path.endsWith('pattern-map.json'))?.[1] as
  | PatternMap
  | undefined;

export const practiceQuestions = (Object.entries(modules).find(([path]) =>
  path.endsWith('pattern-recognition.json'),
)?.[1] ?? []) as unknown as PracticeQuestion[];

/* ------------------------------------------------------------- interview prep */

export const interviewTracks = (Object.entries(modules).find(([path]) =>
  path.endsWith('/interview/tracks.json'),
)?.[1] ?? []) as unknown as InterviewTrack[];

/**
 * Question sets, and every question indexed by its own id.
 *
 * The trackId/topic/setId denormalisation mirrors exactly what the backend's ContentStore does
 * when it loads the same files, so a question object is identical in both modes. That parity is
 * not incidental — it is what lets one set of components render either source without knowing
 * which one it got.
 */
export const questionSets = collect<QuestionSet>('/interview/');

export const interviewQuestions = new Map<string, InterviewQuestion>();
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
export function typeOf(id: string): ContentSummary['type'] | 'question-set' | 'unknown' {
  if (lessons.has(id)) return 'lesson';
  if (problems.has(id)) return 'problem';
  if (concepts.has(id)) return 'concept';
  if (caseStudies.has(id)) return 'case-study';
  if (questionSets.has(id)) return 'question-set';
  return 'unknown';
}

export function anyById(id: string): (Lesson | Problem | Concept | CaseStudy) | undefined {
  return lessons.get(id) ?? problems.get(id) ?? concepts.get(id) ?? caseStudies.get(id);
}

/** Mirrors ContentStore.summarise on the backend so both modes produce identical cards. */
export function summarise(
  document: Lesson | Problem | Concept | CaseStudy,
  type: ContentSummary['type'],
): ContentSummary {
  const record = document as unknown as AnyRecord;
  const statement = typeof record.statement === 'string' ? record.statement : '';
  const summary =
    (typeof record.summary === 'string' && record.summary) ||
    (statement.length > 180 ? `${statement.slice(0, 177)}...` : statement);

  return {
    id: document.id,
    type,
    title: document.title,
    kind: record.kind as string | undefined,
    group: record.group as string | undefined,
    level: record.level as number | undefined,
    difficulty: record.difficulty as string | undefined,
    estimatedMinutes: record.estimatedMinutes as number | undefined,
    summary,
    tags: record.tags as string[] | undefined,
    patternId: record.patternId as string | undefined,
    interactive: record.interactive as string | undefined,
    // Flattened onto the summary so a list can show "#42" without fetching 165 documents.
    // ContentStore.summarise on the backend flattens the same two fields, or the online and
    // offline problem lists would disagree about which problems have a judge to practise on.
    leetcodeId: (record.practice as AnyRecord | undefined)?.leetcode
      ? (((record.practice as AnyRecord).leetcode as AnyRecord).id as number)
      : undefined,
    leetcodePremium: (record.practice as AnyRecord | undefined)?.leetcode
      ? (((record.practice as AnyRecord).leetcode as AnyRecord).premium as boolean)
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

/* ---------------------------------------------------------------- languages */

export interface LanguageEntry {
  code: string;
  name: string;
  nativeName: string;
  default?: boolean;
}

export const languages = (Object.entries(modules).find(([path]) =>
  path.endsWith('/i18n/languages.json'),
)?.[1] ?? []) as unknown as LanguageEntry[];

/** language -> UI strings, and language -> (document id -> partial overlay). */
export const uiStrings = new Map<string, Record<string, string>>();
export const overlays = new Map<string, Map<string, AnyRecord>>();

for (const [path, value] of Object.entries(modules)) {
  const match = path.match(/\/i18n\/([a-z-]+)\/(.*)\.json$/);
  if (!match) continue;
  const [, code, rest] = match;
  if (rest === 'ui') {
    uiStrings.set(code, ((value as AnyRecord).strings ?? {}) as Record<string, string>);
    continue;
  }
  const byId = overlays.get(code) ?? new Map<string, AnyRecord>();
  // The id may be stated explicitly; otherwise the filename is the id, mirroring the backend.
  const id = ((value as AnyRecord).id as string | undefined) ?? rest.split('/').pop()!;
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
export function localise<T>(document: T, language: string | undefined): T {
  if (!document || !language || language === 'en') return document;

  const id = (document as AnyRecord).id as string | undefined;
  const overlay = id ? overlays.get(language)?.get(id) : undefined;
  const merged = overlay ? deepMerge(structuredClone(document) as AnyRecord, overlay) : structuredClone(document);
  (merged as AnyRecord).translation = { language, translated: Boolean(overlay) };
  return merged as T;
}

function deepMerge(base: AnyRecord, overlay: AnyRecord): AnyRecord {
  for (const [key, value] of Object.entries(overlay)) {
    const existing = base[key];
    if (isPlainObject(existing) && isPlainObject(value)) deepMerge(existing, value);
    else base[key] = value;
  }
  return base;
}

function isPlainObject(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
