import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as platform from './platform';
/**
 * Offline-mode tests.
 *
 * These exercise the fallback provider against the real content bundle, so they double as a
 * content-integrity check in the frontend: if a lesson id referenced by a learning path is
 * renamed, these fail rather than the learner finding a dead link.
 */
describe('platform (offline mode)', () => {
    beforeAll(() => {
        platform.setMode('offline');
    });
    beforeEach(() => {
        window.localStorage.clear();
    });
    it('loads the whole content library', async () => {
        const stats = await platform.stats();
        expect(stats.lessons).toBeGreaterThanOrEqual(20);
        expect(stats.problems).toBeGreaterThanOrEqual(30);
        expect(stats.concepts).toBeGreaterThanOrEqual(12);
        expect(stats.caseStudies).toBeGreaterThanOrEqual(4);
    });
    it('filters lessons by kind and level', async () => {
        const patterns = await platform.lessons({ kind: 'pattern' });
        expect(patterns.length).toBeGreaterThan(5);
        expect(patterns.every((lesson) => lesson.kind === 'pattern')).toBe(true);
        const levelZero = await platform.lessons({ level: 0 });
        expect(levelZero.every((lesson) => lesson.level === 0)).toBe(true);
    });
    it('serves a full lesson including the problem-first journey', async () => {
        const lesson = await platform.lesson('sliding-window');
        expect(lesson.title).toBe('Sliding Window');
        expect(lesson.problemFirst?.bruteForce.whySlow).toBeTruthy();
        expect(lesson.visualizations?.[0].engine).toBe('slidingWindowFixed');
        expect(lesson.complexity?.why).toBeTruthy();
    });
    it('rejects an unknown id rather than returning undefined', async () => {
        await expect(platform.lesson('no-such-lesson')).rejects.toThrow(/no lesson/i);
    });
    it('groups problems pattern → difficulty → problem', async () => {
        const groups = await platform.problemsByPattern();
        expect(groups.length).toBeGreaterThan(5);
        const window = groups.find((group) => group.patternId === 'sliding-window');
        expect(window?.tiers.map((tier) => tier.difficulty)).toEqual(['beginner', 'intermediate', 'advanced']);
    });
    it('resolves every learning-path step to real content', async () => {
        for (const summary of await platform.paths()) {
            const resolved = await platform.path(summary.id);
            const broken = resolved.steps.filter((step) => step.missing);
            expect(broken, `${summary.id} has unresolved steps: ${broken.map((s) => s.ref).join(', ')}`).toHaveLength(0);
        }
    });
    it('searches with AND semantics and ranks titles first', async () => {
        const hits = await platform.search('sliding window');
        expect(hits[0].id).toBe('sliding-window');
        expect(await platform.search('zzzznotathing')).toHaveLength(0);
    });
    it('marks a quiz and keeps answers out of the question payload', async () => {
        const questions = await platform.quizQuestions('sliding-window');
        expect(questions.length).toBeGreaterThan(0);
        expect(questions[0]).not.toHaveProperty('answerIndex');
        const result = await platform.evaluateQuiz('sliding-window', { q1: 1 });
        expect(result.total).toBeGreaterThan(0);
        expect(result.results[0].correct).toBe(true);
        expect(result.results[0].explanation.length).toBeGreaterThan(0);
    });
    it('tracks progress and never lets it move backwards', async () => {
        await platform.updateLessonProgress('sliding-window', 'completed', 100);
        let snapshot = await platform.progress();
        expect(snapshot.lessons['sliding-window'].status).toBe('completed');
        // A late scroll-driven update must not undo the completion.
        await platform.updateLessonProgress('sliding-window', 'in_progress', 20);
        snapshot = await platform.progress();
        expect(snapshot.lessons['sliding-window'].status).toBe('completed');
        expect(snapshot.lessons['sliding-window'].percent).toBe(100);
    });
    it('derives a streak and a readiness score from recorded activity', async () => {
        await platform.updateLessonProgress('arrays', 'completed', 100);
        await platform.recordAttempt('two-sum', true, 4);
        const summary = await platform.progressSummary();
        expect(summary.streak).toBeGreaterThanOrEqual(1);
        expect(summary.problemsSolved).toBe(1);
        expect(summary.readiness.band).toBeTruthy();
    });
    it('flags a weak area only after repeated unsuccessful attempts', async () => {
        await platform.recordAttempt('two-sum', false, 1);
        expect((await platform.progressSummary()).weakAreas).toHaveLength(0);
        await platform.recordAttempt('contains-duplicate', false, 1);
        const weak = (await platform.progressSummary()).weakAreas;
        expect(weak.some((area) => area.patternId === 'hashing')).toBe(true);
    });
    it('round-trips progress through export and import', async () => {
        await platform.updateLessonProgress('binary-search', 'completed', 100);
        await platform.saveNote('binary-search', 'low + (high - low) / 2');
        await platform.toggleBookmark('cache', true);
        const exported = await platform.exportProgressJson();
        window.localStorage.clear();
        expect((await platform.progress()).lessons['binary-search']).toBeUndefined();
        await platform.importProgress(exported);
        const restored = await platform.progress();
        expect(restored.lessons['binary-search'].status).toBe('completed');
        expect(await platform.note('binary-search')).toBe('low + (high - low) / 2');
        expect((await platform.bookmarks()).map((row) => row.contentId)).toContain('cache');
    });
    it('refuses an export from an unknown version rather than corrupting state', async () => {
        await expect(platform.importProgress(JSON.stringify({ version: '99' }))).rejects.toThrow(/version/i);
    });
    it('serves interview tracks with live question counts', async () => {
        const tracks = await platform.interviewTracks();
        expect(tracks.length).toBeGreaterThanOrEqual(4);
        const java = tracks.find((track) => track.id === 'java');
        expect(java?.questionCount).toBeGreaterThan(50);
        // The level spread must add up, or the index page is quietly lying about the bank.
        const { junior, mid, senior } = java.levels;
        expect(junior + mid + senior).toBe(java.questionCount);
    });
    it('orders a track\'s topics the way the track declares them', async () => {
        const track = await platform.interviewTrack('java');
        expect(track.topics[0].id).toBe('core-language');
        expect(track.topics.map((topic) => topic.id)).toContain('jpa-hibernate');
        expect(track.topics.every((topic) => topic.questions > 0)).toBe(true);
    });
    it('carries the origin of every question so a drill question knows where it came from', async () => {
        const questions = await platform.interviewQuestions({ track: 'sql', level: 'senior' });
        expect(questions.length).toBeGreaterThan(0);
        expect(questions.every((q) => q.level === 'senior' && q.trackId === 'sql')).toBe(true);
        expect(questions[0].setId).toMatch(/^sql-/);
        expect(questions[0].topic.length).toBeGreaterThan(0);
    });
    it('gives every question a model answer, key points and red flags', async () => {
        const all = await platform.interviewQuestions();
        expect(all.length).toBeGreaterThanOrEqual(150);
        for (const question of all) {
            expect(question.answer.split(/\s+/).length, `${question.id} answer`).toBeGreaterThan(60);
            expect(question.keyPoints.length, `${question.id} keyPoints`).toBeGreaterThan(0);
            expect(question.redFlags.length, `${question.id} redFlags`).toBeGreaterThan(0);
        }
    });
    it('returns a stable drill for the same seed and a different one otherwise', async () => {
        const first = await platform.interviewDrill({ track: 'java', count: 5, seed: 42 });
        const again = await platform.interviewDrill({ track: 'java', count: 5, seed: 42 });
        const other = await platform.interviewDrill({ track: 'java', count: 5, seed: 43 });
        expect(first).toHaveLength(5);
        expect(first.map((q) => q.id)).toEqual(again.map((q) => q.id));
        expect(first.map((q) => q.id)).not.toEqual(other.map((q) => q.id));
    });
    it('routes a question-set cross-reference by type', async () => {
        expect(await platform.typeOf('java-concurrency')).toBe('question-set');
        expect(await platform.typeOf('sliding-window')).toBe('lesson');
        expect(await platform.typeOf('no-such-thing')).toBe('unknown');
    });
    it('marks pattern-recognition answers with the signals that give them away', async () => {
        const result = await platform.evaluatePractice({ 'pr-01': 'sliding-window', 'pr-02': 'hashing' });
        expect(result.total).toBe(2);
        expect(result.score).toBe(1);
        const first = result.results.find((row) => row.id === 'pr-01');
        expect(first?.correct).toBe(true);
        expect(first?.signals.length).toBeGreaterThan(0);
    });
});
describe('practice references (offline mode)', () => {
    /**
     * The point of the whole library is the loop "learn the pattern here, type it on a judge".
     * These assert the loop is wired: every problem knows where to send you, the summaries carry
     * the number so a list can show it, and the link is built from the slug rather than the number
     * (a wrong number shows a wrong label; a wrong slug is a dead end).
     */
    it('every problem carries a practice reference, or says why it has none', async () => {
        const groups = await platform.problemsByPattern();
        const ids = groups.flatMap((group) => group.tiers.flatMap((tier) => tier.problems.map((p) => p.id)));
        expect(ids.length).toBeGreaterThanOrEqual(160);
        const missing = [];
        for (const id of ids) {
            const problem = await platform.problem(id);
            const practice = problem?.practice;
            if (!practice) {
                missing.push(id);
                continue;
            }
            if (practice.leetcode === null) {
                expect(practice.note, `${id} has no judge equivalent and no note saying what to do instead`).toBeTruthy();
            }
            else {
                expect(practice.leetcode?.url).toBe(`https://leetcode.com/problems/${practice.leetcode?.slug}/`);
                expect(practice.leetcode?.id).toBeGreaterThan(0);
            }
        }
        expect(missing).toEqual([]);
    });
    it('problem summaries carry the number, so a list can show it without 165 fetches', async () => {
        const groups = await platform.problemsByPattern();
        const problems = groups.flatMap((group) => group.tiers.flatMap((tier) => tier.problems));
        const numbered = problems.filter((problem) => typeof problem.leetcodeId === 'number');
        // Three problems deliberately have no judge equivalent; everything else should be numbered.
        expect(problems.length - numbered.length).toBe(3);
    });
    it('every practice problem named by a lesson actually exists', async () => {
        const lessons = await platform.lessons();
        for (const summary of lessons) {
            const lesson = await platform.lesson(summary.id);
            for (const problemId of lesson?.practiceProblems ?? []) {
                expect(await platform.problem(problemId), `${summary.id} points at missing problem ${problemId}`).toBeTruthy();
            }
        }
    });
});
