#!/usr/bin/env node
/**
 * Content integrity checker.
 *
 * The content library is plain JSON edited by hand, so nothing in the type system stops a
 * lesson from pointing at a problem that was renamed, or naming a visualisation engine that
 * does not exist. Either mistake shows up to the learner as a dead link or a blank panel —
 * both of which look like the app is broken. This script turns those into a failed build.
 *
 * It deliberately reads the engine and interactive registries out of the TypeScript source
 * rather than duplicating their ids here: a list that has to be kept in sync by hand is the
 * same class of bug this script exists to catch.
 *
 * Usage:  npm run validate:content        (exit 0 = clean, 1 = problems found)
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const contentDir = resolve(repo, 'content');
const srcDir = resolve(here, '..', 'src');

const problems = [];
const notes = [];
const fail = (file, message) => problems.push(`${relative(repo, file)}: ${message}`);

if (!existsSync(contentDir)) {
  console.error(`[validate-content] No content directory at ${contentDir}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ loading */

async function jsonFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await jsonFiles(full)));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out.sort();
}

const files = await jsonFiles(contentDir);
/** @type {Map<string, {file: string, data: any}>} */
const docs = new Map();

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    fail(file, `invalid JSON — ${error.message}`);
    continue;
  }
  docs.set(file, data);
}

const group = (segment) =>
  [...docs.entries()].filter(([file]) => file.includes(`/content/${segment}/`)).map(([file, data]) => ({ file, data }));

const lessons = [
  ...group('dsa/foundations'),
  ...group('dsa/patterns'),
  ...group('dsa/data-structures'),
];
const problemDocs = group('dsa/problems');
const concepts = group('system-design/concepts');
const caseStudies = group('system-design/case-studies');
const trees = group('decision-trees');
const paths = group('paths');
const practiceFile = [...docs.entries()].find(([file]) => file.endsWith('practice/pattern-recognition.json'));

const ids = (rows) => new Set(rows.map((row) => row.data?.id).filter(Boolean));
const lessonIds = ids(lessons);
const problemIds = ids(problemDocs);
const conceptIds = ids(concepts);
const caseIds = ids(caseStudies);
const treeIds = ids(trees);
/** Anything a learner can navigate to — used for `related` and path steps. */
const anyIds = new Set([...lessonIds, ...problemIds, ...conceptIds, ...caseIds]);

/* ------------------------------------------- registries read from TS source */

