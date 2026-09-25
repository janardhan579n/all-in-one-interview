import { describe, expect, it } from 'vitest';
import { BLOOM_BITS, RING_KEYS, assign, bloomIndices, buildRing, ownerOnRing } from './systemInteractives';
/**
 * These assert the *claims the widgets make on screen*, not that they render.
 *
 * Each simulator tells the learner a number — "80% of your keys just moved", "this one is a
 * false positive". If the arithmetic behind those numbers is wrong, the widget teaches a
 * confident falsehood, which is worse than teaching nothing. So the properties are checked
 * here rather than trusted.
 */
function moved(before, after) {
    return RING_KEYS.filter((key) => before[key] !== after[key]).length;
}
describe('consistent hashing', () => {
    it('modulo remaps most keys when the node count changes — the problem the ring exists to solve', () => {
        const four = assign(['a', 'b', 'c', 'd'], 1, 'modulo');
        const five = assign(['a', 'b', 'c', 'd', 'e'], 1, 'modulo');
        const ratio = moved(four, five) / RING_KEYS.length;
        // Only keys where h%4 === h%5 stay put; the theoretical survivor rate is low.
        expect(ratio).toBeGreaterThan(0.6);
    });
    it('the ring moves roughly K/N keys when a node joins, and never more than a fair share', () => {
        const four = assign(['a', 'b', 'c', 'd'], 120, 'ring');
        const five = assign(['a', 'b', 'c', 'd', 'e'], 120, 'ring');
        const ratio = moved(four, five) / RING_KEYS.length;
        // 1/5 of the keyspace is the target; allow slack for a finite, randomly-placed ring.
        expect(ratio).toBeGreaterThan(0.05);
        expect(ratio).toBeLessThan(0.35);
    });
    it('keys that move on a join move only to the new node — no key is shuffled between old ones', () => {
        const before = assign(['a', 'b', 'c', 'd'], 120, 'ring');
        const after = assign(['a', 'b', 'c', 'd', 'e'], 120, 'ring');
        for (const key of RING_KEYS) {
            if (before[key] !== after[key])
                expect(after[key]).toBe('e');
        }
    });
    it('virtual nodes even out a distribution that a single point per node leaves lumpy', () => {
        const share = (virtualNodes) => {
            const map = assign(['a', 'b', 'c', 'd'], virtualNodes, 'ring');
            const counts = new Map();
            for (const key of RING_KEYS)
                counts.set(map[key], (counts.get(map[key]) ?? 0) + 1);
            const values = [...counts.values()];
            return (Math.max(...values) - Math.min(...values)) / (RING_KEYS.length / 4);
        };
        expect(share(150)).toBeLessThan(share(1));
        expect(share(150)).toBeLessThan(0.45);
    });
    it('a key hashing past the last ring point wraps to the first — the ring is a circle', () => {
        const ring = buildRing(['a', 'b'], 4);
        const beyondLast = ring[ring.length - 1].position + 1;
        expect(ownerOnRing(ring, beyondLast)).toBe(ring[0].node);
    });
});
describe('bloom filter', () => {
    const insert = (bits, value, k) => {
        for (const index of bloomIndices(value, k))
            bits[index] = 1;
    };
    const probe = (bits, value, k) => bloomIndices(value, k).every((index) => bits[index] === 1);
    it('never reports a false negative — the guarantee the whole structure rests on', () => {
        for (const k of [1, 2, 3, 4, 5, 6]) {
            const bits = new Uint8Array(BLOOM_BITS);
            const members = Array.from({ length: 12 }, (_, index) => `member-${index}`);
            for (const value of members)
                insert(bits, value, k);
            for (const value of members)
                expect(probe(bits, value, k)).toBe(true);
        }
    });
    it('produces exactly k probe positions, all inside the bit array', () => {
        for (const k of [1, 3, 6]) {
            const indices = bloomIndices('anything', k);
            expect(indices).toHaveLength(k);
            for (const index of indices) {
                expect(index).toBeGreaterThanOrEqual(0);
                expect(index).toBeLessThan(BLOOM_BITS);
            }
        }
    });
    it('is deterministic: the same value always probes the same bits', () => {
        expect(bloomIndices('delta', 4)).toEqual(bloomIndices('delta', 4));
        expect(bloomIndices('delta', 4)).not.toEqual(bloomIndices('echo', 4));
    });
    it('false positives appear as the array fills, and the measured rate tracks the formula', () => {
        const k = 3;
        const bits = new Uint8Array(BLOOM_BITS);
        const members = new Set(Array.from({ length: 14 }, (_, index) => `member-${index}`));
        for (const value of members)
            insert(bits, value, k);
        let positives = 0;
        let trials = 0;
        for (let index = 0; index < 4000; index++) {
            const candidate = `probe-${index}`;
            if (members.has(candidate))
                continue;
            trials++;
            if (probe(bits, candidate, k))
                positives++;
        }
        const measured = positives / trials;
        const predicted = (1 - Math.exp((-k * members.size) / BLOOM_BITS)) ** k;
        // A filter this overloaded must lie sometimes — that is the trade, not a bug.
        expect(measured).toBeGreaterThan(0);
        // And the lying rate must be the one the sizing formula predicts, within sampling noise.
        expect(Math.abs(measured - predicted)).toBeLessThan(0.15);
    });
});