async function registryKeys(file, startMarker) {
  const source = await readFile(file, 'utf8');
  const start = source.indexOf(startMarker);
  if (start === -1) {
    notes.push(`could not find "${startMarker}" in ${relative(repo, file)} — engine check skipped`);
    return null;
  }
  const body = source.slice(start + startMarker.length, source.indexOf('\n};', start));
  const keys = new Set();
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*'?([A-Za-z][\w-]*)'?\s*[,:]/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

const engineIds = await registryKeys(join(srcDir, 'visualizers/registry.ts'), 'export const ENGINES: Record<string, Engine> = {');
const interactiveIds = await registryKeys(join(srcDir, 'components/interactives.tsx'), 'export const INTERACTIVES: Record<string, () => JSX.Element> = {');

/**
 * The groups the system design index knows how to order and caption.
 *
 * Read from the page rather than duplicated here, for the same reason the engine ids are: a
 * second copy of a list is a second thing to forget. A concept filed under an unknown group
 * still renders — it just silently loses its ordering and its blurb and sinks to the bottom
 * of the page, which is exactly the class of defect that survives for months unnoticed.
 */
async function conceptGroups() {
  const source = await readFile(join(srcDir, 'pages/SystemDesignIndex.tsx'), 'utf8');
  const start = source.indexOf('const GROUP_ORDER = [');
  if (start === -1) {
    notes.push('could not find GROUP_ORDER in pages/SystemDesignIndex.tsx — group check skipped');
    return null;
  }
  const body = source.slice(start, source.indexOf('];', start));
  return new Set([...body.matchAll(/'([^']+)'/g)].map((match) => match[1]));
}

const knownGroups = await conceptGroups();

/* ------------------------------------------------------------------- checks */

function checkRef(file, label, ref, allowed) {
  if (ref === undefined || ref === null) return;
  if (!allowed.has(ref)) fail(file, `${label} points at "${ref}", which does not exist`);
}

function checkQuiz(file, quiz) {
  if (!Array.isArray(quiz)) return;
  const seen = new Set();
  for (const question of quiz) {
    const where = `quiz ${question.id ?? '(no id)'}`;
    if (!question.id) fail(file, `${where} has no id`);
    if (seen.has(question.id)) fail(file, `duplicate quiz id "${question.id}"`);
    seen.add(question.id);
    if (!question.question) fail(file, `${where} has no question text`);
    if (!Array.isArray(question.options) || question.options.length < 2) {
      fail(file, `${where} needs at least two options`);
      continue;
    }
    if (typeof question.answerIndex !== 'number' || question.answerIndex < 0 || question.answerIndex >= question.options.length) {
      fail(file, `${where} has answerIndex ${question.answerIndex} outside 0..${question.options.length - 1}`);
    }
    // The explanation is what makes a wrong answer educational rather than just wrong.
    if (!question.explanation) fail(file, `${where} has no explanation`);
  }
}

/**
 * The practice reference is how a learner leaves this library and goes to type the thing on a
 * judge, which is the one skill no amount of reading here can build. So it is required, and a
 * problem with no honest LeetCode counterpart must say so explicitly rather than be left blank —
 * a silently missing link is indistinguishable from an oversight.
 *
 * The url is checked against the slug because the slug is what LeetCode actually routes on. The
 * displayed number could be wrong and the link would still work; a wrong slug is a dead end.
 */
function checkPractice(file, practice) {
  if (practice === undefined) {
    fail(file, 'problem has no "practice" reference — run scripts/add-practice-refs.py');
    return;
  }
  const { leetcode, note } = practice;
  if (leetcode === null) {
    if (!note) fail(file, 'practice.leetcode is null but no "note" says what to practise instead');
    return;
  }
  if (!leetcode || typeof leetcode !== 'object') {
    fail(file, 'practice.leetcode must be an object, or null with a note explaining why');
    return;
  }
  if (!Number.isInteger(leetcode.id) || leetcode.id < 1) fail(file, `practice.leetcode.id "${leetcode.id}" is not a problem number`);
  if (!leetcode.title) fail(file, 'practice.leetcode has no title');
  if (typeof leetcode.premium !== 'boolean') fail(file, 'practice.leetcode.premium must be true or false');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(leetcode.slug ?? '')) {
    fail(file, `practice.leetcode.slug "${leetcode.slug}" is not a LeetCode url slug`);
    return;
  }
  const expected = `https://leetcode.com/problems/${leetcode.slug}/`;
  if (leetcode.url !== expected) {
    fail(file, `practice.leetcode.url does not match its slug — expected ${expected}, got "${leetcode.url}"`);
  }
}

function checkVisualization(file, spec, label) {
  if (!spec) return;
  if (!spec.engine) {
    fail(file, `${label} has no engine`);
    return;
  }
  if (engineIds && !engineIds.has(spec.engine)) {
    fail(file, `${label} names engine "${spec.engine}", which is not in visualizers/registry.ts`);
  }
  if (spec.code !== undefined && !Array.isArray(spec.code)) {
    fail(file, `${label} has a "code" field that is not an array of lines`);
  }
}

function checkDiagram(file, diagram, label) {
  if (!diagram || !Array.isArray(diagram.nodes)) return;
  const nodeIds = new Set(diagram.nodes.map((node) => node.id));
  for (const node of diagram.nodes) {
    if (!node.id || !node.label) fail(file, `${label} has a node without an id or label`);
    if (typeof node.x !== 'number' || typeof node.y !== 'number') {
      fail(file, `${label} node "${node.id}" has no x/y coordinates`);
    }
  }
  for (const edge of diagram.edges ?? []) {
    if (!nodeIds.has(edge.from)) fail(file, `${label} edge starts at unknown node "${edge.from}"`);
    if (!nodeIds.has(edge.to)) fail(file, `${label} edge ends at unknown node "${edge.to}"`);
  }
}

// --- ids are unique within a collection, and match their filename ---
/**
 * Uniqueness is per collection, not global: a decision tree is deliberately named after the
 * pattern it belongs to (`two-pointers`), and the two are never looked up through the same map.
 */
const COLLECTIONS = [
  ['lesson', lessons],
  ['problem', problemDocs],
  ['concept', concepts],
  ['case study', caseStudies],
  ['decision tree', trees],
  ['learning path', paths],
];
/** Index files whose id names the document rather than the file. */
const ID_FILENAME_EXCEPTIONS = new Set(['pattern-map.json']);

for (const [label, rows] of COLLECTIONS) {
  const seen = new Map();
  for (const { file, data } of rows) {
    if (!data?.id) {
      fail(file, `${label} has no "id"`);
      continue;
    }
    if (seen.has(data.id)) fail(file, `${label} id "${data.id}" is already used by ${relative(repo, seen.get(data.id))}`);
    seen.set(data.id, file);
    const stem = basename(file, '.json');
    if (stem !== data.id && !ID_FILENAME_EXCEPTIONS.has(basename(file))) {
      fail(file, `id "${data.id}" does not match the filename "${stem}.json"`);
    }
  }
}

// --- lessons ---
for (const { file, data } of lessons) {
  for (const field of ['title', 'kind', 'level', 'summary', 'analogy', 'intuition']) {
    if (data[field] === undefined) fail(file, `lesson is missing "${field}"`);
  }
  if (data.analogy && (!data.analogy.beginner || !data.analogy.interview)) {
    // §21: every explanation exists in a non-IT-friendly form and an interview form.
    fail(file, 'analogy must have both a "beginner" and an "interview" form');
  }
  if (data.problemFirst) {
    const pf = data.problemFirst;
    for (const field of ['motivatingProblem', 'bruteForce', 'observation', 'leap']) {
      if (!pf[field]) fail(file, `problemFirst is missing "${field}"`);
    }
    if (pf.bruteForce && !pf.bruteForce.whySlow) fail(file, 'problemFirst.bruteForce is missing "whySlow"');
  } else if (data.kind === 'pattern') {
    // §42/§43: a pattern lesson without the brute-force journey teaches the answer first.
    fail(file, 'a pattern lesson must have a "problemFirst" journey');
  }
  for (const [index, spec] of (data.visualizations ?? []).entries()) {
    checkVisualization(file, spec, `visualizations[${index}]`);
  }
  checkRef(file, 'patternRecognition.decisionTreeId', data.patternRecognition?.decisionTreeId, treeIds);
  for (const ref of data.practiceProblems ?? []) checkRef(file, 'practiceProblems', ref, problemIds);
  for (const ref of data.related ?? []) checkRef(file, 'related', ref, anyIds);
  checkQuiz(file, data.quiz);
  if (!Array.isArray(data.implementations) || data.implementations.length === 0) {
    notes.push(`${relative(repo, file)}: no implementations — the lesson shows no code`);
  }
}

// --- problems ---
for (const { file, data } of problemDocs) {
  for (const field of ['title', 'patternId', 'difficulty', 'statement', 'bruteForce', 'optimized']) {
    if (data[field] === undefined) fail(file, `problem is missing "${field}"`);
  }
  checkRef(file, 'patternId', data.patternId, lessonIds);
  if (!['beginner', 'intermediate', 'advanced'].includes(data.difficulty)) {
    fail(file, `difficulty "${data.difficulty}" is not beginner | intermediate | advanced`);
  }
  if (!Array.isArray(data.examples) || data.examples.length === 0) fail(file, 'problem has no worked examples');
  checkVisualization(file, data.visualization, 'visualization');
  checkPractice(file, data.practice);
  for (const ref of data.similar ?? []) checkRef(file, 'similar', ref, problemIds);
}

// --- system design concepts ---
for (const { file, data } of concepts) {
  for (const field of ['title', 'summary', 'analogy', 'explanation', 'tradeoffs']) {
    if (data[field] === undefined) fail(file, `concept is missing "${field}"`);
  }
  // §14: trade-offs are always two-sided — never "X is better".
  if (Array.isArray(data.tradeoffs)) {
    if (data.tradeoffs.length < 2) fail(file, 'tradeoffs must weigh at least two options against each other');
    for (const [index, tradeoff] of data.tradeoffs.entries()) {
      if (!tradeoff.option) fail(file, `tradeoffs[${index}] has no "option" name`);
      if (!tradeoff.pros?.length || !tradeoff.cons?.length) {
        fail(file, `tradeoffs[${index}] ("${tradeoff.option}") needs both pros and cons — one-sided is a recommendation, not a trade-off`);
      }
    }
  }
  if (knownGroups && !knownGroups.has(data.group)) {
    fail(
      file,
      `group "${data.group}" is not in GROUP_ORDER in pages/SystemDesignIndex.tsx — it would render without ordering or a blurb`,
    );
  }
  checkDiagram(file, data.diagram, 'diagram');
  if (data.interactive && interactiveIds && !interactiveIds.has(data.interactive)) {
    fail(file, `interactive "${data.interactive}" is not registered in components/interactives.tsx`);
  }
  for (const ref of data.related ?? []) checkRef(file, 'related', ref, anyIds);
  checkQuiz(file, data.quiz);
}

// --- case studies ---
for (const { file, data } of caseStudies) {
  for (const field of ['title', 'summary', 'steps', 'estimation', 'api', 'dataModel', 'evolution']) {
    if (data[field] === undefined) fail(file, `case study is missing "${field}"`);
  }
  if (!Array.isArray(data.evolution) || data.evolution.length < 2) {
    // §16/§44: the point is watching the architecture grow, which needs at least two stages.
    fail(file, 'evolution needs at least two stages');
  }
  for (const [index, stage] of (data.evolution ?? []).entries()) {
    if (!stage.stage) fail(file, `evolution[${index}] has no stage label`);
    // §44: each stage exists because the previous one broke. Say what broke and what changed.
    if (index > 0 && !stage.problem) fail(file, `evolution[${index}] has no "problem" explaining why this stage was needed`);
    if (!stage.change) fail(file, `evolution[${index}] has no "change"`);
    if (!stage.why) fail(file, `evolution[${index}] has no "why"`);
    checkDiagram(file, stage.architecture, `evolution[${index}].architecture`);
  }
  if (data.interactive && interactiveIds && !interactiveIds.has(data.interactive)) {
    fail(file, `interactive "${data.interactive}" is not registered in components/interactives.tsx`);
  }
  for (const ref of data.related ?? []) checkRef(file, 'related', ref, anyIds);
  checkQuiz(file, data.quiz);
}

// --- decision trees ---
for (const { file, data } of trees) {
  const nodes = data.nodes ?? {};
  const nodeIds = new Set(Object.keys(nodes));
  if (!nodeIds.has(data.start)) fail(file, `start node "${data.start}" does not exist`);
  const reachable = new Set();
  for (const [id, node] of Object.entries(nodes)) {
    if (!node.text) fail(file, `node "${id}" has no text`);
    if (node.type === 'question') {
      if (!node.options?.length) fail(file, `question node "${id}" has no options`);
      for (const option of node.options ?? []) {
        if (!option.label) fail(file, `node "${id}" has an option with no label`);
        if (!nodeIds.has(option.next)) fail(file, `node "${id}" branches to unknown node "${option.next}"`);
        else reachable.add(option.next);
      }
    } else if (node.type === 'result') {
      // A result that names no lesson is a dead end for the learner.
      if (node.lessonId) checkRef(file, `node "${id}" lessonId`, node.lessonId, anyIds);
    } else {
      fail(file, `node "${id}" has type "${node.type}" — expected "question" or "result"`);
    }
  }
  for (const id of nodeIds) {
    if (id !== data.start && !reachable.has(id)) fail(file, `node "${id}" is unreachable from the start node`);
  }
}

// --- learning paths ---
for (const { file, data } of paths) {
  if (!Array.isArray(data.steps) || data.steps.length === 0) fail(file, 'path has no steps');
  for (const [index, step] of (data.steps ?? []).entries()) {
    if (!anyIds.has(step.ref)) fail(file, `steps[${index}] points at "${step.ref}", which does not exist`);
  }
}

// --- pattern recognition practice ---
if (practiceFile) {
  const [file, items] = practiceFile;
  if (!Array.isArray(items)) fail(file, 'pattern-recognition.json must be an array');
  else {
    const seen = new Set();
    for (const item of items) {
      if (seen.has(item.id)) fail(file, `duplicate practice id "${item.id}"`);
      seen.add(item.id);
      if (!item.prompt) fail(file, `${item.id}: no prompt`);
      if (!Array.isArray(item.options) || !item.options.includes(item.answer)) {
        fail(file, `${item.id}: answer "${item.answer}" is not among its options`);
      }
      for (const option of item.options ?? []) checkRef(file, `${item.id} option`, option, lessonIds);
      if (!item.signals?.length) fail(file, `${item.id}: no signals — the learner is told the answer but not the tell`);
      if (!item.explanation) fail(file, `${item.id}: no explanation`);
    }
  }
}

// --- pattern map ---
const patternMap = [...docs.entries()].find(([file]) => file.endsWith('dsa/pattern-map.json'));
if (patternMap) {
  const [file, data] = patternMap;
  const walk = (node, trail) => {
    if (!node.label) fail(file, `pattern map node at ${trail} has no label`);
    // Only leaves point at content; root and group nodes are structure.
    if (node.kind === 'lesson' || node.kind === 'problem' || node.kind === 'concept') {
      checkRef(file, `pattern map node at ${trail}`, node.id, anyIds);
    }
    for (const [index, child] of (node.children ?? []).entries()) walk(child, `${trail}/${index}`);
  };
  if (data.root) walk(data.root, 'root');
}

// --- minimum content floor (§40/§41) ---
const REQUIRED_ENGINES_INTERACTIVE = ['two-pointers', 'sliding-window', 'binary-search', 'fast-slow-pointer', 'bfs', 'dfs'];
for (const id of REQUIRED_ENGINES_INTERACTIVE) {
  const row = lessons.find((lesson) => lesson.data.id === id);
  if (!row) fail(contentDir, `required interactive lesson "${id}" is missing`);
  else if (!row.data.visualizations?.length) fail(row.file, `"${id}" must be fully interactive but has no visualizations`);
}
const floors = [
  ['lessons', lessons.length, 16],
  ['problems', problemDocs.length, 30],
  ['system design concepts', concepts.length, 12],
  ['case studies', caseStudies.length, 4],
];
for (const [label, actual, minimum] of floors) {
  if (actual < minimum) problems.push(`content floor: ${actual} ${label}, at least ${minimum} required`);
}

// --- interview preparation ---
const INTERVIEW_LEVELS = new Set(['junior', 'mid', 'senior']);
const INTERVIEW_TYPES = new Set(['concept', 'code', 'scenario', 'tradeoff', 'behavioural']);

const tracksEntry = [...docs.entries()].find(([file]) => file.endsWith('/interview/tracks.json'));
const questionSets = [...docs.entries()]
  .filter(([file]) => file.includes('/content/interview/') && !file.endsWith('tracks.json'))
  .map(([file, data]) => ({ file, data }));

/**
 * `related` on an interview question may point at a lesson, problem, concept or case study —
 * or at another question set, since cross-linking topics ("see the JPA bank") is genuinely
 * useful. Both resolve to a route, so both are valid targets.
 */
const interviewLinkable = new Set([...anyIds, ...questionSets.map((row) => row.data.id)]);

if (tracksEntry) {
  const [file, tracks] = tracksEntry;
  if (!Array.isArray(tracks)) {
    fail(file, 'tracks.json must be an array');
  } else {
    const trackIds = new Set();
    const declaredTopics = new Map();

    for (const track of tracks) {
      for (const field of ['id', 'title', 'shortTitle', 'icon', 'summary', 'audience', 'topics']) {
        if (!track[field]) fail(file, `track "${track.id ?? '(no id)'}" is missing "${field}"`);
      }
      if (trackIds.has(track.id)) fail(file, `duplicate track id "${track.id}"`);
      trackIds.add(track.id);
      declaredTopics.set(track.id, new Set(track.topics ?? []));
    }

    // Every question set belongs to a declared track and topic, and vice versa — otherwise a
    // set exists that no page links to, or a track advertises a topic with no questions.
    const seenTopics = new Map();
    const questionIds = new Map();

    for (const { file: setFile, data: set } of questionSets) {
      for (const field of ['id', 'trackId', 'topic', 'title', 'summary', 'questions']) {
        if (set[field] === undefined) fail(setFile, `question set is missing "${field}"`);
      }
      if (!trackIds.has(set.trackId)) {
        fail(setFile, `trackId "${set.trackId}" is not declared in interview/tracks.json`);
      } else if (!declaredTopics.get(set.trackId).has(set.topic)) {
        fail(setFile, `topic "${set.topic}" is not listed under track "${set.trackId}"`);
      } else {
        const seen = seenTopics.get(set.trackId) ?? new Set();
        if (seen.has(set.topic)) fail(setFile, `two question sets claim topic "${set.topic}"`);
        seen.add(set.topic);
        seenTopics.set(set.trackId, seen);
      }

      const expectedId = `${set.trackId}-${set.topic}`;
      if (set.id !== expectedId) fail(setFile, `id should be "${expectedId}" to match its track and topic`);
      if (basename(setFile, '.json') !== set.topic) {
        fail(setFile, `filename should be "${set.topic}.json" to match its topic`);
      }

      for (const question of set.questions ?? []) {
        const where = `question ${question.id ?? '(no id)'}`;
        for (const field of ['id', 'level', 'type', 'question', 'answer', 'keyPoints', 'followUps', 'redFlags']) {
          if (question[field] === undefined) fail(setFile, `${where} is missing "${field}"`);
        }
        if (questionIds.has(question.id)) {
          fail(setFile, `question id "${question.id}" is already used by ${relative(repo, questionIds.get(question.id))}`);
        }
        questionIds.set(question.id, setFile);

        if (!INTERVIEW_LEVELS.has(question.level)) fail(setFile, `${where} has level "${question.level}"`);
        if (!INTERVIEW_TYPES.has(question.type)) fail(setFile, `${where} has type "${question.type}"`);

        // A one-line answer is not an interview answer. The floor catches placeholder content.
        const words = String(question.answer ?? '').split(/\s+/).filter(Boolean).length;
        if (words < 80) fail(setFile, `${where} has a ${words}-word answer — too short to teach anything`);

        if (!question.keyPoints?.length) fail(setFile, `${where} has no keyPoints`);
        if (!question.redFlags?.length) fail(setFile, `${where} has no redFlags`);
        for (const followUp of question.followUps ?? []) {
          if (!followUp.q || !followUp.a) fail(setFile, `${where} has a follow-up missing q or a`);
        }
        if (question.codeExample && !Array.isArray(question.codeExample.code)) {
          fail(setFile, `${where} codeExample.code must be an array of lines`);
        }
        for (const ref of question.related ?? []) checkRef(setFile, `${where} related`, ref, interviewLinkable);
      }
    }

    for (const [trackId, topics] of declaredTopics) {
      for (const topic of topics) {
        if (!(seenTopics.get(trackId) ?? new Set()).has(topic)) {
          notes.push(`track "${trackId}" declares topic "${topic}" but no question set exists for it yet`);
        }
      }
    }
  }
}

// --- translations ---
/**
 * A translation overlay is only useful if it lands on a real document and a real field. Two
 * mistakes are easy to make and invisible at runtime: an overlay whose id no longer matches any
 * English document (it simply never applies), and an overlay field the English document does not
 * have (it appears in the merged output as a field no component renders). Both are caught here.
 */
const languagesEntry = [...docs.entries()].find(([file]) => file.endsWith('/i18n/languages.json'));
const overlayFiles = [...docs.entries()]
  .filter(([file]) => file.includes('/content/i18n/') && !file.endsWith('languages.json') && !file.endsWith('/ui.json'));

if (languagesEntry) {
  const [file, registry] = languagesEntry;
  if (!Array.isArray(registry)) {
    fail(file, 'languages.json must be an array');
  } else {
    const codes = new Set();
    let defaults = 0;
    for (const language of registry) {
      for (const field of ['code', 'name', 'nativeName']) {
        if (!language[field]) fail(file, `language "${language.code ?? '(no code)'}" is missing "${field}"`);
      }
      if (codes.has(language.code)) fail(file, `duplicate language code "${language.code}"`);
      codes.add(language.code);
      if (language.default) defaults += 1;
    }
    if (defaults !== 1) fail(file, `exactly one language must be marked default (found ${defaults})`);

    // Every document in the library, by id, with the set of fields it actually has.
    const englishFields = new Map();
    for (const { file: docFile, data } of [...lessons, ...problemDocs, ...concepts, ...caseStudies]) {
      if (data?.id) englishFields.set(data.id, { fields: new Set(Object.keys(data)), file: docFile });
    }

    const coverage = new Map();
    for (const [overlayFile, overlay] of overlayFiles) {
      const match = overlayFile.match(/\/content\/i18n\/([^/]+)\//);
      const code = match?.[1];
      if (!code || !codes.has(code)) {
        fail(overlayFile, `language "${code}" is not registered in i18n/languages.json`);
        continue;
      }
      coverage.set(code, (coverage.get(code) ?? 0) + 1);

      const stem = basename(overlayFile, '.json');
      const id = overlay.id ?? stem;
      if (overlay.id && overlay.id !== stem) {
        fail(overlayFile, `id "${overlay.id}" does not match the filename "${stem}.json"`);
      }

      const english = englishFields.get(id);
      if (!english) {
        fail(overlayFile, `translates "${id}", which is not a document in the library`);
        continue;
      }
      for (const key of Object.keys(overlay)) {
        if (key !== 'id' && !english.fields.has(key)) {
          fail(overlayFile, `field "${key}" does not exist on the English document — it would never render`);
        }
      }
    }

    // UI strings: report missing keys as notes, since English fills the gap at runtime.
    const englishUi = [...docs.entries()].find(([f]) => f.endsWith('/i18n/en/ui.json'))?.[1];
    if (englishUi?.strings) {
      const expected = Object.keys(englishUi.strings);
      for (const code of codes) {
        if (code === 'en') continue;
        const ui = [...docs.entries()].find(([f]) => f.endsWith(`/i18n/${code}/ui.json`))?.[1];
        if (!ui?.strings) {
          notes.push(`language "${code}" has no ui.json — the interface stays in English`);
          continue;
        }
        const missing = expected.filter((key) => !(key in ui.strings));
        if (missing.length > 0) {
          notes.push(`language "${code}" is missing ${missing.length} UI string(s): ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`);
        }
      }
      for (const [code, count] of coverage) {
        notes.push(`language "${code}": ${count} translated document(s)`);
      }
    }
  }
}

/* ------------------------------------------------------------------ report */

const interviewQuestionCount = questionSets.reduce((sum, row) => sum + (row.data.questions?.length ?? 0), 0);

console.log(
  `[validate-content] ${docs.size} files — ${lessons.length} lessons, ${problemDocs.length} problems, ` +
    `${concepts.length} concepts, ${caseStudies.length} case studies, ${trees.length} decision trees, ${paths.length} paths`,
);
console.log(
  `[validate-content] interview: ${Array.isArray(tracksEntry?.[1]) ? tracksEntry[1].length : 0} tracks, ` +
    `${questionSets.length} question sets, ${interviewQuestionCount} questions`,
);
if (engineIds) console.log(`[validate-content] ${engineIds.size} visualisation engines registered`);

for (const note of notes) console.log(`  note: ${note}`);

if (problems.length > 0) {
  console.error(`\n[validate-content] ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}

console.log('[validate-content] OK — every reference resolves.');
